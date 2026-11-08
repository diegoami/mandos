#!/usr/bin/env node
/** Cross-repository diagnostic POC, not a public gameplay switch (Mandos #217). */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { closeSync, mkdirSync, mkdtempSync, openSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build, version as esbuildVersion } from 'esbuild';
import { outputPath, installedIdentity, packageFacts, sha256 } from './zoo-common.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const selectorPath = join(root, 'src/item/item-wear.ts');
export const EXPECTED_SELECTOR_SHA256 = '5baebe6f2d5b10fbae85f1ed52b278ab96a8f0814b8185b688e187561a29232f';
export const INHERITED = '  const chosen=ap<=wp ? weapon : armour, score=ap<=wp ? wp : ap;';
export const PROTOTYPE = '  const chooseWeapon=weapon!==undefined && (armour===undefined || wp<=ap);\n  const chosen=chooseWeapon ? weapon : armour, score=chooseWeapon ? wp : ap;';
const hash = value => createHash('sha256').update(value).digest('hex');
export function diagnosticSource(source, variant) {
  const at = source.indexOf('export function borgBackupSwap(');
  if (at < 0 || hash(source.slice(at)) !== EXPECTED_SELECTOR_SHA256) throw new Error('Selector changed: this diagnostic is pinned to the inherited C82 function');
  if (source.split(INHERITED).length !== 2) throw new Error('Expected exactly one inherited selector block');
  if (variant === 'inherited') return source;
  if (variant !== 'prototype') throw new Error('Expected --variant inherited or prototype');
  return source.replace(INHERITED, PROTOTYPE);
}
export async function compileFixture(variant, outfile) {
  const original = readFileSync(selectorPath, 'utf8');
  const selected = diagnosticSource(original, variant);
  const result = await build({ absWorkingDir: root, entryPoints: ['tools/cbug0066-fixture-entry.ts'], outfile,
    bundle: true, format: 'esm', platform: 'node', target: 'node22', logLevel: 'silent', metafile: true,
    plugins: [{ name: 'diagnostic-c82-overlay', setup(b) {
      b.onLoad({ filter: /[\\/]src[\\/]item[\\/]item-wear\.ts$/ }, args => {
        if (args.path !== selectorPath) throw new Error('Unexpected selector path');
        return { contents: selected, loader: 'ts', resolveDir: dirname(selectorPath) };
      });
    } }] });
  return { originalSha256: hash(original), selectorSha256: EXPECTED_SELECTOR_SHA256,
    compiledModuleSha256: hash(selected), overlaySha256: variant === 'prototype' ? hash(INHERITED + '\n=>\n' + PROTOTYPE) : null,
    bundleSha256: hash(readFileSync(outfile)), inputs: Object.keys(result.metafile.inputs).sort(), esbuild: esbuildVersion };
}
async function main() {
  const args = {}; const argv = process.argv.slice(2);
  if (argv.includes('--help')) { console.log('node tools/cbug0066-fixture.mjs --corpus CASES.json --variant inherited|prototype --out RESULTS.json\nDiagnostic selector boundary only; prototype never changes production Borg code.'); return; }
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.slice(2), value = argv[i + 1];
    if (!argv[i]?.startsWith('--') || !['corpus', 'variant', 'out'].includes(key) || !value || Object.hasOwn(args, key)) throw new Error('Invalid or repeated POC option');
    args[key] = value;
  }
  if (!args.corpus || !args.out || !['inherited', 'prototype'].includes(args.variant)) throw new Error('Expected --corpus, --variant inherited|prototype and --out');
  const corpusBytes = readFileSync(args.corpus), corpus = JSON.parse(corpusBytes);
  const native = corpus.provenance;
  const expectedIds = ['armour-better', 'weapon-better', 'fire-armour', 'electric-weapon', 'both-helpful', 'armour-only', 'weapon-only', 'tie', 'no-benefit'];
  if (native?.fixtureCommit !== '1b67370d0dc56d9b7ef34e5356e63d21a7095545'
    || native?.fixtureSha256 !== 'b26f955689acaf552545019189ade029e82344a0c508d9c77d5b1581015a70b6'
    || native?.beforeRuntime !== 'e473720ed88a0f0c7ca66815cef3000eb4a38bc3'
    || native?.fixedRuntime !== '39986cc52f3f70727ada24b6def5de98d0bd36c8'
    || !Array.isArray(corpus.cases) || corpus.cases.map(row => row.id).sort().join('\0') !== expectedIds.sort().join('\0')) {
    throw new Error('CLI requires the original nine-case native fixture corpus and exact source identities');
  }
  const temporary = mkdtempSync(join(tmpdir(), 'mandos-selector-poc-'));
  try {
    const file = join(temporary, 'entry.mjs');
    const graph = await compileFixture(args.variant, file);
    const entry = await import(pathToFileURL(file).href);
    for (const suffix of ['src/item/item-wear.ts', 'src/trait/config.ts', 'src/trait/state.ts', 'src/core-api.ts']) {
      if (graph.inputs.filter(path => path === suffix || path.endsWith('/' + suffix)).length !== 1) throw new Error(`Incoherent diagnostic module graph: ${suffix}`);
    }
    const cases = entry.runCorpus(corpus);
    const git = command => execFileSync('git', command, { cwd: root, encoding: 'utf8' }).trim();
    const data = { schema: 'angband/borg-fixture-results@1', mechanism: 'CBUG-0066', boundary: 'backup-swap/post-evaluation',
      variant: { id: args.variant === 'inherited' ? 'ts-inherited' : 'ts-prototype', language: 'typescript',
        fixState: args.variant === 'inherited' ? 'inherited' : 'diagnostic-prototype', provenance: {
          commit: git(['rev-parse', 'HEAD']), runtimeCommit: git(['rev-parse', 'HEAD']), fixtureCommit: native.fixtureCommit, originalFixtureSha256: native.fixtureSha256, dirty: git(['status', '--porcelain']).length > 0,
          corpusSha256: sha256(corpusBytes), nativeCorpusProvenance: corpus.provenance, source: 'src/item/item-wear.ts::borgBackupSwap', ...graph,
          packages: packageFacts(root), registryIntegrities: installedIdentity(root), runtime: { node: process.version, platform: process.platform, arch: process.arch },
          relevantFix: args.variant === 'inherited' ? 'CBUG-0066 absent' : 'CBUG-0066 DIAGNOSTIC ONLY; not adopted into production',
          otherCarries: 'Nine existing production C units are preserved; their valuation/danger routines are outside this supplied-evaluation selector slice',
          productionAdoption: false, diagnosticOnly: true, prototypeApplied: args.variant === 'prototype', noNeoGameBooted: true,
        } }, cases };
    const out = outputPath(root, args.out); mkdirSync(dirname(out), { recursive: true });
    const fd = openSync(out, 'wx');
    try { writeFileSync(fd, entry.canonicalJson(data) + '\n'); }
    finally { closeSync(fd); }
    console.log(JSON.stringify({ variant: data.variant.id, cases: cases.length, out }));
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch(error => { console.error(`fixture-poc: ${error.message}`); process.exitCode = 1; });
