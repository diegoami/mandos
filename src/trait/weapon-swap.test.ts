import { afterEach, expect, it } from "vitest";
import type { ItemView } from "@rpgm-tools/neo-angband-core";
import { makeScenarioView, makeFakeActions } from "../harness.js";
import { BorgWorld } from "../world/model.js";
import { makeBorgRng } from "../rng.js";
import type { BorgContext } from "../context.js";
import { BI, BI_MAX } from "./trait-index.js";
import { defaultSpellSeam, resetBorgCfg } from "./config.js";
import { borgWeaponSwap } from "./weapon-swap.js";
import { TV } from "../item/svals.js";
afterEach(resetBorgCfg);

function item(p: Partial<ItemView> = {}): ItemView {
  return { handle: 1, kindKey: "kind:0", nameColor: "", label: "known test sword", aware: true,
    tval: TV.SWORD, sval: 1, pval: 0, number: 1, weight: 100, ac: 0,
    toA: 0, toH: 0, toD: 0, dd: 2, ds: 6, ego: false, artifact: false,
    flags: [], modifiers: [], brands: [], slays: [], resists: [], curses: [],
    egoName: null, artifactName: null, activation: false, timeout: 0,
    inscription: null, value: 1000, ...p };
}
function context(): BorgContext {
  const ctx: BorgContext = { view: makeScenarioView(), world: new BorgWorld(),
    act: makeFakeActions(), rng: makeBorgRng(1) };
  const t = new Array<number>(BI_MAX).fill(0);
  t[BI.MAXDEPTH] = 60; t[BI.BLOWS] = 2; t[BI.TOHIT] = 3; t[BI.TODAM] = 4;
  ctx.world.self.trait = t;
  return ctx;
}
it("retains the C no-useful-backup sentinel and usefulness threshold", () => {
  const ctx = context();
  expect(borgWeaponSwap(ctx, {}, [])).toEqual({handle:null,value:-1});
  expect(borgWeaponSwap(ctx, {}, [item({dd:0,ds:0,toH:0,toD:0})])).toEqual({handle:null,value:-1});
  // -1 + (2*6*25)*(2+1) + 3*100 + 4*75 =1499.
  expect(borgWeaponSwap(ctx, {}, [item()])).toEqual({handle:1,value:1499});
});
it("keeps later carried-pack ties as C does, independently of strict HOME improvement", () => {
  expect(borgWeaponSwap(context(), {}, [item(),item({handle:2})]).handle).toBe(2);
});
it("uses the C electric-brand multiplier only when the current weapon lacks it", () => {
  const ctx = context(), sword = item({brands:["ELEC_3"]});
  expect(borgWeaponSwap(ctx, {}, [sword]).value).toBe(5999); //1499 +300*3*2*5/2.
  ctx.world.self.trait[BI.WB_ELEC] = 1;
  expect(borgWeaponSwap(ctx, {}, [sword]).value).toBe(1499);
});
it("adds the named nether score at depth54 and removes it when already covered", () => {
  const ctx = context(), sword = item({resists:[{element:"NETHER",level:1}]});
  ctx.world.self.trait[BI.MAXDEPTH] = 54;
  expect(borgWeaponSwap(ctx, {}, [sword]).value).toBe(106999); //1499+5500+100000.
  ctx.world.self.trait[BI.RNTHR] = 1;
  expect(borgWeaponSwap(ctx, {}, [sword]).value).toBe(1499);
});
it("retains the exact aggravation and named bad-curse/removability penalties", () => {
  const ctx = context(), clean = item({resists:[{element:"NETHER",level:1}]});
  const cursed = {...clean,curses:["teleportation"]};
  expect(borgWeaponSwap(ctx, {}, [{...clean,flags:["AGGRAVATE"]}]).value).toBe(98999);
  expect(borgWeaponSwap(ctx, {weaponSwap:{uncursable:()=>true}}, [cursed]).value).toBe(1999);
  expect(borgWeaponSwap(ctx, {weaponSwap:{uncursable:()=>false}}, [cursed]).value).toBe(6999);
  // Production has no public per-instance curse-power producer: do not infer it.
  expect(borgWeaponSwap(ctx, {}, [cursed])).toEqual({handle:null,value:-1});
  expect(borgWeaponSwap(ctx, {weaponSwap:{uncursable:()=>true}}, [clean]).value).toBe(106999);
});
it("does not add an invented fear reward absent from C's populated weapon fields", () => {
  expect(borgWeaponSwap(context(), {}, [item({flags:["PROT_FEAR"]})]).value).toBe(1499);
});
it("honours a publicly supplied known Tarrasque death without a hidden lookup", () => {
  const ctx = context(), sword = item({resists:[{element:"COLD",level:3}]});
  ctx.world.self.trait[BI.MAXDEPTH] = 75;
  const alive = borgWeaponSwap(ctx, {}, [sword]).value;
  expect(alive - borgWeaponSwap(ctx,{weaponSwap:{tarrasqueDead:true}},[sword]).value).toBe(90000);
});
it("keeps the low-depth digger exception but rejects worthless or cursed diggers", () => {
  const ctx = context(), digger = item({tval:TV.DIGGING,pval:2,dd:1,ds:2,flags:["DIG_1"]});
  ctx.world.self.trait[BI.MAXDEPTH] = 30;
  expect(borgWeaponSwap(ctx,{cfg:{usesSwaps:false}},[digger]).value).toBe(8749);
  expect(borgWeaponSwap(ctx,{},[{...digger,value:0}]).handle).toBeNull();
  expect(borgWeaponSwap(ctx,{weaponSwap:{uncursable:()=>true}},[{...digger,curses:["teleportation"]}]).handle).toBeNull();
});
it("stops rewarding a digger when stone-to-mud is legal or one is already wielded", () => {
  const ctx = context(), digger = item({tval:TV.DIGGING,pval:2,dd:1,ds:2,flags:["DIG_1"]});
  ctx.world.self.trait[BI.MAXDEPTH] = 30;
  const spells = {...defaultSpellSeam(),spellLegalFail:(name:string)=>name==="TURN_STONE_TO_MUD"};
  expect(borgWeaponSwap(ctx,{spells},[digger]).handle).toBeNull();
  ctx.view={...ctx.view,equipment:()=>[digger]};
  expect(borgWeaponSwap(ctx,{},[digger]).handle).toBeNull();
});

it("does not treat a quivered throwing weapon as a carried-pack backup", () => {
 const ctx=context(), sword=item();
 ctx.view={...ctx.view,quiver:()=>[sword]};
 expect(borgWeaponSwap(ctx,{},[sword])).toEqual({handle:null,value:-1});
});
