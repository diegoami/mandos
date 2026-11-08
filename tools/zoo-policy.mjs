/** Constructive source seal for the two clean measurement lanes. */
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const json = path => JSON.parse(readFileSync(path, 'utf8'));
export function verifyLane(root) {
  if (!existsSync(join(root, 'zoo-lane.json'))) return null;
  const lane = json(join(root, 'zoo-lane.json')), policy = json(join(root, 'zoo-policy.json'));
  if (lane.schema !== 'mandos/zoo-lane@1' || policy.schema !== 'mandos/zoo-policy@1' ||
      lane.borgSourceCommit !== policy.sourceCommit || lane.includesCTranslations !== false) throw new Error('Invalid source lane declaration');
  const paths = ['plugin.ts', 'plugin.js', 'title.ts'];
  const walk = prefix => {
    if (!existsSync(join(root, prefix))) return;
    for (const entry of readdirSync(join(root, prefix), { withFileTypes: true })) {
      const path = prefix + '/' + entry.name;
      if (entry.isDirectory()) walk(path); else paths.push(path);
    }
  };
  walk('src'); walk('test');
  if (JSON.stringify(paths.sort()) !== JSON.stringify(Object.keys(policy.files).sort())) throw new Error('Target policy file inventory changed');
  for (const [path, expected] of Object.entries(policy.files)) {
    if (resolve(root, path) !== join(root, path) || path.split('/').includes('..')) throw new Error('Invalid source seal path');
    const file = join(root, path), stat = lstatSync(file);
    if (stat.isSymbolicLink()) throw new Error('Source policy cannot be a symlink');
    const bytes = readFileSync(file);
    const blob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    if (blob !== expected.blob || ((stat.mode & 0o111) ? '100755' : '100644') !== expected.mode) throw new Error(`Target policy changed: ${path}`);
  }
  const manifest = json(join(root, 'manifest.json')); delete manifest.data.version; delete manifest.data.repository;
  const pkg = json(join(root, 'package.json')); delete pkg.version; delete pkg.homepage;
  if (JSON.stringify(manifest) !== JSON.stringify(policy.baseManifest) || JSON.stringify(pkg) !== JSON.stringify(policy.basePackage)) throw new Error('Target manifest/dependency policy changed');
  return lane;
}

export function verifyRuntimeInputs(root, inputs) {
  const policy = json(join(root, 'zoo-policy.json'));
  for (const path of inputs) if (!path.startsWith('node_modules/') && !path.startsWith('tools/') && !Object.hasOwn(policy.files,path)) throw new Error(`Unsealed target runtime import: ${path}`);
}
