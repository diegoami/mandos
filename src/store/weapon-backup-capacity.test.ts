/** The conservative HOME gate prevents a real zero-energy no-room refusal. */
import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { startGame, objectPrep, gearAdd, gearTotalWeight, packSlotsUsed, FEAT } from "@rpgm-tools/neo-angband-core";
import type { GamePack } from "@rpgm-tools/neo-angband-core";

function loadPack(): GamePack {
  const root = dirname(createRequire(import.meta.url).resolve("@rpgm-tools/neo-angband-content/pack/constants.json"));
  const json = (name: string) => JSON.parse(readFileSync(join(root, `${name}.json`), "utf8"));
  const records = (name: string) => json(name).records;
  return {
    constants: json("constants"), terrain: records("terrain"), roomTemplates: records("room_template"),
    vaults: records("vault"), dungeonProfiles: records("dungeon_profile"), projection: records("projection"),
    trap: records("trap"), names: records("names"), quest: records("quest"), store: records("store"),
    obj: Object.fromEntries(Object.entries({objectBase:"object_base",object:"object",egoItem:"ego_item",artifact:"artifact",curse:"curse",brand:"brand",slay:"slay",activation:"activation",objectProperty:"object_property",flavor:"flavor"}).map(([key,file])=>[key,json(file)])),
    mon: Object.fromEntries(Object.entries({pain:"pain",blowMethods:"blow_methods",blowEffects:"blow_effects",monsterSpells:"monster_spell",monsterBases:"monster_base",monsters:"monster",summons:"summon",pits:"pit"}).map(([key,file])=>[key,records(file)])),
    player: Object.fromEntries(Object.entries({races:"p_race",classes:"class",properties:"player_property",timed:"player_timed",shapes:"shape",bodies:"body",history:"history",realms:"realm"}).map(([key,file])=>[key,records(file)])),
  } as GamePack;
}
it("the real HOME shop-buy refuses a full pack without energy or an atomic replacement", () => {
  // Disposable legal engine fixture only. The Borg never reads these live objects.
  const game=startGame(loadPack(),{seed:441,depth:0,raceName:"Human",className:"Warrior"});
  const {state}=game,gear=state.gear!,reg=game.booted.registries.objects,z=game.booted.registries.constants;
  const mail=reg.kinds.find(kind=>kind.name==="Chain Mail~")!;
  const sword=reg.kinds.find(kind=>kind.name==="& Bastard Sword~")!;
  expect(mail).toBeDefined();expect(sword).toBeDefined();
  for(const handle of gear.pack)gear.store.delete(handle);
  gear.pack=[];gear.quiver=[];
  for(let n=0;n<z.packSize;n++){
    const item=objectPrep(state.rng,reg,z,mail,60,"maximise");
    item.number=1;item.toA=n;
    gear.pack.push(gearAdd(gear,item));
  }
  gear.inven=[...gear.pack];
  state.actor.player.upkeep.totalWeight=gearTotalWeight(gear);
  const actualHome=state.stores!.find(store=>store.feat===FEAT.HOME)!;
  expect(actualHome).toBeDefined();
  const ware=objectPrep(state.rng,reg,z,sword,60,"maximise");ware.number=1;
  actualHome.stock=[ware];
  state.chunk.setFeat(state.actor.grid,actualHome.feat);
  expect(packSlotsUsed(gear,z)).toBe(z.packSize);
  expect(game.buy(actualHome,ware,1)).toMatchObject({ok:false,failure:"no-room"});
  const messages:string[]=[];state.msg=text=>messages.push(text);
  const before=[...gear.pack],turn=state.turn;
  const energy=game.registry.get("shop-buy")!(state,{code:"shop-buy",args:{index:0}});
  expect(energy).toBe(0);
  expect(messages).toContain("You cannot carry that many items.");
  expect(gear.pack).toEqual(before);expect(actualHome.stock).toEqual([ware]);
  expect(state.turn).toBe(turn);
  // A real free slot makes the same registered HOME transaction succeed.
  // This only adjusts the disposable fixture; no Borg drop tactic is added.
  const removed=gear.pack.pop()!;gear.store.delete(removed);gear.inven=[...gear.pack];
  state.actor.player.upkeep.totalWeight=gearTotalWeight(gear);
  messages.length=0;
  expect(game.registry.get("shop-buy")!(state,{code:"shop-buy",args:{index:0}})).toBe(0);
  expect(actualHome.stock).toHaveLength(0);
  expect(gear.pack).toHaveLength(z.packSize);
  expect(messages.some(text=>text.startsWith("You have "))).toBe(true);
});
