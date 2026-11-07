/** Source48: registered known item proxies; model player isolates the C value/HOME leaf. */
import * as Core from "@rpgm-tools/neo-angband-core";
import { afterEach, beforeAll, expect, it } from "vitest";
import type { AgentView, ItemView, StoreView } from "@rpgm-tools/neo-angband-core";
import { registeredKnownItem, registeredPack, records, type RegisteredItemSpec } from "../../test/fixtures/registered-items.js";
import { itemAnalyzer, type ItemAnalyzer } from "../api2/records.js";
import { itemView } from "../api2/world.js";
import { makeFakeActions, makeScenarioView } from "../harness.js";
import { BorgWorld } from "../world/model.js";
import type { BorgContext } from "../context.js";
import { borgNotice } from "../trait/trait.js";
import { borgArmourSwap } from "../trait/armour-swap.js";
import { borgPower } from "../trait/power.js";
import { borgSimulatePower, borgSimulateDanger } from "../trait/simulate.js";
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


it("suppresses the high Nether bonus only for the selected known weapon backup", () => {
  const nether = known({ artifact: "of Éowyn" }, 3);
  expect(nether.resists).toContainEqual({ element: "NETHER", level: 1 });
  const without = scene({ carry: true }), withSelected = scene({ carry: true, pack: [nether] });
  expect(getDerived(withSelected.ctx.world).weaponSwap.handle).toBe(3);
  expect(armour(without.ctx)!.value - armour(withSelected.ctx)!.value).toBe(105000);
});
it("does not union the Nether resistance of an unselected pack weapon", () => {
  const nether = known({ artifact: "of Éowyn" }, 3), selected = known({ artifact: "'Deathwreaker'" }, 4);
  expect(selected.resists.some(r => r.element === "NETHER" && r.level > 0)).toBe(false);
  const s = scene({ carry: true, maxDepth: 75, pack: [nether, selected] });
  expect(getDerived(s.ctx.world).weaponSwap.handle).toBe(4);
  const control = scene({ carry: true, maxDepth: 75 });
  expect(armour(s.ctx)!.value).toBe(armour(control.ctx)!.value);
});
it.each([["'Narya'", "FIRE"], ["'Nenya'", "COLD"]] as const)("keeps the C Tarrasque immunity concern for %s", (artifact, element) => {
  const candidate = known({ artifact }, 2);
  expect(candidate.resists).toContainEqual({ element, level: 3 });
  const before = scene({ carry: true, maxDepth: 74, candidate });
  const after = scene({ carry: true, maxDepth: 75, candidate });
  expect(armour(after.ctx)!.value - armour(before.ctx)!.value).toBe(90000);
  borgNotice(after.ctx, { weaponSwap: { tarrasqueDead: true }, armourSwap: { uncursable: () => false } });
  expect(armour(after.ctx)!.value).toBe(armour(before.ctx)!.value);
  // An armour-specific callback cannot hide the one shared world fact.
  borgNotice(after.ctx, { weaponSwap: { tarrasqueDead: false }, armourSwap: { uncursable: () => false } });
  expect(armour(after.ctx)!.value).toBe(armour(before.ctx)!.value + 90000);
  borgNotice(after.ctx, { weaponSwap: { tarrasqueDead: true } });
  expect(armour(after.ctx)!.value).toBe(armour(before.ctx)!.value);
});
it("keeps HOLD_LIFE's max-level49/50 boundary", () => {
  const candidate = known({ artifact: "'Evenstar'" }, 2);
  expect(candidate.flags).toContain("HOLD_LIFE");
  const a = scene({ carry: true, maxLevel: 49, candidate }), b = scene({ carry: true, maxLevel: 50, candidate });
  expect(armour(a.ctx)!.value - armour(b.ctx)!.value).toBe(2000);
});
it("does not read the unlearned protection runes of a real unrecognized item", () => {
  const hidden = known({ artifact: boots, known: false }, 2), visible = known({ artifact: boots }, 2);
  expect(hidden.flags).not.toContain("FREE_ACT");
  expect(hidden.resists.some(r => r.element === "NETHER" && r.level > 0)).toBe(false);
  const a = scene({ carry: true, candidate: hidden }), b = scene({ carry: true, candidate: visible });
  expect(armour(a.ctx)!.value).toBeLessThan(armour(b.ctx)!.value);
});
it("rejects actual unknown flavour awareness rather than masking it in a view", () => {
  const hidden = known({ artifact: "'Narya'", known: false }, 2);
  expect(hidden.aware).toBe(false);
  const s = scene({ carry: true, candidate: hidden });
  expect(armour(s.ctx)).toEqual({ handle: null, value: -1 });
});
it("uses an explicit public removability input without inventing one in production", () => {
  const s = scene({ carry: true, candidate: known({ artifact: boots, curse: "teleportation" }, 2) });
  expect(armour(s.ctx)).toEqual({ handle: null, value: -1 });
  borgNotice(s.ctx, { armourSwap: { uncursable: () => false } });
  expect(armour(s.ctx)).toEqual({ handle: null, value: -1 });
  borgNotice(s.ctx, { weaponSwap: { uncursable: () => true }, armourSwap: {} });
  expect(armour(s.ctx)?.handle).toBe(2);
  borgNotice(s.ctx, { weaponSwap: { uncursable: () => true }, armourSwap: { uncursable: () => false } });
  expect(armour(s.ctx)).toEqual({ handle: null, value: -1 });
  borgNotice(s.ctx, { armourSwap: { uncursable: () => true } });
  expect(armour(s.ctx)?.handle).toBe(2);
});
it("keeps both live backup snapshots and their options through scratch simulations", () => {
  const s = scene({ carry: true, pack: [known({ artifact: "of Éowyn" }, 3)] });
  const live = getDerived(s.ctx.world), before = { weapon: { ...live.weaponSwap }, armour: { ...armour(s.ctx)! }, options: live.armourSwapOpts };
  const view = s.ctx.view;
  view.simulateLoadout = () => ({ after: { player: view.player(), equipment: view.equipment(), inventory: [] } }) as never;
  const withLive = borgSimulatePower(s.ctx, {});
  const cold = { ...s.ctx, world: new BorgWorld() };
  const withoutLive = borgSimulatePower(cold, {});
  expect(withLive! - withoutLive!).toBe(before.weapon.value + before.armour.value + 2);
  borgSimulateDanger(s.ctx, {});
  expect(getDerived(s.ctx.world).weaponSwap).toEqual(before.weapon);
  expect(armour(s.ctx)).toEqual(before.armour);
  expect(getDerived(s.ctx.world).armourSwapOpts).toBe(before.options);
});
it("HOME recomputes the selected weapon for every ware rather than filtering weapons out", () => {
  const netherWeapon = known({ artifact: "of Éowyn" }, 3), armourItem = known({ artifact: boots }, 2), otherArmour = known({ artifact: "'Evenstar'" }, 4);
  const s = scene({ pack: [netherWeapon, armourItem, otherArmour], candidate: known({ artifact: "'Deathwreaker'" }, 0), maxDepth: 75 });
  expect(getDerived(s.ctx.world).weaponSwap.handle).toBe(3);
  expect(borgThinkHomeBuySwapArmour(s.ctx, s.deps)).toBe(true);
  expect(borgThinkShopBuy(s.ctx, 7, s.deps)).toMatchObject({ code: "shop-buy", args: { index: 0 } });
});

it("keeps actual carried and HOME handle namespaces disjoint in the same game", () => {
  const game = Core.startGame(registeredPack(), { seed: 441, depth: 0, raceName: "Human", className: "Warrior" });
  const { state } = game, reg = game.booted.registries.objects;
  const object = (name: string) => {
    const art = reg.artifacts.find(a => a?.name === name)!;
    expect(art).toBeDefined();
    const kind = reg.lookupKind(art.tval, art.sval)!;
    const obj = Core.objectPrep(state.rng, reg, game.booted.registries.constants, kind, 60, "maximise");
    obj.artifact = art; Core.copyArtifactData(state.rng, reg, obj, art); obj.number = 1; obj.notice |= Core.OBJ_NOTICE.ASSESSED;
    game.flavor.objectFlavorAware(kind, state.flavorAwareDeps ?? Core.NOOP_FLAVOR_AWARE_DEPS);
    return obj;
  };
  const handles = ["of Éowyn", boots, "'Evenstar'"].map(name => {
    const handle = Core.gearAdd(state.gear!, object(name)); state.gear!.pack.push(handle); return handle;
  });
  const home = state.stores!.find(store => store.feat === Core.FEAT.HOME)!;
  home.stock = [object("'Deathwreaker'")]; state.chunk.setFeat(state.actor.grid, home.feat);
  state.actor.player.upkeep.totalWeight = Core.gearTotalWeight(state.gear!);
  Core.playerLearnAllRunes(state.actor.player, state.runeEnv);
  const world = Core.buildKnownWorld(state, { reg });
  const pack = world.inventory!.filter(i => handles.includes(i.handle));
  const ware = world.stores!.find(store => store.isHome)!.stock[0]!;
  expect(pack).toHaveLength(3);
  expect(pack.every(i => i.handle > 0)).toBe(true);
  expect(new Set(pack.map(i => i.handle)).size).toBe(3);
  expect(ware.handle).toBe(0);
  expect(ware.carried).toBe(false);
  expect(pack.some(i => i.handle === ware.handle)).toBe(false);
  // Retain the engine's actual handles here; no fixture remapping hides aliases.
  const s = scene({ pack: pack.map(i => itemView(i, analyze)), candidate: itemView(ware, analyze), maxDepth: 75 });
  expect(getDerived(s.ctx.world).weaponSwap.handle).toBe(handles[0]);
  expect(borgThinkHomeBuySwapArmour(s.ctx, s.deps)).toBe(true);
});

it("captures the same public scoring profile for current and HOME values", () => {
  const s = scene({ candidate: known({ artifact: boots, curse: "teleportation" }, 0) });
  const knowledge = { uncursable: () => true };
  borgNotice(s.ctx, { armourSwap: knowledge });
  const expected = s.deps.armourSwapEval!(s.ctx, s.wanted);
  knowledge.uncursable = () => false;
  expect(s.deps.armourSwapEval!(s.ctx, s.wanted)).toBe(expected);
});
it.each(["& Hard Leather Cap~", "& Iron Crown~", "& Wicker Shield~", "& Cloak~", "& Robe~", "Metal Scale Mail~", "Black Dragon Scale Mail~"])("keeps the registered C eligible type for %s", kind => {
  const candidate = known({ kind }, 2), s = scene({ carry: true, candidate });
  expect(armour(s.ctx)?.handle).toBe(2);
});
it("keeps the C coefficient and all-four-resist reward without an AC term", () => {
  const shield = known({ artifact: "of Celegorm" }, 2), s = scene({ home: false });
  expect(shield.dd).toBe(1); expect(shield.ds).toBe(3); expect(shield.toH).toBe(0); expect(shield.toD).toBe(0);
  for (const element of ["ACID", "ELEC", "FIRE", "COLD"]) expect(shield.resists).toContainEqual({ element, level: 1 });
  // Explicit model-only formula inputs, not a claimed derived engine character.
  const t = s.ctx.world.self.trait; t[BI.BLOWS] = 4; t[BI.TOHIT] = 20; t[BI.TODAM] = 10;
  for (const bi of [BI.RACID, BI.RELEC, BI.RFIRE, BI.RCOLD, BI.RBLIND, BI.RLITE, BI.RDARK]) t[bi] = 1;
  // -1 + (1*3*35)*5 + 20*100 + 10*35 + all-four10000 =12874.
  expect(borgArmourSwap(s.ctx, {}, [shield]).value).toBe(12874);
});
it("does not invent a PROT_FEAR value absent from the C scorer", () => {
  const ring = known({ artifact: "'Narya'" }, 2), s = scene({ home: false });
  expect(ring.flags).toContain("PROT_FEAR");
  s.ctx.world.self.trait[BI.RFEAR] = 0;
  const a = borgArmourSwap(s.ctx, {}, [ring]).value;
  s.ctx.world.self.trait[BI.RFEAR] = 1;
  expect(borgArmourSwap(s.ctx, {}, [ring]).value).toBe(a);
});
