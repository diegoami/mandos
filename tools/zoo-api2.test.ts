import { describe, expect, it } from "vitest";
import * as Core from "@rpgm-tools/neo-angband-core";
import type { Api2ModDefinition, JsonRecord } from "@rpgm-tools/neo-angband-mod-sdk";
import { createRequire } from "node:module";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import target from "../plugin.ts";
import { loadPack } from "./zoo-pack.js";
import { createZooApi2Host } from "./zoo-api2-host.js";
import { runApi2Session } from "./zoo-api2-session.js";
import { canonicalJson } from "./zoo-format.js";
const root=fileURLToPath(new URL('../',import.meta.url));
const packDir=dirname(createRequire(import.meta.url).resolve('@rpgm-tools/neo-angband-content/pack/constants.json'));
const pack=loadPack(packDir);
const manifest=JSON.parse(readFileSync(join(root,'manifest.json'),'utf8')).data as { capabilities:string[] };
const records=(file:string):JsonRecord[]=>JSON.parse(readFileSync(join(packDir,file+'.json'),'utf8')).records;
const create=()=>{const game=Core.startGame(pack,{seed:7,depth:0});const events:unknown[]=[];
  const host=createZooApi2Host(Core,game,records,{},manifest.capabilities,e=>events.push(e));return{game,host,events};};

describe('headless API2 host, exact pinned gate',()=>{
 it('refuses stale tokens and unknown commands using the real gate',async()=>{
  const {game,host,events}=create();try{await host.decide({api:'>=2 <3',controller:async mod=>{
   const stale={...Core.inputToken(game.state),revision:-1};
   expect(await mod.act.submit(stale,{kind:'command',command:{code:'hold'}})).toMatchObject({ok:false});
   expect(await mod.act.submit(Core.inputToken(game.state),{kind:'command',command:{code:'not-a-command'}})).toMatchObject({ok:false});
   expect(await mod.act.submit(Core.inputToken(game.state),{kind:'command',command:{code:'hold'}})).toMatchObject({ok:true});
  }});expect(host.pending).toBe(true);expect(events).toHaveLength(3);}finally{host.dispose();}
 });
 it('maps known monster IDs before gate and refreshes after a target',async()=>{
  const {game,host}=create();try{await host.decide({api:'>=2 <3',controller:async mod=>{
   const old=Core.inputToken(game.state);
   expect(await mod.act.submit(old,{kind:'target',midx:99999})).toMatchObject({ok:false});
   expect(await mod.act.submit(old,{kind:'target',x:game.state.actor.grid.x,y:game.state.actor.grid.y})).toMatchObject({ok:true});
   expect(Core.tokenIsCurrent(game.state,old)).toBe(false);
   expect(await mod.act.submit(old,{kind:'command',command:{code:'hold'}})).toMatchObject({ok:false});
   const fresh=await mod.view.input();if(!fresh.ok)throw Error('input unavailable');
   expect(await mod.act.submit(fresh.value.token,{kind:'command',command:{code:'hold'}})).toMatchObject({ok:true});
  }});}finally{host.dispose();}
 });
 it('translates a positive perceived KnownMonster ID that differs from midx',async()=>{
  // Same seeded dungeon/detection setup used by Core's own known-world tests.
  const game=Core.startGame(pack,{seed:4242,depth:10});
  const host=createZooApi2Host(Core,game,records,{},manifest.capabilities,()=>{});
  try{
   const live=game.state.monsters.filter((mon):mon is Core.Monster=>mon!=null);
   for(const mon of live)mon.mflag.off(Core.MFLAG.VISIBLE);
   const placed=live.filter(mon=>mon.midx>1).sort((a,b)=>b.midx-a.midx).flatMap(mon=>{
    const cells=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const at={x:mon.grid.x+dx,y:mon.grid.y+dy};
     if((dx||dy)&&game.state.chunk.inBoundsFully(at)&&Core.squareIsOpenLive(game.state,at)&&Core.projectable(game.state.chunk,at,mon.grid,Core.PROJECT.NONE,game.state.z.maxRange))cells.push({mon,at});}
    return cells;
   })[0];
   expect(placed,'public Core detection fixture has a legal projectable neighbor').toBeDefined();
   const mon=placed!.mon;game.state.actor.grid={...placed!.at};
   mon!.mflag.on(Core.MFLAG.VISIBLE);mon!.mflag.off(Core.MFLAG.CAMOUFLAGE);
   const known=Core.knownMonsters(game.state).find(known=>Core.knownMonsterMidx(game.state,known.id)===mon!.midx)!;
   expect(known.id).not.toBe(mon!.midx);
   await host.decide({api:'>=2 <3',controller:async mod=>{expect(await mod.act.submit(Core.inputToken(game.state),{kind:'target',midx:known.id})).toMatchObject({ok:true});}});
   expect(game.state.target.midx).toBe(mon!.midx);
   mon!.mflag.off(Core.MFLAG.VISIBLE);
   await host.decide({api:'>=2 <3',controller:async mod=>{expect(await mod.act.submit(Core.inputToken(game.state),{kind:'target',midx:known.id})).toMatchObject({ok:false});}});
  }finally{host.dispose();}
 });
 it('uses Core known world rather than a real-map view',async()=>{
  const {game,host}=create();try{const world=await host.mod.view.world();expect(world.ok).toBe(true);
   if(!world.ok)throw Error('no world');expect(world.value.player?.race).toBe(game.state.actor.player.race.name);
   expect(world.value.level?.cells.length).toBeLessThan(game.state.chunk.width*game.state.chunk.height);
  }finally{host.dispose();}
 });
 it('refuses unobserved floor and non-current store loadouts',async()=>{
  const {host}=create();try{
   expect(await host.mod.view.simulateLoadout({wieldAt:[{item:{from:'floor',x:0,y:0,index:0},slot:0}]})).toMatchObject({ok:false,message:'unobserved-item'});
   expect(await host.mod.view.simulateLoadout({wieldAt:[{item:{from:'store',store:0,index:0},slot:0}]})).toMatchObject({ok:false,message:'unobserved-item'});
   expect(await host.mod.view.simulateLoadout({})).toMatchObject({ok:true});
  }finally{host.dispose();}
 });
 it('observes only a current shop and executes registered buy/exit commands',async()=>{
  const {game,host}=create();try{
   const index=game.state.stores!.findIndex(store=>store.stock.some(obj=>obj.weight<100&&obj.number>0));
   expect(index).toBeGreaterThanOrEqual(0);const store=game.state.stores![index]!;
   const from={...game.state.actor.grid};let at:{x:number;y:number}|null=null;
   for(let y=1;y<game.state.chunk.height-1;y++)for(let x=1;x<game.state.chunk.width-1;x++)if(game.state.chunk.feat({x,y})===store.feat)at={x,y};
   expect(at).not.toBeNull();game.state.actor.grid={...at!};game.state.actor.player.au=100000;
   host.afterLoop(from);expect(host.input().phase).toBe('store');
   const ware=store.stock.findIndex(obj=>obj.weight<100&&obj.number>0);
   await host.decide({api:'>=2 <3',controller:async mod=>{expect(await mod.act.submit(Core.inputToken(game.state),{kind:'command',command:{code:'shop-buy',args:{index:ware,quantity:1}}})).toMatchObject({ok:true});}});
   let before=host.beforeLoop();Core.runGameLoop(game.state,game.registry);host.afterLoop(before);
   expect(game.state.actor.player.au).toBeLessThan(100000);
   await host.decide({api:'>=2 <3',controller:async mod=>{expect(await mod.act.submit(Core.inputToken(game.state),{kind:'command',command:{code:'shop-exit'}})).toMatchObject({ok:true});}});
   before=host.beforeLoop();Core.runGameLoop(game.state,game.registry);host.afterLoop(before);expect(host.input().phase).toBe('play');
   await host.decide({api:'>=2 <3',controller:async mod=>{expect(await mod.act.submit(Core.inputToken(game.state),{kind:'command',command:{code:'shop-buy',args:{index:0}}})).toMatchObject({ok:false,message:'store is not open'});}});
  }finally{host.dispose();}
 });
 it('answers typed prompts without inventing a game command',async()=>{
  const {host,events}=create();try{host.setPrompt({promptId:1,kind:'confirm',label:'test'});
   await host.decide({api:'>=2 <3',controller:async(mod,input)=>{expect(input.prompt?.kind).toBe('confirm');expect(await mod.act.answer(1,true)).toMatchObject({ok:true});}});
   expect(host.answered).toBe(true);expect(host.pending).toBe(false);expect(events).toEqual([{type:'prompt_answer',promptId:1,answer:true,accepted:true}]);
  }finally{host.dispose();}
 });
 it('preserves actual release reasons for outcome classification',async()=>{
  const {host}=create();try{await host.decide({api:'>=2 <3',controller:async mod=>{await mod.act.controller.release('specific source release');}});
   expect(host.releaseReason).toBe('specific source release');}finally{host.dispose();}
 });
 it('launches no speculative controller at an already reached boundary',async()=>{
  let calls=0;const definition:Api2ModDefinition={api:'>=2 <3',controller:async mod=>{calls++;await mod.act.submit((await mod.view.input() as {ok:true;value:ReturnType<ReturnType<typeof create>['host']['input']>}).value.token,{kind:'command',command:{code:'hold'}});}};
  const birth=await runApi2Session(Core,pack,{seed:7,turns:0,decisions:20},definition,records,manifest.capabilities);
  expect(calls).toBe(0);expect(birth.decisions).toBe(0);
  const limited=await runApi2Session(Core,pack,{seed:7,turns:1000,decisions:1},definition,records,manifest.capabilities);
  expect(calls).toBe(0);expect(limited.loopCalls).toBe(1);expect(limited.outcome).toBe('decision_cap');
 });
 it('surfaces the target start failure log as a harness failure',async()=>{
  await expect(runApi2Session(Core,pack,{seed:7,turns:10,decisions:100},{api:'>=2 <3',start:async mod=>{mod.meta.log('the Borg could not start: missing content');}},records,manifest.capabilities)).rejects.toThrow(/could not start/);
 });
});

// These tests apply to the two released target lanes, not full Mandos's legacy profile.
if(existsSync(join(root,'zoo-lane.json')))describe('exact target plugin lifecycle',()=>{
 it('captures actual constructor flags and the target cross-mod default',async()=>{
  const run=await runApi2Session(Core,pack,{seed:7,turns:0,decisions:1,flags:{'borg.playsRisky':true,'borg.selfScum':false}},target,records,manifest.capabilities);
  expect(run.cfg).toMatchObject({playsRisky:true,selfScum:false});expect(run.crossModFlags['bugfix.borgFixes']).toBe(true);
 });
 it('uses the exact definition and records repeatable intents without changing play',async()=>{
  const lines:string[]=[],states:unknown[]=[];
  const a=await runApi2Session(Core,pack,{seed:7,turns:51,decisions:100,onCommand:l=>lines.push(l),onState:s=>states.push(s)},target,records,manifest.capabilities);
  const b=await runApi2Session(Core,pack,{seed:7,turns:51,decisions:100},target,records,manifest.capabilities);
  expect(a).toEqual(b);expect(lines.length).toBeGreaterThan(0);expect(states[0]).toMatchObject({kind:'birth',turn:0});
  expect(states.at(-1)).toMatchObject({kind:'stop',turn:a.turn});expect(a.turn).toBeGreaterThanOrEqual(51);
  expect(a.controllerProfile).toBe('api2-plugin');expect(a.commandStreamProfile).toBe('api2-intents-v1');
 });
 it('matches an independently driven exact-definition control',async()=>{
  const measured:string[]=[];
  const run=await runApi2Session(Core,pack,{seed:7,turns:51,decisions:100,onCommand:line=>measured.push(line)},target,records,manifest.capabilities);
  const game=Core.startGame(pack,{seed:7,depth:0});game.state.actor.player.noscore|=Core.NOSCORE.BORG;
  const control:unknown[]=[];const host=createZooApi2Host(Core,game,records,{},manifest.capabilities,event=>control.push(event));
  try {await target.start?.(host.mod);
   for(let calls=0;calls<100 && game.state.turn<51;calls++){
    const before=host.beforeLoop(),status=Core.runGameLoop(game.state,game.registry);
    if(status===Core.LOOP_STATUS.LEVEL_CHANGE){game.changeLevel(game.state.targetDepth??game.state.chunk.depth+1);game.state.generateLevel=false;}
    host.afterLoop(before);
    if(game.state.isDead||host.releaseReason!==null||game.state.turn>=51)break;
    if(host.inputNeeded)await host.decide(target);
   }
   expect(measured).toEqual(control.map(event=>canonicalJson(event)+'\n'));expect(run.turn).toBe(game.state.turn);
  }finally{await target.stop?.();host.dispose();}
 });
 it('uses the actual target prompt reply and settles loadout reads',async()=>{
  const {host}=create();try{await target.start?.(host.mod);
   host.setPrompt({promptId:1,kind:'confirm',label:'Set recall depth'});await host.decide(target);expect(host.answered).toBe(false);
   host.setPrompt({promptId:2,kind:'quantity',label:'How many?',min:1,max:9,defaultValue:3});await host.decide(target);expect(host.answered).toBe(3);
   await host.decide(target);expect(host.stats.loadoutRequests).toBeGreaterThan(0);
  }finally{await target.stop?.();host.dispose();}
 });
 it('reports actual idle release rather than introducing Mandos stall policy',async()=>{
  const definition:Api2ModDefinition={api:'>=2 <3',controller:async mod=>{await mod.act.controller.release('The Borg had no command to give.');}};
  const run=await runApi2Session(Core,pack,{seed:7,turns:1000,decisions:100},definition,records,manifest.capabilities);
  expect(run.outcome).toBe('stalled');expect(run.stall).toMatchObject({kind:'idle',reason:'The Borg had no command to give.'});
 });
});
