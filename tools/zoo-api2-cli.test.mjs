import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync, execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { outputPath } from './zoo-common.mjs';
import { verifyLane } from './zoo-policy.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const dir=mkdtempSync(join(tmpdir(),'zoo-api2-contract-'));
afterAll(()=>rmSync(dir,{recursive:true,force:true}));
it('protects a symlinked own docs/runs archive, even by its real name',()=>{
 const fake=join(dir,'root'), archive=join(dir,'archive');mkdirSync(join(fake,'docs'),{recursive:true});mkdirSync(archive);
 symlinkSync(archive,join(fake,'docs/runs'));expect(()=>outputPath(fake,join(archive,'new.json'))).toThrow(/docs\/runs/);
 expect(()=>outputPath(join(dir,'no-runs-directory'),join(dir,'fresh.json'))).not.toThrow();
});
it('does not impose a clean-source lane on ordinary Mandos main',()=>{
 if(!existsSync(join(root,'zoo-lane.json')))expect(verifyLane(root)).toBeNull();
 else expect(verifyLane(root).includesCTranslations).toBe(false);
});
if(existsSync(join(root,'zoo-lane.json')))describe('clean lane public CLI',()=>{
 const bundle=join(dir,'bundle');
 beforeAll(()=>execFileSync(process.execPath,[join(root,'tools/zoo-build.mjs'),'--out',bundle],{cwd:root}),30000);
 it('proves source imports, actual settings and identical outputs with an async target',()=>{
  const settings=join(dir,'flags.json');writeFileSync(settings,JSON.stringify({'borg.playsRisky':true,'borg.selfScum':false}));
  const states=join(dir,'states.jsonl'),commands=join(dir,'commands.jsonl');
  const one=join(dir,'one.json'),two=join(dir,'two.json');
  const args=['--bundle',bundle,'--seed','7','--turns','51','--settings',settings,'--race','Human','--class','Warrior'];
  const run=(...extra)=>spawnSync(process.execPath,[join(root,'tools/zoo-run.mjs'),...args,...extra],{cwd:root,encoding:'utf8',env:{...process.env,NEO_ANGBAND_REPO:'/no/sibling',NEO_ANGBAND_LOCAL_CORE:'1'}});
  const a=run('--out',one,'--states',states,'--commands',commands),b=run('--out',two);
  expect(a.status,a.stderr).toBe(0);expect(b.status,b.stderr).toBe(0);
  const first=JSON.parse(readFileSync(one)),second=JSON.parse(readFileSync(two));
  expect(first).toMatchObject({controllerProfile:'api2-plugin',commandStreamProfile:'api2-intents-v1',outcome:'turn_cap',settings:{'borg.playsRisky':true,'borg.selfScum':false},crossModFlags:{'bugfix.borgFixes':true}});
  expect(first.provenance.lane.includesCTranslations).toBe(false);
  delete first.metadata;delete second.metadata;expect(first).toEqual(second);
  expect(createHash('sha256').update(readFileSync(commands)).digest('hex')).toBe(first.playSha256);
  const rows=readFileSync(states,'utf8').trim().split('\n').map(JSON.parse);expect(rows[0]).toMatchObject({kind:'birth',turn:0});expect(rows.at(-1)).toMatchObject({kind:'stop',turn:first.turn});
  const build=JSON.parse(readFileSync(join(bundle,'build.json')));expect(build.compiledProjectInputs).toContain('plugin.ts');expect(build.compiledProjectInputs).not.toContain('plugin.js');expect(build.sourceFiles).toContain('plugin.js');
 },30000);
});
