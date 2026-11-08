import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { classify, eventRange, inspect, parseChanges } from './ci-scope.mjs';
import { checkDocs } from './ci-docs.mjs';

const repo = fileURLToPath(new URL('../../', import.meta.url));
const change = (path, status = 'M') => ({ status, paths: [path] });
const sha = digit => digit.repeat(40);
const scratch = fn => {
  const root = mkdtempSync(join(tmpdir(), 'mandos-ci-controls-'));
  try { return fn(root); } finally { rmSync(root, { recursive: true, force: true }); }
};

test('only reviewed prose additions/edits use documentation checks', () => {
  assert.equal(classify([change('README.md'), change('docs/runs/receipt/README.md', 'A')]), 'docs');
  for (const path of ['src/a.ts', 'src/a.test.ts', 'src/a.md', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'patches/README.md', 'patches/core.patch', 'plugin.js', 'manifest.json', 'tools/build.mjs', '.github/workflows/ci.yml', 'vitest.config.mjs', 'session.json', 'docs/runs/replay/runs.json', 'docs/runs/replay/trace.json', 'docs/runs/receipt/verify.log', 'docs/migrations/repository-split.json', 'docs/upstream-adoption.json', 'docs/audit/c-classification.md', 'docs/c-bugs/watch-index.json', 'CHANGELOG.md', 'unknown', '../README.md', '/README.md', 'docs/../README.md']) {
    assert.equal(classify([change(path)]), 'full', path);
    assert.equal(classify([change('README.md'), change(path)]), 'full', `mixed ${path}`);
  }
  assert.equal(classify([]), 'full');
  for (const status of ['D', 'T', 'U', 'R100', 'C100']) assert.equal(classify([change('docs/a.md', status)]), 'full');
});

test('NUL status parsing retains both sides of renames and unusual file names', () => {
  assert.deepEqual(parseChanges('R100\0src/a.ts\0docs/a.md\0M\0docs/space name.md\0'), [
    { status: 'R100', paths: ['src/a.ts', 'docs/a.md'] }, change('docs/space name.md'),
  ]);
  for (const malformed of ['M\0a', 'R100\0only-one\0', 'WHAT\0a\0']) assert.throws(() => parseChanges(malformed));
});

test('event refs are validated and manual/new/unknown histories default to full', () => {
  assert.equal(eventRange('pull_request', { pull_request: { base: { sha: sha('a') }, head: { sha: sha('b') } } }), `${sha('a')}...${sha('b')}`);
  assert.equal(eventRange('push', { ref: 'refs/heads/main', before: sha('a'), after: sha('b') }), `${sha('a')}..${sha('b')}`);
  for (const [name, event] of [['workflow_dispatch', {}], ['issues', {}], ['issue_comment', {}], ['push', { ref: 'refs/heads/topic', before: sha('a'), after: sha('b') }], ['push', { ref: 'refs/heads/main', before: sha('0'), after: sha('b') }], ['pull_request', { pull_request: { base: { sha: 'HEAD; echo unsafe' }, head: { sha: sha('b') } } }]]) assert.equal(eventRange(name, event), null);
});

test('real Git PR merge-base excludes unrelated base work and cannot hide earlier source edits', () => scratch(root => {
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-b', 'main'); git('config', 'user.email', 'ci@example.invalid'); git('config', 'user.name', 'CI fixture');
  mkdirSync(join(root, 'src')); writeFileSync(join(root, 'README.md'), 'base\n'); writeFileSync(join(root, 'src/a.ts'), 'base\n');
  const commit = message => { git('add', '.'); git('commit', '-m', message); return git('rev-parse', 'HEAD'); };
  const base = commit('base');
  git('checkout', '-b', 'docs'); writeFileSync(join(root, 'README.md'), 'doc edit\n'); const docs = commit('docs');
  git('checkout', 'main'); writeFileSync(join(root, 'src/a.ts'), 'unrelated base code\n'); const advanced = commit('base advances');
  const pr = (b, h) => ({ pull_request: { base: { sha: b }, head: { sha: h } } });
  assert.equal(inspect('pull_request', pr(advanced, docs), root).mode, 'docs');
  assert.equal(inspect('push', { ref: 'refs/heads/main', before: base, after: advanced }, root).mode, 'full');
  git('checkout', 'docs');
  assert.equal(checkDocs(inspect('pull_request', pr(advanced, docs), root), root), 1);
  git('checkout', '-b', 'mixed', base); writeFileSync(join(root, 'src/a.ts'), 'feature code\n'); commit('code');
  writeFileSync(join(root, 'README.md'), 'later docs\n'); const mixed = commit('later docs');
  assert.equal(inspect('pull_request', pr(base, mixed), root).mode, 'full');
  git('checkout', '-b', 'rename', base); git('mv', 'src/a.ts', 'guide.md'); const renamed = commit('rename');
  assert.equal(inspect('pull_request', pr(base, renamed), root).mode, 'full');
  assert.equal(inspect('pull_request', pr(sha('f'), docs), root).mode, 'full');
}));

test('CLI writes a fixed boolean and fails safe for unavailable events', () => scratch(root => {
  const event = join(root, 'event.json'), result = join(root, 'scope.json'), output = join(root, 'output');
  writeFileSync(event, 'invalid JSON');
  execFileSync(process.execPath, [join(repo, '.github/scripts/ci-scope.mjs')], { cwd: root, env: { ...process.env, GITHUB_EVENT_NAME: 'push', GITHUB_EVENT_PATH: event, CI_SCOPE_FILE: result, GITHUB_OUTPUT: output } });
  assert.equal(JSON.parse(readFileSync(result, 'utf8')).mode, 'full');
  assert.equal(readFileSync(output, 'utf8'), 'full=true\n');
}));

test('prose checks accept existing local links and reject missing/outside targets', () => scratch(root => {
  mkdirSync(join(root, 'docs')); writeFileSync(join(root, 'README.md'), 'root\n'); writeFileSync(join(root, 'docs/a b.md'), 'target\n');
  const scope = { mode: 'docs', changes: [change('docs/guide.md')] };
  const guide = join(root, 'docs/guide.md');
  writeFileSync(guide, '[root](../README.md#heading) [space](a%20b.md) [external](https://example.invalid/)\n[root2]: /README.md\n```md\n[example](missing.md)\n```\n');
  assert.equal(checkDocs(scope, root), 1);
  writeFileSync(guide, '[broken](missing.md)'); assert.throws(() => checkDocs(scope, root), /missing/);
  writeFileSync(guide, '[outside](../../outside.md)'); assert.throws(() => checkDocs(scope, root), /outside/);
  assert.throws(() => checkDocs({ mode: 'docs', changes: [change('docs/replay.json')] }, root), /reviewed prose-only/);
  symlinkSync('../README.md', join(root, 'docs/link.md'));
  assert.throws(() => checkDocs({ mode: 'docs', changes: [change('docs/link.md')] }, root), /regular file/);
}));

test('CI and privacy trigger once per PR update, on main pushes and manual runs only', () => {
  const expected = 'on:\n  push:\n    branches: [main]\n  pull_request:\n    branches: [main]\n    types: [opened, synchronize, reopened]\n  workflow_dispatch:';
  for (const name of ['ci', 'privacy']) {
    const text = readFileSync(join(repo, `.github/workflows/${name}.yml`), 'utf8');
    const active = text.split('\n').filter(line => !/^\s*#/.test(line)).join('\n');
    assert.equal(active.slice(active.indexOf('on:\n'), active.indexOf('\npermissions:')).trim(), expected);
    assert.match(active, /concurrency:\n  group: \$\{\{ github.workflow \}\}-\$\{\{ github.event.pull_request.number \|\| github.ref \}\}\n  cancel-in-progress: true/);
    assert.doesNotMatch(active, /paths-ignore|continue-on-error|pull_request_target/);
  }
  const ci = readFileSync(join(repo, '.github/workflows/ci.yml'), 'utf8');
  assert.match(ci, /jobs:\n  verify:/); assert.match(ci, /fetch-depth: 0/);
  for (const command of ['pnpm install --frozen-lockfile', 'node tools/check-grants.mjs', 'pnpm verify']) {
    assert.ok(ci.includes(`- run: ${command}\n        if: steps.scope.outputs.full == 'true'`), command);
  }
  assert.match(ci, /CI: '1'/);
  assert.match(readFileSync(join(repo, '.github/workflows/nexus-publish.yml'), 'utf8'), /if: github.repository == 'neostryder\/neo-angband-mod-borg'/);
  const release = readFileSync(join(repo, '.github/workflows/github-release.yml'), 'utf8');
  assert.match(release, /on:\n  workflow_dispatch:/);
  assert.doesNotMatch(release, /\n  push:|\n  pull_request:|\n  schedule:/);
  assert.match(release, /github.repository == 'diegoami\/mandos' && github.ref == 'refs\/heads\/main'/);
  assert.match(release, /git rev-parse --verify "refs\/tags\/\$TAG\^\{commit\}"/);
  assert.match(release, /--prerelease --verify-tag/);
});
