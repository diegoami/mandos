/** Source50: registered public loadout inspection and real headless command contracts, not natural lives. */
import { afterEach,beforeAll,expect,it } from "vitest";
import * as Core from "@rpgm-tools/neo-angband-core";
import type { ItemView,AgentView } from "@rpgm-tools/neo-angband-core";
import { registeredPack,type RegisteredItemSpec,records } from "../../test/fixtures/registered-items.js";
import { simulationView,itemView } from "../api2/world.js";
import { createBridge } from "../api2/host.js";
import { fakeGame } from "../harness-api2.js";
import { makeCoreResolvers } from "../resolvers.js";
import { Spell,borgGetSpellNumber,borgSpellLegalFail } from "./magic.js";
import type { KnownWorldData } from "@rpgm-tools/neo-angband-mod-sdk";
import { itemAnalyzer,type ItemAnalyzer } from "../api2/records.js";
import { makeFakeActions } from "../harness.js";
import { BorgWorld } from "../world/model.js";
import type { BorgContext } from "../context.js";
import { makeBorgRng } from "../rng.js";
import { perceive,makePerceiveMemo } from "../perceive.js";
import { borgNotice } from "../trait/trait.js";
import { getDerived } from "../trait/state.js";
import { borgSimulateDangerAnswer } from "../trait/simulate.js";
import { getDangerGlobals } from "../danger/index.js";
import { getDangerState } from "../danger/state.js";
import { resetBorgCfg } from "../trait/config.js";
import { BI } from "../trait/trait-index.js";
import { borgBackupSwap } from "./item-wear.js";
let analyze:ItemAnalyzer;
beforeAll(async()=>{analyze=await itemAnalyzer({content:{records:async(name:string)=>({ok:true,value:records(name)})}} as never);});
afterEach(resetBorgCfg);
const safe=(danger:number)=>({danger,traits:{rconf:1,rblind:1,rlite:0,rdark:0,fract:1,sav:100}});
function fixture() {
  const game=Core.startGame(registeredPack(),{seed:441,depth:1,raceName:"Human",className:"Warrior"});
  const {state}=game,gear=state.gear!,reg=game.booted.registries.objects,z=game.booted.registries.constants;
  function add(spec:RegisteredItemSpec,number=1) {
    const art=spec.artifact?reg.artifacts.find(a=>a?.name===spec.artifact):undefined;
    if(spec.artifact&&!art)throw Error("missing registered artifact:"+spec.artifact);
    const kind=art?reg.lookupKind(art.tval,art.sval):reg.kinds.find(k=>k.name===spec.kind);
    if(!kind)throw Error("missing registered kind:"+spec.kind);
    const obj=Core.objectPrep(state.rng,reg,z,kind,60,"maximise");
    if(art){obj.artifact=art;Core.copyArtifactData(state.rng,reg,obj,art);}
    obj.number=number;obj.notice|=Core.OBJ_NOTICE.ASSESSED;
    if(spec.toA!==undefined)obj.toA=spec.toA;
    game.flavor.objectFlavorAware(kind,state.flavorAwareDeps??Core.NOOP_FLAVOR_AWARE_DEPS);
    Core.playerLearnAllRunes(state.actor.player,state.runeEnv);
    const handle=Core.gearAdd(gear,obj);gear.pack.push(handle);gear.inven=[...gear.pack];
    state.actor.player.upkeep.totalWeight=Core.gearTotalWeight(gear);return handle;
  }
  const dispatch=(handle:number)=>game.registry.get("wield")!(state,{code:"wield",args:{handle}});
  const main=add({artifact:"of Pain"});expect(dispatch(main)).toBe(z.moveEnergy);
  // Disposable fixture staging, never a Borg drop policy: retain worn gear, clear starting pack.
  for(const h of gear.pack)gear.store.delete(h);gear.pack=[];gear.inven=[];gear.quiver=[];
  state.actor.player.upkeep.totalWeight=Core.gearTotalWeight(gear);
  const deps={reg,describe:(obj:Core.GameObject)=>Core.describeObject(state,obj,Core.ODESC.PREFIX|Core.ODESC.FULL)};
  function simulation(change:Parameters<typeof Core.simulateLoadout>[1]={}) {
    const sim=Core.simulateLoadout(state,change,{viewDeps:deps});if(!sim)throw Error("registered loadout refused");
    const known=Core.knownLoadoutSimulation(state,sim);expect(known.unresolved).toEqual([]);
    return {known,frame:simulationView(new Map())({...known,unresolved:[]})};
  }
  function context() {
    const {known,frame}=simulation();
    // Only selection depth is a MODEL policy input; player-derived combat stats and actual handles are not remapped.
    const player={...frame.after.player,maxDepth:60};
    const base=Core.createAgentView(state,undefined,deps);
    const view:AgentView={...base,player:()=>player,inventory:()=>known.after.inventory.map(item=>itemView(item,analyze)),
      equipment:()=>known.after.equipment.map(item=>item?itemView(item,analyze):null),simulateLoadout:change=>simulation(change).frame};
    const ctx:BorgContext={view,world:new BorgWorld(),act:makeFakeActions(),rng:makeBorgRng(1)};
    borgNotice(ctx);perceive(ctx.world,view,makePerceiveMemo());ctx.world.self.c={...player.grid};getDangerGlobals(ctx.world).avoidance=100;return ctx;
  }
  function fill() {while(gear.pack.length<z.packSize)add({kind:"Chain Mail~",toA:gear.pack.length});expect(Core.packSlotsUsed(gear,z)).toBe(z.packSize);}
  return {game,state,gear,reg,z,add,dispatch,simulation,context,fill,main};
}
it("emits a real positive gear handle and the ordinary command wears exactly that known weapon",()=>{
  const f=fixture(),weapon=f.add({artifact:"of Éowyn"}),armour=f.add({artifact:"'Dal-i-thalion'"});const ctx=f.context();
  expect(getDerived(ctx.world).weaponSwap.handle).toBe(weapon);expect(getDerived(ctx.world).armourSwap.handle).toBe(armour);
  expect(ctx.view.inventory().find(i=>i.handle===weapon)?.artifactName).toBe("of Éowyn");expect(weapon).toBeGreaterThan(0);
  const cmd=borgBackupSwap(ctx,50,{randarts:false,backupEval:item=>safe(item.handle===armour?10:40)});
  expect(cmd).toEqual({code:"wield",args:{handle:weapon}});const turn=f.state.turn;
  expect(f.game.registry.get("wield")!(f.state,cmd!)).toBe(f.z.moveEnergy);
  expect(f.state.actor.player.equipment[0]).toBe(weapon);expect(f.gear.store.get(weapon)?.number).toBe(1);
  expect(f.gear.pack).toContain(f.main);expect(f.state.turn).toBe(turn); // Handler returns energy; scheduler turns are not advanced here.
});
it("keeps a full pack legal for a one-unit backup because wearing it frees its own slot",()=>{
  const f=fixture(),weapon=f.add({artifact:"of Éowyn"});f.fill();const ctx=f.context();expect(getDerived(ctx.world).weaponSwap.handle).toBe(weapon);
  const messages:string[]=[];f.state.msg=message=>messages.push(message);
  const cmd=borgBackupSwap(ctx,50,{randarts:false,backupEval:()=>safe(20)});expect(cmd).toEqual({code:"wield",args:{handle:weapon}});
  expect(f.game.registry.get("wield")!(f.state,cmd!)).toBe(f.z.moveEnergy);expect(f.state.actor.player.equipment[0]).toBe(weapon);
  expect(messages).not.toContain("Your pack overflows!");
  expect(Core.packSlotsUsed(f.gear,f.z)).toBe(f.z.packSize);expect(f.gear.pack).toContain(f.main);
});
it("lets Core split a nonartifact stack and own overflow without emitting a drop strategy",()=>{
  const f=fixture(),weapon=f.add({kind:"& Blade~ of Chaos"},2);f.fill();const ctx=f.context();expect(getDerived(ctx.world).weaponSwap.handle).toBe(weapon);
  const messages:string[]=[];f.state.msg=message=>messages.push(message);
  const cmd=borgBackupSwap(ctx,50,{randarts:false,backupEval:()=>safe(20)});expect(cmd).toEqual({code:"wield",args:{handle:weapon}});
  expect(f.game.registry.get("wield")!(f.state,cmd!)).toBe(f.z.moveEnergy);
  const worn=f.state.actor.player.equipment[0]!;expect(worn).not.toBe(weapon);expect(f.gear.store.get(worn)?.number).toBe(1);
  expect(Core.packSlotsUsed(f.gear,f.z)).toBeLessThanOrEqual(f.z.packSize);
  expect(messages).toContain("Your pack overflows!");expect(messages.some(m=>m.startsWith("You drop "))).toBe(true);
  const inventory=Core.buildKnownWorld(f.state,{reg:f.reg}).inventory!;
  expect(inventory.find(i=>i.handle===weapon)?.number).toBe(1);
  expect(f.gear.pack).not.toContain(f.main);expect(inventory.some(i=>i.handle===f.main)).toBe(false);
  // Optional floor-conservation visibility is retained as a diagnostic artifact, not a CI claim.

});
it.each([false,true])("preserves generic ring placement with both-full=%s",both=>{
  const f=fixture(),first=f.add({artifact:"'Nenya'"});expect(f.dispatch(first)).toBe(f.z.moveEnergy);expect(f.state.actor.player.equipment[2]).toBe(first);
  let second:number|undefined;if(both){second=f.add({artifact:"'Vilya'"});expect(f.dispatch(second)).toBe(f.z.moveEnergy);expect(f.state.actor.player.equipment[3]).toBe(second);}
  const ring=f.add({artifact:"'Narya'"}),ctx=f.context(),seen:number[]=[];expect(getDerived(ctx.world).armourSwap.handle).toBe(ring);
  const cmd=borgBackupSwap(ctx,50,{randarts:false,backupEval:(_item,slot)=>{seen.push(slot);return safe(20);}});
  expect(seen).toEqual([3]);expect(cmd).toEqual({code:"wield",args:{handle:ring}}); // Original C models LEFT, emits the ordinary command.
  expect(f.game.registry.get("wield")!(f.state,cmd!)).toBe(f.z.moveEnergy);
  expect(f.state.actor.player.equipment[both?2:3]).toBe(ring);if(both)expect(f.state.actor.player.equipment[3]).toBe(second);
  // Pinned C item.h134–135 + messages-react149–156 likewise emit equipment 'c'/2 when both rings are full.
});
it("returns post-Notice critical traits from the actual known hypothetical gear and leaves live state untouched",()=>{
  const f=fixture(),armour=f.add({artifact:"'Dal-i-thalion'"}),ctx=f.context();
  const d=getDerived(ctx.world),traits=[...ctx.world.self.trait],pack=[...f.gear.pack],equipment=[...f.state.actor.player.equipment];
  const globals=getDangerState(ctx.world).globals;globals.tpOtherIndices=[17];const saved=[...globals.tpOtherIndices];
  expect(traits[BI.RCONF]).toBe(0);expect(traits[BI.FRACT]).toBe(0);expect(d.armourSwap.handle).toBe(armour);
  const answer=borgSimulateDangerAnswer(ctx,{wieldAt:[{item:{from:"gear",handle:armour},slot:11}]});
  expect(answer?.traits.rconf).toBe(1);expect(answer?.traits.fract).toBe(1);expect(answer?.danger).toBeGreaterThanOrEqual(0);
  expect(getDerived(ctx.world)).toBe(d);expect(ctx.world.self.trait).toEqual(traits);expect(globals.tpOtherIndices).toEqual(saved);
  expect(f.gear.pack).toEqual(pack);expect(f.state.actor.player.equipment).toEqual(equipment);expect(d.armourSwapCaps[BI.SRCONF]).toBe(true);
});

it("uses the production spell legality fallback from an actually learned registered book without opts.spells",async()=>{
  const game=Core.startGame(registeredPack(),{seed:441,depth:0,className:"Mage",rolledStats:[18,18,18,18,18,18]});
  const {state}=game,p=state.actor.player,reg=game.booted.registries.objects;
  // Same supported disposable caster setup used by magic-play.test.ts; no private spell flags or positive BI injection.
  state.turn=state.z.dayLength*5;state.updateBonuses?.();
  Core.playerExpGain(p,100000000,{rng:state.rng,onLevelChange:()=>state.updateBonuses?.()});
  Core.calcSpells(p,state.playerState!.statInd);p.csp=p.msp;p.chp=p.mhp;
  const source=Core.createAgentView(state).spellbooks(),spell=source.flatMap(b=>b.spells).find(s=>s.name==="Resistance");
  expect(spell).toBeDefined();const book=p.cls.magic.books[spell!.bidx]!;
  const kind=reg.lookupKind(book.tvalIdx,book.sval)!;expect(kind.name).toBe(book.name);
  const object=Core.objectPrep(state.rng,reg,game.booted.registries.constants,kind,p.lev,"average");
  game.flavor.objectFlavorAware(kind,state.flavorAwareDeps??Core.NOOP_FLAVOR_AWARE_DEPS);
  const handle=Core.invenCarry(state.gear!,p,object,game.booted.registries.constants);Core.calcInventory(state.gear!,game.booted.registries.constants);
  expect(handle).toBeGreaterThan(0);expect(game.registry.get("study")!(state,{code:"study",args:{handle,spell:spell!.sidx}})).toBeGreaterThan(0);
  const resolver=new Core.ContentIdResolver({objects:reg,playerRaces:game.players.races,playerClasses:game.players.classes});
  const mod=fakeGame({engine:{api:"1",core:Core}}).mod;
  mod.content.records=async name=>({ok:true,value:records(name)});
  mod.content.boundRecords=async()=>({ok:true,value:reg.kinds.map(k=>({key:k.name,name:k.name,index:k.kidx,tval:k.tval,owner:"core"}))});
  mod.view.world=async()=>({ok:true,value:Core.buildKnownWorld(state,{reg,resolver}) as KnownWorldData});
  const bridge=createBridge(mod);await bridge.prime();const resolvers=makeCoreResolvers(bridge.resolverInput());
  const view=(await bridge.readWorld())!.view;
  const ctx:BorgContext={view,world:new BorgWorld(),act:makeFakeActions(),rng:makeBorgRng(1),bookKind:resolvers.bookKind,spellEffect:resolvers.spellEffect};
  borgNotice(ctx);expect(borgGetSpellNumber(ctx,Spell.RESISTANCE)).toBe(spell!.sidx);
  expect(ctx.view.spellbooks().flatMap(b=>b.spells).find(s=>s.sidx===spell!.sidx)?.learned).toBe(true);
  expect(borgSpellLegalFail(ctx,Spell.RESISTANCE,15)).toBe(true);
  expect(ctx.world.self.trait[BI.RACID]).toBe(0);expect(ctx.world.self.trait[BI.SRACID]).toBe(1);
  // Only disposable fixture setup removes the book; the Borg receives no new drop policy.
  expect(game.registry.get("drop")!(state,{code:"drop",args:{handle,quantity:1}})).toBeGreaterThan(0);
  const noBook={...ctx,view:(await bridge.readWorld())!.view};borgNotice(noBook);
  expect(borgSpellLegalFail(noBook,Spell.RESISTANCE,15)).toBe(false);expect(noBook.world.self.trait[BI.SRACID]).toBe(0);
  await bridge.dispose();
});
