/** Actual registered HOME armour transaction capacity; no Borg dropping policy. */
import { expect, it } from "vitest";
import * as Core from "@rpgm-tools/neo-angband-core";
import { registeredPack } from "../../test/fixtures/registered-items.js";
it("refuses full-pack armour retrieval without energy, then accepts one after a real hole", () => {
  const game = Core.startGame(registeredPack(), { seed: 441, depth: 0, raceName: "Human", className: "Warrior" });
  const { state } = game, gear = state.gear!, reg = game.booted.registries.objects, z = game.booted.registries.constants;
  const kind = reg.kinds.find(k => k.name === "Chain Mail~")!;
  for (const handle of gear.pack) gear.store.delete(handle);
  gear.pack = []; gear.quiver = [];
  for (let n = 0; n < z.packSize; n++) {
    const obj = Core.objectPrep(state.rng, reg, z, kind, 60, "maximise"); obj.number = 1; obj.toA = n;
    gear.pack.push(Core.gearAdd(gear, obj));
  }
  gear.inven = [...gear.pack]; state.actor.player.upkeep.totalWeight = Core.gearTotalWeight(gear);
  const art = reg.artifacts.find(a => a?.name === "'Dal-i-thalion'")!;
  const boots = Core.objectPrep(state.rng, reg, z, reg.lookupKind(art.tval, art.sval)!, 60, "maximise");
  boots.artifact = art; Core.copyArtifactData(state.rng, reg, boots, art); boots.number = 1;
  const home = state.stores!.find(store => store.feat === Core.FEAT.HOME)!;
  home.stock = [boots]; state.chunk.setFeat(state.actor.grid, home.feat);
  const before = [...gear.pack], turn = state.turn;
  expect(Core.packSlotsUsed(gear, z)).toBe(z.packSize);
  expect(game.buy(home, boots, 1)).toMatchObject({ ok: false, failure: "no-room" });
  const messages: string[] = []; state.msg = message => messages.push(message);
  expect(game.registry.get("shop-buy")!(state, { code: "shop-buy", args: { index: 0 } })).toBe(0);
  expect(messages).toContain("You cannot carry that many items.");
  expect(gear.pack).toEqual(before); expect(home.stock).toEqual([boots]); expect(state.turn).toBe(turn);
  // Only the disposable fixture is adjusted; no production drop/replacement action.
  const freed = gear.pack.pop()!; gear.store.delete(freed); gear.inven = [...gear.pack];
  state.actor.player.upkeep.totalWeight = Core.gearTotalWeight(gear); messages.length = 0;
  expect(game.registry.get("shop-buy")!(state, { code: "shop-buy", args: { index: 0 } })).toBe(0);
  expect(home.stock).toHaveLength(0); expect(gear.pack).toHaveLength(z.packSize);
  expect(messages.some(message => message.startsWith("You have "))).toBe(true);
});
