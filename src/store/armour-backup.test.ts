/** Source48: registered known item proxies; model player isolates the C value/HOME leaf. */
import { afterEach, beforeAll, expect, it } from "vitest";
import type { AgentView, ItemView, StoreView } from "@rpgm-tools/neo-angband-core";
import { registeredKnownItem, records, type RegisteredItemSpec } from "../../test/fixtures/registered-items.js";
import { itemAnalyzer, type ItemAnalyzer } from "../api2/records.js";
import { itemView } from "../api2/world.js";
import { makeFakeActions, makeScenarioView } from "../harness.js";
import { BorgWorld } from "../world/model.js";
import type { BorgContext } from "../context.js";
import { borgNotice } from "../trait/trait.js";
import { borgPower } from "../trait/power.js";
import { getDerived } from "../trait/state.js";
import { BI } from "../trait/trait-index.js";
import { resetBorgCfg, setBorgCfg } from "../trait/config.js";
import { perceive, makePerceiveMemo } from "../perceive.js";
import { makeBorgRng } from "../rng.js";
import { buildStoreDeps, buildThinkSession, primeSession } from "../think-session.js";
import { makeCoreResolvers } from "../resolvers.js";
import { borgThinkHomeBuySwapArmour, borgThinkShopBuy } from "./buy.js";
afterEach(resetBorgCfg);
let analyze: ItemAnalyzer;
beforeAll(async () => { analyze = await itemAnalyzer({ content: { records: async (name: string) => ({ ok: true, value: records(name) }) } } as never); });
const boots = "'Dal-i-thalion'";
function known(spec: RegisteredItemSpec, handle: number): ItemView { return itemView(registeredKnownItem(spec, handle), analyze); }
function scene({ carry = false, home = true, maxDepth = 60, maxLevel = 40, usesSwaps = true,
  pack = [] as ItemView[], candidate = undefined as ItemView | undefined, loadout = true, full = false } = {}) {
  setBorgCfg({ usesSwaps });
  const main = known({ artifact: "of Pain" }, 1);
  const wanted = candidate ?? known({ artifact: boots }, carry ? 2 : 0);
  const inventory = [...pack, ...(carry ? [wanted] : [])];
  if (full) while (inventory.length < 23) inventory.push(known({ kind: "Chain Mail~", toA: inventory.length }, 100 + inventory.length));
  const base = makeScenarioView({ player: { cls: "Warrior", race: "Human", depth: 0, maxDepth, level: 40, maxLevel,
    hp: 500, maxHp: 500, sp: 0, maxSp: 0, stats: [118, 118, 118, 118, 118], blows: 400, toHit: 20, toDam: 10, grid: { x: 10, y: 10 } } });
  const equipment = Array<ItemView | null>(12).fill(null); equipment[0] = main;
  const stores = Array.from({ length: 8 }, (_, feat): StoreView => ({ feat, featName: feat === 7 ? "Your Home" : "shop", isHome: feat === 7,
    owner: { name: "keeper", purse: 30000 }, stock: feat === 7 && home && !carry ? [{ ...wanted, index: 0 }] : [] }));
  const view: AgentView = { ...base, inventory: () => inventory, equipment: () => equipment, stores: () => stores };
  const ctx: BorgContext = { view, world: new BorgWorld(), act: makeFakeActions(), rng: makeBorgRng(1) };
  borgNotice(ctx); perceive(ctx.world, view, makePerceiveMemo()); borgPower(ctx);
  ctx.world.self.goal.shop = ctx.world.self.goal.ware = ctx.world.self.goal.item = -1;
  ctx.world.self.goal.doBest = false;
  const session = buildThinkSession(loadout ? makeCoreResolvers({}) : {}); primeSession(session, ctx);
  return { ctx, inventory, wanted, deps: { ...buildStoreDeps(session), usesSwaps } };
}
function armour(ctx: BorgContext) {
  return (getDerived(ctx.world) as { armourSwap?: { handle: number | null; value: number } }).armourSwap;
}

it("selects the actual known Nether boots as a carried armour backup without wearing them", () => {
  const s = scene({ carry: true });
  expect(s.wanted.artifactName).toBe(boots);
  expect(s.wanted.flags).toContain("FREE_ACT");
  expect(s.wanted.resists).toContainEqual({ element: "NETHER", level: 1 });
  expect(s.ctx.world.self.trait[BI.RNTHR]).toBe(0);
  expect(armour(s.ctx)?.handle).toBe(2);
  expect(armour(s.ctx)?.value).toBeGreaterThan(100000);
  expect(s.ctx.view.equipment()[0]?.artifactName).toBe("of Pain");
});
it("includes the carried armour value in power", () => {
  const empty = scene({ home: false }), carried = scene({ carry: true, home: false });
  expect(carried.ctx.world.self.power - empty.ctx.world.self.power).toBeGreaterThan(100000);
});
it("retrieves the registered armour through normal HOME dependencies", () => {
  const s = scene();
  expect(borgThinkHomeBuySwapArmour(s.ctx, s.deps)).toBe(true);
  expect(borgThinkShopBuy(s.ctx, 7, s.deps)).toMatchObject({ code: "shop-buy", args: { index: 0 } });
});
it("does not depend on the optional worn-loadout evaluator for armour HOME value", () => {
  const s = scene({ loadout: false });
  expect(borgThinkHomeBuySwapArmour(s.ctx, s.deps)).toBe(true);
});
it.each([[49, false], [50, true], [89, true], [90, false]] as const)("applies the C armour depth gate at %i", (maxDepth, chosen) => {
  const s = scene({ carry: true, maxDepth });
  expect(armour(s.ctx)?.handle ?? null).toBe(chosen ? 2 : null);
});
it("keeps swaps disabled when the owner option is off", () => {
  const s = scene({ carry: true, usesSwaps: false });
  expect(armour(s.ctx)?.handle ?? null).toBeNull();
  expect(borgThinkHomeBuySwapArmour(s.ctx, s.deps)).toBe(false);
});
it.each(["'Cammithrim'", "of Galadriel", "of Éowyn", "'The One Ring'"])("keeps C's excluded type/OneRing guard for %s", artifact => {
  const s = scene({ carry: true, candidate: known({ artifact }, 2) });
  expect(armour(s.ctx)?.handle ?? null).toBeNull();
});
it("chooses the later equal-score nonartifact pack item without adding an AC reward", () => {
  const leather = known({ kind: "& Pair~ of Leather Boots" }, 2), mithril = known({ kind: "& Pair~ of Mithril Shod Boots" }, 3);
  expect(mithril.ac).toBeGreaterThan(leather.ac);
  const s = scene({ home: false, pack: [leather, mithril] });
  expect(armour(s.ctx)?.handle).toBe(3);
  const reversed = scene({ home: false, pack: [mithril, leather] });
  expect(armour(reversed.ctx)?.handle).toBe(2);
  expect(armour(reversed.ctx)?.value).toBe(armour(s.ctx)?.value);
});
it("rejects an equal HOME candidate and leaves source views unchanged", () => {
  const carried = known({ kind: "& Pair~ of Leather Boots" }, 2), s = scene({ pack: [carried], candidate: known({ kind: "& Pair~ of Leather Boots" }, 0) });
  const before = s.ctx.world.self.power;
  expect(borgThinkHomeBuySwapArmour(s.ctx, s.deps)).toBe(false);
  expect(s.ctx.world.self.goal.shop).toBe(-1);
  expect(s.ctx.world.self.power).toBe(before);
  expect(s.ctx.view.inventory()).toEqual([carried]);
});
it("does not invent missing curse strength from its public name", () => {
  const s = scene({ carry: true, candidate: known({ artifact: boots, curse: "teleportation" }, 2) });
  expect(s.wanted.curses).toContain("teleportation");
  expect(armour(s.ctx)?.handle ?? null).toBeNull();
});
it("refuses repeatedly when the real pack has no hole even with an old armour backup", () => {
  const old = known({ kind: "& Pair~ of Leather Boots" }, 2), s = scene({ pack: [old], full: true });
  for (let i = 0; i < 3; i++) expect(borgThinkHomeBuySwapArmour(s.ctx, s.deps)).toBe(false);
  expect(s.ctx.world.self.goal.shop).toBe(-1);
});
it("preserves the armour snapshot when noticeSwap is false and reselects on true", () => {
  const s = scene({ carry: true });
  const found = armour(s.ctx);
  expect(found?.handle).toBe(2);
  const emptied = { ...s.ctx, view: { ...s.ctx.view, inventory: () => [] } };
  borgNotice(emptied, { noticeSwap: false });
  expect(armour(emptied)).toEqual(found);
  borgNotice(emptied);
  expect(armour(emptied)).toEqual({ handle: null, value: -1 });
});
