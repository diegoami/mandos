import { beforeAll, afterEach, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import * as Core from "@rpgm-tools/neo-angband-core";
import type { AgentView, ItemView, StoreView } from "@rpgm-tools/neo-angband-core";
import type { KnownItem } from "@rpgm-tools/neo-angband-mod-sdk";
import { itemAnalyzer, type ItemAnalyzer } from "../api2/records.js";
import { itemView } from "../api2/world.js";
import { makeScenarioView, makeFakeActions } from "../harness.js";
import { BorgWorld } from "../world/model.js";
import { borgNotice } from "../trait/trait.js";
import { borgPower } from "../trait/power.js";
import { perceive, makePerceiveMemo } from "../perceive.js";
import { makeBorgRng } from "../rng.js";
import { makeCoreResolvers } from "../resolvers.js";
import { buildThinkSession, buildStoreDeps, primeSession } from "../think-session.js";
import { borgThinkHomeBuySwapWeapon, borgThinkShopBuy } from "../store/buy.js";
import { borgUsesSwaps, borgInventoryFull, isAware, isIdent } from "../store/store.js";
import { BI } from "../trait/trait-index.js";
import { TV } from "../item/svals.js";
import type { BorgContext } from "../context.js";
import { resetBorgCfg, setBorgCfg } from "../trait/config.js";
import { getDerived } from "../trait/state.js";
afterEach(resetBorgCfg);
const root=dirname(createRequire(import.meta.url).resolve("@rpgm-tools/neo-angband-content/pack/constants.json"));
const rec=(name:string)=>JSON.parse(readFileSync(join(root,name+".json"),"utf8")).records;
let analyze:ItemAnalyzer;

beforeAll(async()=>{analyze=await itemAnalyzer({content:{records:async(name:string)=>({ok:true,value:rec(name)})}} as never);});

function loadPack(): Core.GamePack {
 const json=(name:string)=>JSON.parse(readFileSync(join(root,name+".json"),"utf8"));
 return {
  constants:json("constants"),terrain:rec("terrain"),roomTemplates:rec("room_template"),vaults:rec("vault"),
  dungeonProfiles:rec("dungeon_profile"),projection:rec("projection"),trap:rec("trap"),names:rec("names"),quest:rec("quest"),store:rec("store"),
  obj:Object.fromEntries(Object.entries({objectBase:"object_base",object:"object",egoItem:"ego_item",artifact:"artifact",curse:"curse",brand:"brand",slay:"slay",activation:"activation",objectProperty:"object_property",flavor:"flavor"}).map(([key,file])=>[key,json(file)])),
  mon:Object.fromEntries(Object.entries({pain:"pain",blowMethods:"blow_methods",blowEffects:"blow_effects",monsterSpells:"monster_spell",monsterBases:"monster_base",monsters:"monster",summons:"summon",pits:"pit"}).map(([key,file])=>[key,rec(file)])),
  player:Object.fromEntries(Object.entries({races:"p_race",classes:"class",properties:"player_property",timed:"player_timed",shapes:"shape",bodies:"body",history:"history",realms:"realm"}).map(([key,file])=>[key,rec(file)])),
 } as Core.GamePack;
}

type ObjectFixture={artifact?:string;kind?:string;toH?:number;toD?:number;toA?:number;curse?:boolean};
const snapshots=new Map<string,KnownItem>();
function knownObject(spec:ObjectFixture,handle:number):KnownItem {
 const key=JSON.stringify(spec);
 let known=snapshots.get(key);
 if(!known){
  // Disposable fixture construction only: the decision code sees ONLY the
  // real engine's public KnownItem, never the live object or hidden state.
  const game=Core.startGame(loadPack(),{seed:441,depth:0,raceName:"Human",className:"Warrior"});
  const {state}=game,reg=game.booted.registries.objects,z=game.booted.registries.constants;
  const art=spec.artifact?reg.artifacts.find(a=>a?.name===spec.artifact):null;
  const kind=art?reg.lookupKind(art.tval,art.sval):reg.kinds.find(k=>k.name===spec.kind);
  expect(kind).toBeDefined();
  const obj=Core.objectPrep(state.rng,reg,z,kind!,60,"maximise");
  if(art){obj.artifact=art;Core.copyArtifactData(state.rng,reg,obj,art);}
  if(spec.toH!==undefined)obj.toH=spec.toH;
  if(spec.toD!==undefined)obj.toD=spec.toD;
  if(spec.toA!==undefined)obj.toA=spec.toA;
  if(spec.curse){
   const curse=reg.curses.find(c=>c?.name==="teleportation")!;
   expect(curse).toBeDefined();
   Core.appendObjectCurse(state.rng,obj,reg.curses.indexOf(curse),50,reg.curses);
  }
  obj.number=1;obj.notice|=Core.OBJ_NOTICE.ASSESSED;
  Core.playerLearnAllRunes(state.actor.player,state.runeEnv);
  const gear=state.gear!,stored=Core.gearAdd(gear,obj);gear.pack.push(stored);
  state.actor.player.upkeep.totalWeight=Core.gearTotalWeight(gear);
  const view=Core.buildKnownWorld(state,{reg}).inventory!.find(item=>item.handle===stored)!;
  expect(view).toBeDefined();
  expect(view.kindKey).toBe(`kind:${kind!.kidx}`);
  expect(view.tval).toBe(kind!.tval);expect(view.sval).toBe(kind!.sval);
  expect(view.dd).toBe(obj.dd);expect(view.ds).toBe(obj.ds);
  expect(view.artifact).toBe(!!art);expect(view.artifactName).toBe(art?.name??null);
  if(art)expect(view.artifactId).toBe(art.aidx);
  expect(view.aware).toBe(true);expect(view.unknownRunes).toBe(false);
  expect(view.curses).toEqual(spec.curse?["teleportation"]:[]);
  known=view;snapshots.set(key,known);
 }
 const {itemKey:_oldKey,...rest}=known;
 return {...rest,handle,carried:handle!==0,...(handle>0?{itemKey:`gear:${handle}`}:{})};
}
function weapon(name:string,handle:number):ItemView {
 return itemView(knownObject({artifact:name},handle),analyze);
}
function normalKnownWeapon(handle:number,strong=true):KnownItem {
 return knownObject({kind:"& Bastard Sword~",toH:strong?10:0,toD:strong?10:0},handle);
}
function normalWeapon(handle:number,strong=true):ItemView {
 return itemView(normalKnownWeapon(handle,strong),analyze);
}
function scene({carry=false,home=true,maxDepth=60,usesSwaps=true,pack=[] as ItemView[],candidatePatch={} as Partial<ItemView>,candidateSource=undefined as KnownItem|undefined,cursed=false,loadout=true,full=false}={}){
 setBorgCfg({usesSwaps});
 const main=weapon("of Pain",1);
 const source=candidateSource??knownObject({artifact:"of Éowyn",...(cursed?{curse:true}:{})},carry?2:0);
 // Deliberate malformed-knowledge guard overrides are isolated below; all
 // ordinary identity/known fields originate in the actual public adapter.
 const candidate=itemView({...source,...candidatePatch} as KnownItem,analyze);
 const inventory=carry?[...pack,candidate]:[...pack];
 if(full) while(inventory.length<23) {
  const n=inventory.length;
  inventory.push(itemView(knownObject({kind:"Chain Mail~",toA:n},100+n),analyze));
 }
 const base=makeScenarioView({player:{cls:"Warrior",race:"Human",depth:0,maxDepth,level:40,maxLevel:40,hp:500,maxHp:500,sp:0,maxSp:0,stats:[118,118,118,118,118],blows:400,toHit:20,toDam:10,light:2,grid:{x:10,y:10}}});
 const shops=Array.from({length:8},(_,feat):StoreView=>({feat,featName:feat===7?"Your Home":"shop",isHome:feat===7,owner:{name:"keeper",purse:30000},stock:feat===7&&home&&!carry?[{...candidate,index:0}]:[]}));
 const equip=Array<ItemView|null>(12).fill(null);equip[0]=main;
 const view:AgentView={...base,inventory:()=>inventory,equipment:()=>equip,stores:()=>shops};
 const ctx:BorgContext={view,world:new BorgWorld(),act:makeFakeActions(),rng:makeBorgRng(1)};
 borgNotice(ctx);perceive(ctx.world,view,makePerceiveMemo());borgPower(ctx);
 ctx.world.self.goal.shop=-1;ctx.world.self.goal.ware=-1;ctx.world.self.goal.item=-1;ctx.world.self.goal.doBest=false;
 let queries=0;
 const resolvers=makeCoreResolvers({}),original=resolvers.loadoutPower!;
 resolvers.loadoutPower=(c,change)=>{queries++;return original(c,change);};
 const session=buildThinkSession(loadout?resolvers:{});primeSession(session,ctx);
 const deps={...buildStoreDeps(session),usesSwaps};
 return{ctx,deps,candidate,queries:()=>queries};
}

// C4.2.6/current e473720: borg-trait-swap.c:158-612 and
// borg-store-buy.c:953-1060. No positive evaluator or hidden data is injected.
it("retrieves the registered known Nether backup through production HOME deps", () => {
 const s=scene();
 expect(isAware(s.candidate,s.deps)).toBe(true);
 expect(isIdent(s.candidate,s.deps)).toBe(true);
 expect(s.ctx.world.self.trait[BI.RNTHR]).toBe(0);
 expect(borgThinkHomeBuySwapWeapon(s.ctx,s.deps)).toBe(true);
 expect(borgThinkShopBuy(s.ctx,7,s.deps)).toMatchObject({code:"shop-buy",args:{index:0}});
 expect(s.queries()).toBe(0);
});
it("includes the carried backup value instead of treating it as dead weight", () => {
 const baseline=scene({home:false}),carried=scene({carry:true,home:false});
 expect(carried.ctx.world.self.power-baseline.ctx.world.self.power).toBeGreaterThan(100000);
});
it("selects a backup handle during normal notice, without wearing it", () => {
 const s=scene({carry:true});
 const swap=(getDerived(s.ctx.world) as {weaponSwap?:{handle:number|null;value:number}}).weaponSwap;
 expect(swap?.handle).toBe(2);
 expect(swap?.value).toBeGreaterThan(100000);
 expect(s.ctx.view.equipment()[0]?.artifactName).toBe("of Pain");
});
it("does not require the ordinary loadout evaluator to value carried backups", () => {
 const s=scene({loadout:false});
 expect(borgThinkHomeBuySwapWeapon(s.ctx,s.deps)).toBe(true);
});
it("requires strict improvement over the existing backup, with no equal-value tiebreak", () => {
 const carried=normalWeapon(2),s=scene({pack:[carried],candidateSource:normalKnownWeapon(0)});
 const before=s.ctx.world.self.power;
 expect(borgThinkHomeBuySwapWeapon(s.ctx,s.deps)).toBe(false);
 expect(s.ctx.world.self.goal.shop).toBe(-1);
 expect(s.ctx.world.self.power).toBe(before);
 expect(s.ctx.view.inventory()).toEqual([carried]);
});
it("rejects a weaker candidate than the existing backup", () => {
 const s=scene({pack:[normalWeapon(2)],candidateSource:normalKnownWeapon(0,false)});
 expect(borgThinkHomeBuySwapWeapon(s.ctx,s.deps)).toBe(false);
});
it("does not infer missing awareness in a malformed public-knowledge contract", () => {
 const s=scene({candidatePatch:{aware:false}});
 expect(borgThinkHomeBuySwapWeapon(s.ctx,s.deps)).toBe(false);
});
it("does not invent curse removability from names alone", () => {
 const s=scene({cursed:true});
 expect(borgThinkHomeBuySwapWeapon(s.ctx,s.deps)).toBe(false);
});
it("rejects an empty HOME", () => {
 const s=scene({home:false});
 expect(borgThinkHomeBuySwapWeapon(s.ctx,s.deps)).toBe(false);
});
it("rejects non-weapon wares even when they have valuable resistances", () => {
 const s=scene({candidateSource:knownObject({artifact:"'Colluin'"},0)});
 expect(borgThinkHomeBuySwapWeapon(s.ctx,s.deps)).toBe(false);
});
it.each([49,90])("keeps the ordinary weapon depth gate at maxdepth %i", maxDepth=>{
 const s=scene({maxDepth});
 expect(borgThinkHomeBuySwapWeapon(s.ctx,s.deps)).toBe(false);
});
it("respects the user's disabled swap option", () => {
 const s=scene({usesSwaps:false});
 expect(borgThinkHomeBuySwapWeapon(s.ctx,s.deps)).toBe(false);
});
it("requires an empty pack slot when there is no existing backup", () => {
 const s=scene({full:true});
 expect(borgInventoryFull(s.ctx,s.deps)).toBe(true);
 expect(borgThinkHomeBuySwapWeapon(s.ctx,s.deps)).toBe(false);
});

it("keeps HOME evaluation on the same explicit public knowledge profile as notice", () => {
 const s=scene({cursed:true});
 const opts={weaponSwap:{uncursable:()=>true}};
 borgNotice(s.ctx,opts);borgPower(s.ctx,opts);
 // This control supplies missing curse knowledge, never a positive evaluator.
 expect(borgThinkHomeBuySwapWeapon(s.ctx,s.deps)).toBe(true);
});
it("does not mix an explicitly disabled notice profile with active default settings", () => {
 const s=scene();
 borgNotice(s.ctx,{cfg:{usesSwaps:false}});borgPower(s.ctx);
 expect(borgThinkHomeBuySwapWeapon(s.ctx,s.deps)).toBe(false);
});
it("does not repeatedly attempt impossible full-pack retrieval with an existing backup", () => {
 const s=scene({full:true,pack:[normalWeapon(2)]});
 expect(borgInventoryFull(s.ctx,s.deps)).toBe(true);
 expect(getDerived(s.ctx.world).weaponSwap?.handle).toBe(2);
 for(let attempt=0;attempt<3;attempt++) {
  expect(borgThinkHomeBuySwapWeapon(s.ctx,s.deps)).toBe(false);
  expect(s.ctx.world.self.goal.shop).toBe(-1);
  expect(s.ctx.world.self.goal.ware).toBe(-1);
 }
});
