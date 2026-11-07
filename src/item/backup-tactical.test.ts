/** Source50: actual known registered gear; explicitly modelled local-danger policy inputs. */
import { beforeAll, afterEach, expect, it } from "vitest";
import type { AgentView, AgentCommand, ItemView } from "@rpgm-tools/neo-angband-core";
import { registeredKnownItem, records, type RegisteredItemSpec } from "../../test/fixtures/registered-items.js";
import { itemAnalyzer, type ItemAnalyzer } from "../api2/records.js";
import { itemView } from "../api2/world.js";
import { makeFakeActions, makeScenarioView } from "../harness.js";
import type { BorgContext } from "../context.js";
import { BorgWorld } from "../world/model.js";
import { makeBorgRng } from "../rng.js";
import { borgNotice } from "../trait/trait.js";
import { BI } from "../trait/trait-index.js";
import { getDerived, inheritWeaponSwap } from "../trait/state.js";
import { setBorgCfg, resetBorgCfg } from "../trait/config.js";
import { getDangerGlobals } from "../danger/index.js";
import { getFightState } from "../fight/state.js";
import { borgCaution } from "../fight/caution.js";
import { buildThinkSession,installThinkSession,primeSession } from "../think-session.js";
import { borgDanger,getFearCaches } from "../danger/index.js";
import { TV } from "./svals.js";
import { defaultSpellSeam } from "../trait/config.js";
import * as Wear from "./item-wear.js";
let analyze: ItemAnalyzer;
beforeAll(async () => { analyze = await itemAnalyzer({ content: { records: async (name: string) => ({ ok: true, value: records(name) }) } } as never); });
afterEach(resetBorgCfg);
interface CandidateAnswer { danger: number; traits: { rconf: number; rblind: number; rlite: number; rdark: number; fract: number; sav: number } }
const safe = (danger: number): CandidateAnswer => ({ danger, traits: { rconf: 1, rblind: 1, rlite: 0, rdark: 0, fract: 1, sav: 100 } });
interface BackupDeps { randarts?: boolean; backupEval?: (item: ItemView, slot: number) => CandidateAnswer | null }
const run = (ctx: BorgContext, p = 50, d: BackupDeps = { randarts: false, backupEval: item => safe(item.handle === 3 ? 10 : 40) }): AgentCommand | null =>
  (Wear as typeof Wear & { borgBackupSwap?: (ctx: BorgContext, danger: number, deps?: BackupDeps) => AgentCommand | null }).borgBackupSwap?.(ctx, p, d) ?? null;
function scene({ weapon = true, armour = true, maxDepth = 60, usesSwaps = true,
  weaponSpec = {artifact:"of Éowyn"} as RegisteredItemSpec, armourSpec = {artifact:"'Dal-i-thalion'"} as RegisteredItemSpec } = {}) {
  setBorgCfg({ usesSwaps });
  const known = (spec: RegisteredItemSpec, handle: number) => itemView(registeredKnownItem(spec, handle), analyze);
  const main = known({artifact:"of Pain"}, 1), spare = known(weaponSpec, 2), boots = known(armourSpec, 3);
  const inventory = [...(weapon ? [spare] : []), ...(armour ? [boots] : [])];
  const equipment: Array<ItemView | null> = Array(12).fill(null); equipment[0] = main;
  const base = makeScenarioView({ player: { cls: "Warrior", race: "Human", depth: 60, maxDepth, level: 40, maxLevel: 40,
    hp: 100, maxHp: 100, sp: 0, maxSp: 0, stats: [118,118,118,118,118], blows: 400, toHit: 20, toDam: 10, grid: { x: 10, y: 10 } } });
  const view: AgentView = { ...base, inventory: () => inventory, equipment: () => equipment };
  const ctx: BorgContext = { view, world: new BorgWorld(), act: makeFakeActions(), rng: makeBorgRng(1) };
  borgNotice(ctx); ctx.world.self.c = { x: 10, y: 10 }; getDangerGlobals(ctx.world).avoidance = 100;
  return { ctx, inventory, equipment, spare, boots };
}
it("folds selected actual Nether/FREE_ACT/CONF boots into backup availability without base resistance", () => {
  const s = scene({ weapon: false }); const t=s.ctx.world.self.trait;
  expect(s.boots.artifactName).toBe("'Dal-i-thalion'"); expect(s.boots.flags).toContain("FREE_ACT");
  expect(getDerived(s.ctx.world).armourSwap.handle).toBe(3);
  expect(t[BI.RNTHR]).toBe(0); expect(t[BI.FRACT]).toBe(0); expect(t[BI.RCONF]).toBe(0);
  expect([t[BI.SRNTHR],t[BI.SFRACT],t[BI.SRCONF]]).toEqual([1,1,1]);
});
it("folds the selected actual Nether weapon independently of armour", () => {
  const s=scene({armour:false}); expect(s.spare.resists).toContainEqual({element:"NETHER",level:1});
  expect(getDerived(s.ctx.world).weaponSwap.handle).toBe(2); expect(s.ctx.world.self.trait[BI.RNTHR]).toBe(0);
  expect(s.ctx.world.self.trait[BI.SRNTHR]).toBe(1);
});
it("retains backup capabilities under FALSE after the selected item leaves the scratch pack", () => {
  const s=scene({weapon:false}); s.inventory.length=0; borgNotice(s.ctx,{noticeSwap:false});
  expect(getDerived(s.ctx.world).armourSwap.handle).toBe(3); expect(s.ctx.world.self.trait[BI.SRNTHR]).toBe(1);
  borgNotice(s.ctx); expect(getDerived(s.ctx.world).armourSwap.handle).toBeNull(); expect(s.ctx.world.self.trait[BI.SRNTHR]).toBe(0);
});
it("copies selected capabilities into an isolated scratch world without live mutation", () => {
  const s=scene({weapon:false}); const before=[...s.ctx.world.self.trait], state=getDerived(s.ctx.world);
  const scratch={...s.ctx,world:new BorgWorld(),view:{...s.ctx.view,inventory:()=>[]}};
  inheritWeaponSwap(scratch.world,s.ctx.world); borgNotice(scratch,{noticeSwap:false});
  expect(scratch.world.self.trait[BI.SFRACT]).toBe(1); expect(getDerived(s.ctx.world)).toBe(state); expect(s.ctx.world.self.trait).toEqual(before);
});
it("emits the ordinary weapon command for the original C82 higher-danger winner", () => {
  const s=scene(); expect(getDerived(s.ctx.world).weaponSwap.handle).toBe(2); expect(getDerived(s.ctx.world).armourSwap.handle).toBe(3);
  expect(run(s.ctx)).toEqual({code:"wield",args:{handle:2}}); // armour10 vs weapon40; preserve original C comparator.
});
it("keeps equal-danger ties on the weapon", () => { const s=scene(); expect(run(s.ctx,50,{randarts:false,backupEval:()=>safe(30)})).toEqual({code:"wield",args:{handle:2}}); });
it("can wear the sole armour candidate when it clears the native ceiling", () => { const s=scene({weapon:false}); expect(run(s.ctx)).toEqual({code:"wield",args:{handle:3}}); });
it("can wear the sole weapon candidate without an armour snapshot", () => {
  const s=scene({armour:false}); expect(run(s.ctx)).toEqual({code:"wield",args:{handle:2}});
});
it.each([BI.ISHUNGRY,BI.ISWEAK])("refuses the maneuver under condition %i", bi => { const s=scene(); s.ctx.world.self.trait[bi]=1; expect(run(s.ctx)).toBeNull(); });
it("refuses panel count301", () => { const s=scene(); s.ctx.world.self.timeThisPanel=301; expect(run(s.ctx)).toBeNull(); });
it("refuses a candidate that does not improve current danger", () => { const s=scene(); expect(run(s.ctx,40)).toBeNull(); });
it("refuses the native chosen danger above half avoidance", () => { const s=scene(); expect(run(s.ctx,90,{randarts:false,backupEval:()=>safe(51)})).toBeNull(); });
it("refuses absent loadout evaluation instead of inventing a score", () => { const s=scene(); expect(run(s.ctx,50,{randarts:false})).toBeNull(); });
it("refuses an unresolved evaluation", () => { const s=scene(); expect(run(s.ctx,50,{randarts:false,backupEval:()=>null})).toBeNull(); });
it("refuses when there are no selected backups", () => { const s=scene({weapon:false,armour:false}); expect(run(s.ctx)).toBeNull(); });
it("does not silently repair the absent weapon winner for zero-danger armour tie", () => { const s=scene({weapon:false}); expect(run(s.ctx,50,{randarts:false,backupEval:()=>safe(0)})).toBeNull(); });
it("does not fold unavailable backups when swaps are off", () => { const s=scene({usesSwaps:false}); expect(s.ctx.world.self.trait[BI.SRNTHR]).toBe(0); expect(run(s.ctx)).toBeNull(); });

// Explicit model-danger/critical-trait policy boundaries; actual command tests are separate.
it.each([300,301])("applies the panel guard at %i",panels=>{const s=scene();s.ctx.world.self.timeThisPanel=panels;expect(run(s.ctx)?.code??null).toBe(panels===300?"wield":null);});
it.each([89,90])("applies the tactical max-depth ceiling at %i",depth=>{const s=scene();s.ctx.world.self.trait[BI.MAXDEPTH]=depth;expect(run(s.ctx)?.code??null).toBe(depth===89?"wield":null);});
it("keeps the digger exception available below armour's depth50 gate",()=>{
  const s=scene({armour:false,maxDepth:40,weaponSpec:{kind:"& Mattock~"}});
  expect(getDerived(s.ctx.world).weaponSwap.handle).toBe(2);expect(getDerived(s.ctx.world).armourSwap.handle).toBeNull();
  expect(run(s.ctx)).toEqual({code:"wield",args:{handle:2}});
});
it.each([[50,51,true],[51,90,false]] as const)("uses inclusive ordinary ceiling %i with current danger%i",(candidate,p,allowed)=>{
  const s=scene();expect(run(s.ctx,p,{randarts:false,backupEval:()=>safe(candidate)})?.code??null).toBe(allowed?"wield":null);
});
it.each([[66,true],[67,false]] as const)("uses the nearby-unique ceiling at%i",(candidate,allowed)=>{
  const s=scene();getFightState(s.ctx.world).fightingUnique=1;
  expect(run(s.ctx,80,{randarts:false,backupEval:()=>safe(candidate)})?.code??null).toBe(allowed?"wield":null);
});
it("does not substitute whole-level unique knowledge for the near-unique ceiling",()=>{
  const s=scene();s.ctx.world.facts.uniqueOnLevel=42;
  expect(run(s.ctx,80,{randarts:false,backupEval:()=>safe(66)})).toBeNull();
});
it("refuses loss of saved confusion resistance even at saving throw100",()=>{
  const s=scene();s.ctx.world.self.trait[BI.RCONF]=1;
  expect(run(s.ctx,50,{randarts:false,backupEval:()=>({...safe(20),traits:{...safe(20).traits,rconf:0}})})).toBeNull();
});
it("retains the native weapon-only zero-initialized critical snapshot",()=>{
  const s=scene({armour:false});s.ctx.world.self.trait[BI.RCONF]=1;
  expect(run(s.ctx,50,{randarts:false,backupEval:()=>({...safe(20),traits:{...safe(20).traits,rconf:0}})})).toEqual({code:"wield",args:{handle:2}});
});
it.each([[99,false],[100,true]] as const)("guards paralysis loss with saving throw%i",(sav,allowed)=>{
  const s=scene();s.ctx.world.self.trait[BI.FRACT]=1;
  expect(run(s.ctx,50,{randarts:false,backupEval:()=>({danger:20,traits:{...safe(20).traits,fract:0,sav}})})?.code??null).toBe(allowed?"wield":null);
});
it.each([[99,0,0,false],[100,0,0,true],[99,1,0,true],[99,0,1,true]] as const)("guards blindness loss at sav%i light%i dark%i",(sav,rlite,rdark,allowed)=>{
  const s=scene();s.ctx.world.self.trait[BI.RBLIND]=1;
  expect(run(s.ctx,50,{randarts:false,backupEval:()=>({danger:20,traits:{...safe(20).traits,rblind:0,rlite,rdark,sav}})})?.code??null).toBe(allowed?"wield":null);
});
it("preserves the weapon acid-tail ELEC behavior for actual known acid-only gear",()=>{
  const s=scene({armour:false,weaponSpec:{artifact:"'Angrist'"}});expect(s.spare.resists).toContainEqual({element:"ACID",level:1});
  expect(getDerived(s.ctx.world).weaponSwap.handle).toBe(2);expect(s.ctx.world.self.trait[BI.SRACID]).toBe(0);
});
it("preserves the weapon acid-tail ELEC behavior for actual known electricity gear",()=>{
  const s=scene({armour:false,weaponSpec:{artifact:"'Dethanc'"}});expect(s.spare.resists).toContainEqual({element:"ELEC",level:1});
  expect(getDerived(s.ctx.world).weaponSwap.handle).toBe(2);expect(s.ctx.world.self.trait[BI.SRACID]).toBe(1);
});
it("does not manufacture backup fear flags for either actual known selector",()=>{
  const s=scene({armourSpec:{artifact:"of Thorongil"}});expect(s.spare.flags).toContain("PROT_FEAR");expect(s.boots.flags).toContain("PROT_FEAR");
  expect(getDerived(s.ctx.world).weaponSwap.handle).toBe(2);expect(getDerived(s.ctx.world).armourSwap.handle).toBe(3);
  expect(s.ctx.world.self.trait[BI.RFEAR]).toBe(0);expect(s.ctx.world.self.trait[BI.SRFEAR]).toBe(0);
});
it.each([15,16])("keeps explicit spell-profile availability at the C fifteen-percent boundary%i",fail=>{
  const s=scene({weapon:false,armour:false});const calls:string[]=[];
  borgNotice(s.ctx,{spells:{...defaultSpellSeam(),spellLegalFail:(name,ceiling)=>{calls.push(name+":"+ceiling);return fail<=ceiling;}}});
  expect(calls).toContain("RESISTANCE:15");expect(calls).toContain("RESIST_POISON:15");
  expect([BI.SRACID,BI.SRELEC,BI.SRFIRE,BI.SRCOLD,BI.SRPOIS].map(b=>s.ctx.world.self.trait[b])).toEqual(Array(5).fill(fail===15?1:0));
});
it("uses actual partial-rune artifact knowledge for the randart guard",()=>{
  const s=scene({weapon:false,armourSpec:{artifact:"'Dal-i-thalion'",known:false}});
  expect(s.boots.artifact).toBe(true);expect((s.boots as ItemView&{unknownRunes?:boolean}).unknownRunes).toBe(true);
  expect(getDerived(s.ctx.world).armourSwap.handle).toBe(3);
  expect(run(s.ctx,50,{randarts:true,backupEval:()=>safe(20)})).toBeNull();
  expect(run(s.ctx,50,{backupEval:()=>safe(20)})).toBeNull();
  expect(run(s.ctx,50,{randarts:false,backupEval:()=>safe(20)})).toEqual({code:"wield",args:{handle:3}});
});

it.each([[33,false],[34,true]] as const)("wires caution's strict danger trigger while fleeing at%i",(danger,allowed)=>{
  const s=scene();let calls=0;const session=buildThinkSession({loadoutDangerAnswer:()=>{calls++;return safe(20);}});
  installThinkSession(s.ctx.world,session);primeSession(session,s.ctx);s.ctx.world.self.goal.fleeing=true;
  getFearCaches(s.ctx.world).region2d[0]![0]=danger;
  expect(borgDanger(s.ctx,10,10,1,true,false)).toBe(danger);
  const cmd=borgCaution(s.ctx,session.flow.state);expect(cmd?.code==="wield").toBe(allowed);expect(calls>0).toBe(allowed);
});
it("keeps eligible healing ahead of the backup attempt in the production caution rung",()=>{
  const s=scene();const potion=itemView(registeredKnownItem({kind:"Healing"},4),analyze);expect(potion.tval).toBe(TV.POTION);
  s.inventory.push(potion);const player=s.ctx.view.player();
  // Model injury/stun makes native healing deterministic: stun bypasses its existing probabilistic gate.
  const ctx={...s.ctx,view:{...s.ctx.view,player:()=>({...player,hp:10,status:{...player.status,stun:5}})}};borgNotice(ctx);
  let calls=0;const session=buildThinkSession({loadoutDangerAnswer:()=>{calls++;return safe(1);}});
  installThinkSession(ctx.world,session);primeSession(session,ctx);getFearCaches(ctx.world).region2d[0]![0]=50;
  expect(borgCaution(ctx,session.flow.state)).toEqual({code:"quaff",args:{handle:4}});expect(calls).toBe(0);
});
