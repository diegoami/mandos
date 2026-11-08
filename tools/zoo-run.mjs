#!/usr/bin/env node
/** Single-life external measurement entry point. No cohort or docs writer. */
import { closeSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { ENTRY_VERSION, installedIdentity, effectiveFlags, hashFiles, json, outputPath, packageFacts, packIdentity, publishedPack, settingsFromFlags, sha256 } from './zoo-common.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const usage = `usage: node tools/zoo-build.mjs --out artifacts/zoo
       node tools/zoo-run.mjs --seed S --turns T --out run.json
         [--bundle artifacts/zoo] [--decisions 10000000]
         [--race NAME] [--class NAME] [--settings flags.json]
         [--states states.jsonl] [--commands commands.jsonl]

T counts Core game ticks (10 per normal-speed action). Stop at the first
Core loop boundary at/after T; overshoot is recorded. --decisions limits Core
loop calls. Death, stall and Borg stop exit successfully with distinct outcomes.
Runs use only the pinned published packages, never a sibling engine or NEO_* override.
Outputs must be fresh files and cannot be under docs/runs (including aliases).`;
const started = performance.now();
const args = { bundle: join(root, 'artifacts', 'zoo'), decisions: 10000000 };
const files = [];
let output;
let base = { schema: 'mandos/zoo-run@1', entryVersion: ENTRY_VERSION, inputs: null, provenance: { runtime: { node: process.version, platform: process.platform, arch: process.arch }, unavailable: 'bundle not loaded' } };
const open = requested => {
  const path = outputPath(root, requested);
  mkdirSync(dirname(path), { recursive: true });
  const fd = openSync(path, 'wx'); files.push(fd); return { path, fd };
};
try {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) { console.log(usage); process.exit(0); }
  const known = new Set(['seed', 'turns', 'out', 'bundle', 'decisions', 'race', 'class', 'settings', 'states', 'commands']);
  const seen = new Set();
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.slice(2), value = argv[i + 1];
    if (!argv[i]?.startsWith('--') || !known.has(key) || value === undefined || value.startsWith('--') || seen.has(key)) throw new Error(`Invalid or repeated option ${argv[i]}`);
    seen.add(key); args[key] = value;
  }
  if (args.out === undefined) throw new Error('--out is required');
  base.inputs = { seed: args.seed ?? null, race: args.race ?? null, class: args.class ?? null, turns: args.turns ?? null, decisions: args.decisions, settings: null };
  output = open(args.out);
  for (const key of ['seed', 'turns', 'decisions']) {
    const value = Number(args[key]);
    if (!Number.isSafeInteger(value) || value < (key === 'decisions' ? 1 : 0) || (key === 'seed' && value > 0xffffffff)) throw new Error(`--${key} must be ${key === 'seed' ? 'an unsigned 32-bit integer' : key === 'turns' ? 'a non-negative integer' : 'a positive integer'}`);
    args[key] = value;
  }
  const build = json(join(args.bundle, 'build.json'));
  const { sourceFiles, rules, ...provenance } = build;
  base.provenance = { ...provenance, runtime: { node: process.version, platform: process.platform, arch: process.arch }, verification: 'pending' };
  if (build.schema !== 'mandos/zoo-build@1' || build.entryVersion !== ENTRY_VERSION) throw new Error('Unsupported bundle manifest; rebuild with zoo-build');
  const bundle = join(args.bundle, 'entry.mjs');
  if (sha256(readFileSync(bundle)) !== build.bundleSha256 || hashFiles(root, build.sourceFiles) !== build.sourceSha256) throw new Error('Source/bundle changed after build; run zoo-build again');
  if (JSON.stringify(installedIdentity(root)) !== JSON.stringify(build.registryIntegrities)) throw new Error('Installed registry graph changed after build');
  const packDir = publishedPack(root);
  if (JSON.stringify(packageFacts(root)) !== JSON.stringify(build.packages) || packIdentity(packDir) !== build.contentPackSha256) throw new Error('Published dependencies/content changed after build; run zoo-build again');
  base.provenance.verification = 'verified';
  const flags = args.settings === undefined ? {} : json(args.settings);
  const cfg = settingsFromFlags(build.rules, flags);
  const inputs = { seed: args.seed, race: args.race ?? null, class: args.class ?? null, turns: args.turns, decisions: args.decisions, settings: flags };
  base.inputs = inputs;
  const states = args.states === undefined ? null : open(args.states);
  const commands = args.commands === undefined ? null : open(args.commands);
  const entry = await import(pathToFileURL(bundle).href);
  const run = entry.measure(packDir, { seed: args.seed, turns: args.turns, decisions: args.decisions, cfg,
    ...(args.race === undefined ? {} : { race: args.race }), ...(args.class === undefined ? {} : { class: args.class }),
    ...(states === null ? {} : { onState: state => writeFileSync(states.fd, entry.canonicalJson(state) + '\n') }),
    ...(commands === null ? {} : { onCommand: line => writeFileSync(commands.fd, line) }) });
  const record = { ...base, ...run, settings: effectiveFlags(rules, run.cfg), metadata: { wallTimeMs: performance.now() - started } };
  writeFileSync(output.fd, entry.canonicalJson(record) + '\n');
  console.log(JSON.stringify({ outcome: run.outcome, turn: run.turn, maxDepth: run.maxDepth, level: run.level, playSha256: run.playSha256 }));
} catch (error) {
  const record = { ...base, outcome: 'harness_failure', error: { name: error.name ?? 'Error', message: error.message ?? String(error) }, metadata: { wallTimeMs: performance.now() - started } };
  if (output !== undefined) writeFileSync(output.fd, JSON.stringify(record) + '\n');
  console.error(`zoo-run: ${record.error.message}`); process.exitCode = 1;
} finally { for (const fd of files) closeSync(fd); }
