import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { installedIdentity, outputPath, pnpmPatches, pnpmPatchHash, verifyPnpmPatches, readRules, settingsFromFlags } from './zoo-common.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const dir = mkdtempSync(join(tmpdir(), 'mandos-zoo-contract-'));
const bundle = join(dir, 'bundle');
const run = (...args) => spawnSync(process.execPath, [join(root, 'tools/zoo-run.mjs'), '--bundle', bundle, ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, NEO_ANGBAND_REPO: '/deliberately/not/a/pack', NEO_ANGBAND_LOCAL_CORE: '1' } });
beforeAll(() => { execFileSync(process.execPath, [join(root, 'tools/zoo-build.mjs'), '--out', bundle], { cwd: root }); }, 30000);
afterAll(() => { rmSync(dir, { recursive: true, force: true }); });

describe('zoo entry point contract', () => {
  it('repeats byte-identically apart from wall metadata, across output paths', () => {
    const outputs = [join(dir, 'one.json'), join(dir, 'two.json')];
    const states = join(dir, 'states.jsonl'), commands = join(dir, 'commands.jsonl');
    const first = run('--seed', '7', '--turns', '51', '--out', outputs[0], '--states', states, '--commands', commands);
    const second = run('--seed', '7', '--turns', '51', '--out', outputs[1]);
    expect(first.status, first.stderr).toBe(0); expect(second.status, second.stderr).toBe(0);
    const read = path => JSON.parse(readFileSync(path, 'utf8'));
    const a = read(outputs[0]), b = read(outputs[1]);
    expect(a.outcome).toBe('turn_cap');
    expect(a.turn).toBeGreaterThanOrEqual(51);
    expect(a.turnCap).toMatchObject({ exact: a.turn === 51, guaranteedExact: false, normalActionTicks: 10 });
    expect(a.playSha256).toBe(createHash('sha256').update(readFileSync(commands)).digest('hex'));
    expect(a.provenance).toMatchObject({ packages: { core: '1.23.0-beta.3', content: '1.23.0-beta.3', sdk: '1.23.0-beta.3' }, pnpmPatches: [], commit: expect.stringMatching(/^[a-f0-9]{40}$/), dirty: expect.any(Boolean) });
    expect(a.metadata.wallTimeMs).toBeGreaterThan(0);
    delete a.metadata; delete b.metadata;
    expect(a).toEqual(b);
    const lines = readFileSync(states, 'utf8').trim().split('\n').map(JSON.parse);
    expect(lines[0]).toMatchObject({ kind: 'birth', turn: 0, decisions: 0 });
    expect(lines.at(-1)).toMatchObject({ kind: 'stop', turn: a.turn, maxDepth: a.maxDepth, level: a.level, maxLevel: a.maxLevel, hp: a.hp, maxHp: a.maxHp, energy: a.energy });
  });
  it('keeps source and bundle fingerprints independent of checkout/shared-dependency layout', () => {
    const clone = join(dir, 'layout'); mkdirSync(clone);
    cpSync(join(root, 'src'), join(clone, 'src'), { recursive: true });
    mkdirSync(join(clone, 'tools'));
    for (const file of ['zoo-build.mjs', 'zoo-common.mjs', 'zoo-entry.ts', 'zoo-run.mjs', 'zoo-session.ts']) cpSync(join(root, 'tools', file), join(clone, 'tools', file));
    for (const file of ['package.json', 'manifest.json', 'plugin.ts', 'tsconfig.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml']) cpSync(join(root, file), join(clone, file));
    mkdirSync(join(clone, 'docs/runs'), { recursive: true });
    symlinkSync(join(root, 'node_modules'), join(clone, 'node_modules'));
    execFileSync('git', ['init', '-q'], { cwd: clone });
    execFileSync('git', ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'core.hooksPath=/dev/null', 'commit', '-q', '--allow-empty', '-m', 'layout fixture'], { cwd: clone });
    const second = join(clone, 'bundle');
    execFileSync(process.execPath, [join(clone, 'tools/zoo-build.mjs'), '--out', second], { cwd: clone });
    const a = JSON.parse(readFileSync(join(bundle, 'build.json'))), b = JSON.parse(readFileSync(join(second, 'build.json')));
    expect(b.sourceSha256).toBe(a.sourceSha256); expect(b.bundleSha256).toBe(a.bundleSha256);
  }, 30000);
  it('refuses to overwrite an existing bundle', () => {
    const original = readFileSync(join(bundle, 'entry.mjs'));
    const result = spawnSync(process.execPath, [join(root, 'tools/zoo-build.mjs'), '--out', bundle], { cwd: root });
    expect(result.status).toBe(1); expect(readFileSync(join(bundle, 'entry.mjs')).equals(original)).toBe(true);
  });
  it('keeps available provenance when an invalid settings profile fails', () => {
    const settings = join(dir, 'invalid-settings.json'), out = join(dir, 'invalid-settings-run.json');
    writeFileSync(settings, '{"borg.notAFlag":true}');
    expect(run('--seed', '1', '--turns', '10', '--settings', settings, '--out', out).status).toBe(1);
    expect(JSON.parse(readFileSync(out))).toMatchObject({ outcome: 'harness_failure', provenance: { commit: expect.stringMatching(/^[a-f0-9]{40}$/), packages: { core: '1.23.0-beta.3' }, runtime: { node: expect.any(String) }, verification: 'verified' } });
  });
  it('records assigned birth and effective flag defaults', () => {
    const settings = join(dir, 'settings.json'), out = join(dir, 'assigned.json');
    writeFileSync(settings, JSON.stringify({ 'borg.playsRisky': true, 'borg.selfScum': false }));
    const result = run('--seed', '42', '--turns', '0', '--race', 'Elf', '--class', 'Mage', '--settings', settings, '--out', out);
    expect(result.status, result.stderr).toBe(0);
    const record = JSON.parse(readFileSync(out));
    expect(record.birth).toMatchObject({ race: 'Elf', class: 'Mage', raceSelection: 'assigned', classSelection: 'assigned', roller: 'roller' });
    expect(record.settings).toMatchObject({ 'borg.playsRisky': true, 'borg.selfScum': false, 'borg.worshipsHp': false });
    expect(record.decisions).toBe(0);
  });
  it('writes harness_failure and nonzero status for invalid inputs, without overwriting records', () => {
    const out = join(dir, 'failure.json');
    const result = run('--seed', '-1', '--turns', '100', '--out', out);
    expect(result.status).toBe(1);
    const original = readFileSync(out, 'utf8');
    expect(JSON.parse(original)).toMatchObject({ outcome: 'harness_failure', error: { message: expect.stringContaining('seed') } });
    expect(run('--seed', '7', '--turns', '0', '--out', out).status).toBe(1);
    expect(readFileSync(out, 'utf8')).toBe(original);
  });
  it('rejects unknown or host-workflow flags rather than pretending to apply them', () => {
    const rules = readRules(root);
    expect(Object.keys(rules)).toHaveLength(9);
    expect(() => settingsFromFlags(rules, { 'borg.classMage': true })).toThrow(/Unsupported/);
    expect(() => settingsFromFlags(rules, { 'borg.playsRisky': 1 })).toThrow(/boolean/);
  });
  it('rejects docs/runs in this or another checkout, including symlink aliases', () => {
    expect(() => outputPath(root, join(root, 'docs/runs/forbidden.json'))).toThrow(/docs\/runs/);
    const other = join(dir, 'another-checkout/docs/runs'); mkdirSync(other, { recursive: true });
    expect(() => outputPath(root, join(other, 'forbidden.json'))).toThrow(/docs\/runs/);
    const alias = join(dir, 'alias'); symlinkSync(other, alias);
    expect(() => outputPath(root, join(alias, 'forbidden.json'))).toThrow(/docs\/runs/);
    const outside = join(dir, 'outside'); mkdirSync(outside);
    const escape = join(other, 'outside-alias'); symlinkSync(outside, escape);
    expect(() => outputPath(root, join(escape, 'forbidden.json'))).toThrow(/docs\/runs/);
  });
  it('requires the pinned registry graph, rejecting same-version source links', () => {
    expect(installedIdentity(root).core).toMatch(/^sha512-/);
    const fake = join(dir, 'local-profile'); mkdirSync(join(fake, 'node_modules'), { recursive: true });
    symlinkSync(join(root, 'node_modules/.pnpm'), join(fake, 'node_modules/.pnpm'));
    mkdirSync(join(fake, 'node_modules/@rpgm-tools'), { recursive: true });
    for (const name of ['core', 'content', 'mod-sdk']) symlinkSync(join(root, `node_modules/@rpgm-tools/neo-angband-${name}`), join(fake, `node_modules/@rpgm-tools/neo-angband-${name}`));
    writeFileSync(join(fake, 'package.json'), readFileSync(join(root, 'package.json')));
    writeFileSync(join(fake, 'pnpm-lock.yaml'), readFileSync(join(root, 'pnpm-lock.yaml')));
    // A local clone can preserve a version string; its real path cannot impersonate the virtual store.
    const local = join(dir, 'unpublished-core'); mkdirSync(local); writeFileSync(join(local, 'package.json'), '{"version":"1.23.0-beta.3"}');
    rmSync(join(fake, 'node_modules/@rpgm-tools/neo-angband-core'));
    symlinkSync(local, join(fake, 'node_modules/@rpgm-tools/neo-angband-core'));
    expect(() => installedIdentity(fake)).toThrow(/local\/source/);
  });
  it('rejects a stale installed patch after its configuration was removed', () => {
    const fixture = join(dir, 'stale-patch'); mkdirSync(join(fixture, 'node_modules/.pnpm'), { recursive: true });
    writeFileSync(join(fixture, 'package.json'), '{}');
    writeFileSync(join(fixture, 'pnpm-lock.yaml'), '');
    writeFileSync(join(fixture, 'node_modules/.pnpm/lock.yaml'), "patchedDependencies:\n  '@rpgm-tools/neo-angband-core@1.23.0-beta.3':\n    hash: stale\n    path: old.patch\n\n");
    expect(() => installedIdentity(fixture)).toThrow(/patches differ/);
  });
  it('matches official pnpm12 CRLF hashing and rejects an edited, unapplied patch', () => {
    const expected = '5891b5b522d5df086d0ff0b110fbd9d21bb4fc7163af34d08286a2e846f6be03';
    expect(pnpmPatchHash(Buffer.from('hello\n'))).toBe(expected);
    expect(pnpmPatchHash(Buffer.from('hello\r\n'))).toBe(expected);
    const fixture = join(dir, 'locked-patch'); mkdirSync(fixture);
    writeFileSync(join(fixture, 'package.json'), '{}');
    writeFileSync(join(fixture, 'fix.patch'), 'hello\r\n');
    writeFileSync(join(fixture, 'pnpm-workspace.yaml'), "patchedDependencies:\n  '@rpgm-tools/neo-angband-core@1.23.0-beta.3': fix.patch\n");
    const lock = `patchedDependencies:\n  '@rpgm-tools/neo-angband-core@1.23.0-beta.3':\n    hash: ${expected}\n    path: fix.patch\n\n`;
    writeFileSync(join(fixture, 'pnpm-lock.yaml'), lock);
    expect(verifyPnpmPatches(fixture, lock)).toHaveLength(1);
    writeFileSync(join(fixture, 'fix.patch'), 'changed after install\n');
    expect(() => verifyPnpmPatches(fixture, lock)).toThrow(/file\/lock mismatch/);
  });
  it('hashes every declared pnpm patch instead of merely naming it', () => {
    const fixture = join(dir, 'patched'); mkdirSync(fixture); writeFileSync(join(fixture, 'package.json'), '{}');
    writeFileSync(join(fixture, 'fix.patch'), 'fixed bytes\n');
    writeFileSync(join(fixture, 'pnpm-workspace.yaml'), "patchedDependencies:\n  '@rpgm-tools/neo-angband-core@1.23.0-beta.3': fix.patch\n");
    expect(pnpmPatches(fixture)).toEqual([{ dependency: '@rpgm-tools/neo-angband-core@1.23.0-beta.3', path: 'fix.patch', sha256: createHash('sha256').update('fixed bytes\n').digest('hex'), pnpmHash: createHash('sha256').update('fixed bytes\n').digest('hex') }]);
  });
});
