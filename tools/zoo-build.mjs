#!/usr/bin/env node
/** One explicit build; zoo-run never invokes a bundler. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENTRY_VERSION, installedIdentity, logicalInputs, hashFiles, packageFacts, packIdentity, pnpmPatches, publishedPack, readRules, sha256, sourceIdentity, outputPath } from './zoo-common.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== '--out') {
  console.error('usage: node tools/zoo-build.mjs --out <bundle-directory>'); process.exit(1);
}
try {
  const dir = outputPath(root, args[1]);
  mkdirSync(dirname(dir), { recursive: true });
  mkdirSync(dir); // Atomic fresh-directory claim: never mutate a bundle in use.
  const { build } = await import('esbuild');
  const file = join(dir, 'entry.mjs');
  const result = await build({ absWorkingDir: root, entryPoints: ['tools/zoo-entry.ts'], outfile: file,
    bundle: true, format: 'esm', platform: 'node', target: 'node22', logLevel: 'silent', metafile: true, minifyWhitespace: true });
  const patches = pnpmPatches(root);
  const sourceFiles = logicalInputs(root, [...Object.keys(result.metafile.inputs), 'tools/zoo-build.mjs', 'tools/zoo-common.mjs', 'tools/zoo-run.mjs',
    'plugin.ts', 'manifest.json', 'package.json', 'tsconfig.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', ...patches.map(patch => patch.path)]);
  const facts = { schema: 'mandos/zoo-build@1', entryVersion: ENTRY_VERSION, ...sourceIdentity(root),
    sourceSha256: hashFiles(root, sourceFiles), sourceFiles: [...new Set(sourceFiles)].sort(),
    bundleSha256: sha256(readFileSync(file)), packages: packageFacts(root),
    contentPackSha256: packIdentity(publishedPack(root)), pnpmPatches: patches,
    lockSha256: sha256(readFileSync(join(root, 'pnpm-lock.yaml'))),
    installedLockSha256: sha256(readFileSync(join(root, 'node_modules', '.pnpm', 'lock.yaml'))),
    registryIntegrities: installedIdentity(root), rules: readRules(root) };
  writeFileSync(join(dir, 'build.json'), JSON.stringify(facts, null, 2) + '\n');
  console.log(JSON.stringify({ bundle: resolve(dir), sourceSha256: facts.sourceSha256, bundleSha256: facts.bundleSha256 }));
} catch (error) { console.error(`zoo-build: ${error.message}`); process.exitCode = 1; }
