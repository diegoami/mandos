/** Source51: real registered known curse classification; scalar model isolates native arithmetic. */
import { afterEach,beforeAll,expect,it } from "vitest";
import type { AgentView,ItemView } from "@rpgm-tools/neo-angband-core";
import { registeredKnownItem,records } from "../../test/fixtures/registered-items.js";
import { itemAnalyzer,type ItemAnalyzer } from "../api2/records.js";
import { itemView } from "../api2/world.js";
import { makeScenarioView,makeFakeActions } from "../harness.js";
import { BorgWorld } from "../world/model.js";
import type { BorgContext } from "../context.js";
import { makeBorgRng } from "../rng.js";
import { BI } from "../trait/trait-index.js";
import { borgArmourSwap } from "../trait/armour-swap.js";
import { borgNotice } from "../trait/trait.js";
import { getDerived } from "../trait/state.js";
import { isCursed } from "../item/deps.js";
import { resetBorgCfg } from "../trait/config.js";
let analyze:ItemAnalyzer;
beforeAll(async()=>{analyze=await itemAnalyzer({content:{records:async(name:string)=>({ok:true,value:records(name)})}} as never);});
afterEach(resetBorgCfg);
function scene(artifact="'Razorback'",curse?:string) {
  const item=itemView(registeredKnownItem({artifact,...(curse?{curse}:{})},2),analyze);
  const base=makeScenarioView({player:{cls:"Warrior",race:"Human",depth:60,maxDepth:60,level:40,maxLevel:40,
    hp:100,maxHp:100,sp:0,maxSp:0,stats:[118,118,118,118,118],grid:{x:10,y:10}}});
  const view:AgentView={...base,inventory:()=>[item],equipment:()=>Array<ItemView|null>(12).fill(null)};
  const ctx:BorgContext={view,world:new BorgWorld(),act:makeFakeActions(),rng:makeBorgRng(1)};
  borgNotice(ctx);return{ctx,item};
}
it("recognizes actual known negative flags without manufacturing a named curse",()=>{
  const s=scene();expect(s.item.artifactName).toBe("'Razorback'");expect(s.item.flags).toContain("AGGRAVATE");
  expect(s.item.curses).toEqual([]);expect(s.item.borgAnalysis?.cursed).toBe(true);expect(isCursed(s.item)).toBe(true);
});
it("rejects known negative-flag armour with unknown removability at full notice",()=>{
  const s=scene();expect(getDerived(s.ctx.world).armourSwap.handle).toBeNull();
});
it("rejects known negative-flag armour with an explicit false removability reader",()=>{
  const s=scene();expect(borgArmourSwap(s.ctx,{armourSwap:{uncursable:()=>false}}).handle).toBeNull();
});
it("applies the native5000 removable penalty under an explicit scorer knowledge profile",()=>{
  const s=scene(),t=s.ctx.world.self.trait;
  // This is a MODEL scoring profile, not a claim that AGGRAVATE can actually be removed in game.
  t[BI.BLOWS]=1;t[BI.TOHIT]=0;t[BI.TODAM]=0;
  for(const bi of [BI.RACID,BI.RELEC,BI.RFIRE,BI.RCOLD,BI.RPOIS,BI.RLITE,BI.RDARK,BI.RDIS,BI.SINV,BI.FRACT])t[bi]=1;
  t[BI.IELEC]=0;
  expect([s.item.dd,s.item.ds,s.item.toH,s.item.toD]).toEqual([2,4,-4,0]);
  // -1 + 2*4*35*(1+1) -4*100 -AGGRAVATE8000 -removable5000 +IELEC25000 +fourbasics10000.
  expect(borgArmourSwap(s.ctx,{armourSwap:{uncursable:()=>true}})).toEqual({handle:2,value:22159});
});
it("keeps legitimate registered noncursed armour eligible",()=>{
  const s=scene("'Dal-i-thalion'");expect(isCursed(s.item)).toBe(false);expect(getDerived(s.ctx.world).armourSwap.handle).toBe(2);
});
it("keeps named curses rejected with an explicit false reader",()=>{
  const s=scene("'Dal-i-thalion'","vulnerability");expect(s.item.curses).toContain("vulnerability");expect(isCursed(s.item)).toBe(true);
  expect(borgArmourSwap(s.ctx,{armourSwap:{uncursable:()=>false}}).handle).toBeNull();
});
