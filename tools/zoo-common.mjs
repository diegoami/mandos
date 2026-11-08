/** Build/run helpers for the external zoo instrument, never loaded by the mod. */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, realpathSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

export const ENTRY_VERSION = 1;
export const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
export const json = file => JSON.parse(readFileSync(file, 'utf8'));
export function hashFiles(root, paths) {
  const hash = createHash('sha256');
  for (const path of [...new Set(paths)].sort()) {
    const bytes = readFileSync(resolve(root, path));
    hash.update(path + '\0' + bytes.length + '\0'); hash.update(bytes);
  }
  return hash.digest('hex');
}
export function packageFacts(root) {
  return Object.fromEntries(['core', 'content', 'mod-sdk'].map(name => {
    const value = json(join(root, 'node_modules', '@rpgm-tools', `neo-angband-${name}`, 'package.json'));
    return [name === 'mod-sdk' ? 'sdk' : name, value.version];
  }));
}
export function publishedPack(root) {
  return dirname(createRequire(join(root, 'package.json')).resolve('@rpgm-tools/neo-angband-content/pack/constants.json'));
}
export function packIdentity(dir) {
  const files = readdirSync(dir).filter(name => name.endsWith('.json')).sort();
  if (!files.includes('constants.json') || !files.includes('class.json') || !files.includes('p_race.json')) throw new Error('Incomplete published content pack');
  return hashFiles(dir, files);
}
export function sourceIdentity(root) {
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  return { commit: git(['rev-parse', 'HEAD']), dirty: git(['status', '--porcelain', '--untracked-files=normal']).length > 0 };
}
export function readRules(root) {
  const block = /const RULE_CFG[^\{]*\{([^}]*)\}/u.exec(readFileSync(join(root, 'plugin.ts'), 'utf8'));
  if (!block) throw new Error('Cannot read the actual plugin controller flag map');
  const manifest = json(join(root, 'manifest.json')).data;
  const rules = {};
  for (const match of block[1].matchAll(/"([\w.]+)"\s*:\s*"(\w+)"/gu)) {
    const rule = manifest.rules.find(rule => rule.flag === match[1]);
    if (!rule || typeof rule.default !== 'boolean') throw new Error(`Missing boolean rule ${match[1]}`);
    rules[match[1]] = { cfg: match[2], default: rule.default };
  }
  if (Object.keys(rules).length === 0) throw new Error('Empty controller flag map');
  return rules;
}
export function settingsFromFlags(rules, flags) {
  if (flags === null || typeof flags !== 'object' || Array.isArray(flags)) throw new Error('--settings must contain a JSON object');
  const cfg = {};
  for (const [flag, value] of Object.entries(flags)) {
    if (!Object.hasOwn(rules, flag)) throw new Error(`Unsupported controller flag ${flag}; birth/stage/replay controls are not controller flags (use --race/--class for assigned birth)`);
    if (typeof value !== 'boolean') throw new Error(`${flag} must be boolean`);
    cfg[rules[flag].cfg] = value;
  }
  return cfg;
}
export function effectiveFlags(rules, cfg) {
  return Object.fromEntries(Object.entries(rules).map(([flag, rule]) => {
    if (typeof cfg?.[rule.cfg] !== 'boolean') throw new Error(`Controller did not report effective setting ${flag}`);
    return [flag, cfg[rule.cfg]];
  }));
}
export function pnpmPatches(root) {
  const pkg = json(join(root, 'package.json'));
  const configured = { ...(pkg.pnpm?.patchedDependencies ?? {}) };
  const workspacePath = join(root, 'pnpm-workspace.yaml');
  const workspace = existsSync(workspacePath) ? readFileSync(workspacePath, 'utf8') : '';
  const block = /^patchedDependencies:\s*\n((?:[ \t]+[^\n]*\n|\s*\n)*)/m.exec(workspace);
  for (const line of (block?.[1] ?? '').split('\n').filter(line => line.trim() && !line.trim().startsWith('#'))) {
    const entry = /^\s+(?:'([^']+)'|"([^"]+)"|([^:]+)):\s*(?:'([^']+)'|"([^"]+)"|(\S+))\s*$/u.exec(line);
    if (!entry) throw new Error('Unsupported patchedDependencies shape; expected package: patch-file');
    configured[entry[1] ?? entry[2] ?? entry[3]] = entry[4] ?? entry[5] ?? entry[6];
  }
  return Object.entries(configured).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([dependency, path]) => {
    if (typeof path !== 'string' || isAbsolute(path) || path.split(/[\\/]/u).includes('..')) throw new Error('Patch paths must be relative files inside the repository');
    return { dependency, path, sha256: sha256(readFileSync(join(root, path))), pnpmHash: pnpmPatchHash(readFileSync(join(root, path))) };
  });
}
/** Resolve aliases before writing: a symlink cannot route zoo output into docs/runs. */
export function outputPath(root, requested) {
  const absolute = resolve(requested);
  const inRuns = path => path.split(sep).some((part, index, parts) => part === 'docs' && parts[index + 1] === 'runs');
  if (inRuns(absolute)) throw new Error('The zoo entry point never writes under docs/runs');
  let existing = absolute;
  const tail = [];
  while (!existsSync(existing)) {
    const parent = dirname(existing);
    if (parent === existing) throw new Error('Cannot resolve output path');
    tail.unshift(relative(parent, existing)); existing = parent;
  }
  const actual = resolve(realpathSync(existing), ...tail);
  const forbidden = realpathSync(join(root, 'docs', 'runs'));
  if (inRuns(actual) || actual === forbidden || actual.startsWith(forbidden + sep)) throw new Error('The zoo entry point never writes under docs/runs');
  return actual;
}

/** Require the frozen registry install, not a same-version local source profile. */
export function installedIdentity(root) {
  const lock = readFileSync(join(root, 'node_modules', '.pnpm', 'lock.yaml'), 'utf8');
  const pkg = json(join(root, 'package.json'));
  const verifiedPatches = verifyPnpmPatches(root, lock);
  const declaredPatches = verifiedPatches.map(patch => patch.dependency);
  const virtual = realpathSync(join(root, 'node_modules', '.pnpm')) + sep;
  const integrity = {};
  for (const short of ['core', 'content', 'mod-sdk']) {
    const name = `@rpgm-tools/neo-angband-${short}`;
    const expected = pkg.devDependencies[name];
    if (!/^\d+\.\d+\.\d+(?:-[\w.-]+)?$/u.test(expected)) throw new Error(`${name} must have an exact published version`);
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
    const importer = new RegExp(`      ['"]?${escaped}['"]?:\\n        specifier: ([^\\n]+)\\n        version: ([^\\n]+)`).exec(lock);
    if (!importer || importer[1] !== expected || (importer[2] !== expected && !importer[2].startsWith(expected + '('))) throw new Error(`${name} is not the pinned registry install`);
    const applied = /\(patch_hash=([a-f0-9]+)\)/u.exec(importer[2])?.[1];
    const declared = verifiedPatches.find(patch => patch.dependency === `${name}@${expected}`);
    if ((importer[2].includes('(patch_hash=') && applied === undefined) || applied !== declared?.pnpmHash) throw new Error(`${name} installed patch differs from declared patches`);
    const directory = realpathSync(join(root, 'node_modules', name));
    if (!directory.startsWith(virtual)) throw new Error(`${name} is a local/source link, not the pnpm registry install`);
    const entry = new RegExp(`  ['"]${escaped}@${expected.replaceAll('.', '\\.')}['"]:\\n    resolution: \{integrity: (sha\\d+-[^}]+)\}`).exec(lock);
    if (!entry) throw new Error(`${name} has no registry integrity in installed lock`);
    integrity[short === 'mod-sdk' ? 'sdk' : short] = entry[1];
  }
  const req = createRequire(join(root, 'node_modules', '@rpgm-tools', 'neo-angband-core', 'package.json'));
  const sdk = realpathSync(req.resolve('@rpgm-tools/neo-angband-mod-sdk'));
  if (!sdk.startsWith(realpathSync(join(root, 'node_modules', '@rpgm-tools', 'neo-angband-mod-sdk')) + sep)) throw new Error('Direct and transitive SDK copies differ');
  return integrity;
}

/** Physical shared-store paths must not become machine-specific hash labels. */
export function logicalInputs(root, paths) {
  const virtual = realpathSync(join(root, 'node_modules', '.pnpm'));
  return paths.map(path => {
    const absolute = resolve(root, path);
    const result = absolute.startsWith(virtual + sep)
      ? join('node_modules', '.pnpm', relative(virtual, absolute)) : relative(root, absolute);
    if (result === '..' || result.startsWith('..' + sep) || isAbsolute(result)) throw new Error('Bundle input is outside the pinned repository/registry graph');
    return result.split(sep).join('/');
  });
}

// pnpm12.16.1: pnpm/crates/patching/src/hash.rs at c7b46aedef7b81c07816cb551187449a3dd81792.
// UTF-8 lossy decoding and CRLF normalization precede the lowercase SHA256.
export const pnpmPatchHash = bytes => sha256(bytes.toString('utf8').replaceAll('\r\n', '\n'));
function lockedPatches(text) {
  const block = /^patchedDependencies:\s*\n((?:[ \t]+[^\n]*\n|\s*\n)*)/m.exec(text)?.[1] ?? '';
  const found = new Map(); let current;
  const unquote = value => value.replace(/^(['"])(.*)\1$/u, '$2');
  for (const line of block.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const key = /^  (?:'([^']+)'|"([^"]+)"|([^:]+)):\s*$/u.exec(line);
    if (key) { current = key[1] ?? key[2] ?? key[3]; found.set(current, {}); continue; }
    const field = /^    (hash|path):\s*(.+)$/u.exec(line);
    if (!field || current === undefined) throw new Error('Unsupported pnpm patch lock shape');
    found.get(current)[field[1]] = unquote(field[2]);
  }
  return found;
}
export function verifyPnpmPatches(root, installedText) {
  const configured = pnpmPatches(root);
  const installed = lockedPatches(installedText);
  const project = lockedPatches(readFileSync(join(root, 'pnpm-lock.yaml'), 'utf8'));
  const keys = configured.map(patch => patch.dependency).sort();
  if (JSON.stringify([...installed.keys()].sort()) !== JSON.stringify(keys) || JSON.stringify([...project.keys()].sort()) !== JSON.stringify(keys)) throw new Error('Installed pnpm patches differ from declared patches; run pnpm install --frozen-lockfile');
  for (const patch of configured) {
    for (const locked of [installed.get(patch.dependency), project.get(patch.dependency)]) {
      if (locked?.hash !== patch.pnpmHash || typeof locked.path !== 'string' || resolve(root, locked.path) !== resolve(root, patch.path)) throw new Error(`Patch file/lock mismatch for ${patch.dependency}; run pnpm install --frozen-lockfile`);
    }
  }
  return configured;
}
