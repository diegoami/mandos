/** Source50: actual known registered gear; explicitly modelled local-danger policy inputs. */
import { beforeAll, afterEach, expect, it } from "vitest";
import type { AgentView, AgentCommand, ItemView } from "@rpgm-tools/neo-angband-core";
import { registeredKnownItem, records } from "../../test/fixtures/registered-items.js";
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
import * as Wear from "./item-wear.js";
let analyze: ItemAnalyzer;
beforeAll(async () => { analyze = await itemAnalyzer({ content: { records: async (name: string) => ({ ok: true, value: records(name) }) } } as never); });
afterEach(resetBorgCfg);
interface CandidateAnswer { danger: number; traits: { rconf: number; rblind: number; rlite: number; rdark: number; fract: number; sav: number } }
const safe = (danger: number): CandidateAnswer => ({ danger, traits: { rconf: 1, rblind: 1, rlite: 0, rdark: 0, fract: 1, sav: 100 } });
interface BackupDeps { randarts?: boolean; backupEval?: (item: ItemView, slot: number) => CandidateAnswer | null }
const run = (ctx: BorgContext, p = 50, d: BackupDeps = { randarts: false, backupEval: item => safe(item.handle === 3 ? 10 : 40) }): AgentCommand | null =>
  (Wear as typeof Wear & { borgBackupSwap?: (ctx: BorgContext, danger: number, deps?: BackupDeps) => AgentCommand | null }).borgBackupSwap?.(ctx, p, d) ?? null;
function scene({ weapon = true, armour = true, maxDepth = 60, usesSwaps = true } = {}) {
  setBorgCfg({ usesSwaps });
  const known = (artifact: string, handle: number) => itemView(registeredKnownItem({ artifact }, handle), analyze);
  const main = known("of Pain", 1), spare = known("of Éowyn", 2), boots = known("'Dal-i-thalion'", 3);
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
