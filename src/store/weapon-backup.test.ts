import { beforeAll, afterEach, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
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
function weapon(name:string,handle:number):ItemView{
 const a=rec("artifact").find((x:any)=>x.name===name);
 const kind=rec("object").findIndex((x:any)=>x.name.replace(/^& /,"").replace(/~/g,"")===a["base-object"].sval);
 const dice=/^(\d+)d(\d+)$/.exec(a.attack.hd)!;
 const values=(a.values??[]).join("|").split("|").map((x:string)=>x.trim());
 const modifiers:any[]=[],resists:any[]=[];
 for(const value of values){const m=/^(\w+)\[(-?\d+)\]$/.exec(value);if(!m)continue;if(m[1]!.startsWith("RES_"))resists.push({element:m[1]!.slice(4),level:Number(m[2])});else modifiers.push({code:m[1],value:Number(m[2])});}
 return itemView({handle,kindKey:`kind:${kind}`,aware:true,nameColor:"",label:`known ${a['base-object'].sval} ${name}`,baseName:a['base-object'].sval,carried:handle!==0,tval:a['base-object'].tval==='sword'?TV.SWORD:TV.POLEARM,sval:1,pval:0,number:1,weight:a.weight,ac:0,toA:0,toH:a.attack['to-h'],toD:a.attack['to-d'],dd:Number(dice[1]),ds:Number(dice[2]),ego:false,artifact:true,flags:(a.flags??[]).flatMap((x:string)=>x.split('|').map(y=>y.trim())),modifiers,brands:a.brand??[],slays:a.slay??[],resists,curses:[],egoName:null,artifactName:name,activation:false,charging:0,inscription:null,unknownRunes:false,value:a.cost} as KnownItem,analyze);
}
function scene({carry=false,home=true,maxDepth=60,usesSwaps=true,pack=[] as ItemView[],candidatePatch={} as Partial<ItemView>,loadout=true,full=false}={}){
 setBorgCfg({usesSwaps});
 const main=weapon("of Pain",1),candidate={...weapon("of Éowyn",carry?2:0),...candidatePatch};
 const inventory=carry?[...pack,candidate]:[...pack];
 if(full) while(inventory.length<23) {
   const n=inventory.length,kind=rec("object").findIndex((o:any)=>o.name==="Chain Mail~");
   // Legal distinct non-stacking known armour, no duplicated artifacts.
   inventory.push(itemView({handle:100+n,kindKey:`kind:${kind}`,aware:true,nameColor:"",label:`Chain Mail (+${n})`,baseName:"Chain Mail",carried:true,tval:TV.HARD_ARMOR,sval:4,pval:0,number:1,weight:220,ac:32,toA:n,toH:-2,toD:0,dd:1,ds:4,ego:false,artifact:false,flags:[],modifiers:[],brands:[],slays:[],resists:[],curses:[],egoName:null,artifactName:null,activation:false,charging:0,inscription:null,unknownRunes:false,value:750} as KnownItem,analyze));
 }
 const base=makeScenarioView({player:{cls:"Warrior",race:"Human",depth:0,maxDepth,level:40,maxLevel:40,hp:500,maxHp:500,sp:0,maxSp:0,stats:[118,118,118,118,118],blows:400,toHit:20,toDam:10,light:2,grid:{x:10,y:10}}});
 const shops=Array.from({length:8},(_,feat):StoreView=>({feat,featName:feat===7?"Your Home":"shop",isHome:feat===7,owner:{name:"keeper",purse:30000},stock:feat===7&&home?[{...candidate,index:0}]:[]}));
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
 const carried=weapon("of Éowyn",2),s=scene({pack:[carried]});
 const before=s.ctx.world.self.power;
 expect(borgThinkHomeBuySwapWeapon(s.ctx,s.deps)).toBe(false);
 expect(s.ctx.world.self.goal.shop).toBe(-1);
 expect(s.ctx.world.self.power).toBe(before);
 expect(s.ctx.view.inventory()).toEqual([carried]);
});
it("rejects a weaker candidate than the existing backup", () => {
 const s=scene({pack:[weapon("of Éowyn",2)],candidatePatch:{resists:[],toH:0,toD:0}});
 expect(borgThinkHomeBuySwapWeapon(s.ctx,s.deps)).toBe(false);
});
it("does not infer missing awareness", () => {
 const s=scene({candidatePatch:{aware:false}});
 expect(borgThinkHomeBuySwapWeapon(s.ctx,s.deps)).toBe(false);
});
it("does not invent curse removability from names alone", () => {
 const s=scene({candidatePatch:{curses:["teleportation"]}});
 expect(borgThinkHomeBuySwapWeapon(s.ctx,s.deps)).toBe(false);
});
it("rejects an empty HOME", () => {
 const s=scene({home:false});
 expect(borgThinkHomeBuySwapWeapon(s.ctx,s.deps)).toBe(false);
});
it("rejects non-weapon wares even when they have valuable resistances", () => {
 const s=scene({candidatePatch:{tval:TV.CLOAK}});
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
 const s=scene({candidatePatch:{curses:["teleportation"]}});
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
 const s=scene({full:true,pack:[weapon("of Pain",2)]});
 expect(borgInventoryFull(s.ctx,s.deps)).toBe(true);
 expect(getDerived(s.ctx.world).weaponSwap.handle).toBe(2);
 for(let attempt=0;attempt<3;attempt++) {
  expect(borgThinkHomeBuySwapWeapon(s.ctx,s.deps)).toBe(false);
  expect(s.ctx.world.self.goal.shop).toBe(-1);
  expect(s.ctx.world.self.goal.ware).toBe(-1);
 }
});
