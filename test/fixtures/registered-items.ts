/** Test-only registered object construction; controllers receive public known views only. */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import * as Core from "@rpgm-tools/neo-angband-core";
import type { KnownItem } from "@rpgm-tools/neo-angband-mod-sdk";

export const packRoot = dirname(createRequire(import.meta.url).resolve("@rpgm-tools/neo-angband-content/pack/constants.json"));
const json = (name: string) => JSON.parse(readFileSync(join(packRoot, name + ".json"), "utf8"));
export const records = (name: string) => json(name).records;
export function registeredPack(): Core.GamePack {
  return {
    constants: json("constants"), terrain: records("terrain"), roomTemplates: records("room_template"), vaults: records("vault"),
    dungeonProfiles: records("dungeon_profile"), projection: records("projection"), trap: records("trap"), names: records("names"), quest: records("quest"), store: records("store"),
    obj: Object.fromEntries(Object.entries({ objectBase: "object_base", object: "object", egoItem: "ego_item", artifact: "artifact", curse: "curse", brand: "brand", slay: "slay", activation: "activation", objectProperty: "object_property", flavor: "flavor" }).map(([key, file]) => [key, json(file)])),
    mon: Object.fromEntries(Object.entries({ pain: "pain", blowMethods: "blow_methods", blowEffects: "blow_effects", monsterSpells: "monster_spell", monsterBases: "monster_base", monsters: "monster", summons: "summon", pits: "pit" }).map(([key, file]) => [key, records(file)])),
    player: Object.fromEntries(Object.entries({ races: "p_race", classes: "class", properties: "player_property", timed: "player_timed", shapes: "shape", bodies: "body", history: "history", realms: "realm" }).map(([key, file]) => [key, records(file)])),
  } as Core.GamePack;
}
export interface RegisteredItemSpec { artifact?: string; kind?: string; curse?: string; known?: boolean; toA?: number }
const cache = new Map<string, KnownItem>();
export function registeredKnownItem(spec: RegisteredItemSpec, handle: number): KnownItem {
  const key = JSON.stringify(spec);
  let known = cache.get(key);
  if (!known) {
    const game = Core.startGame(registeredPack(), { seed: 441, depth: 0, raceName: "Human", className: "Warrior" });
    const { state } = game, reg = game.booted.registries.objects;
    const artifact = spec.artifact ? reg.artifacts.find(a => a?.name === spec.artifact) : undefined;
    if (spec.artifact && !artifact) throw Error("Missing registered artifact: " + spec.artifact);
    const kind = artifact ? reg.lookupKind(artifact.tval, artifact.sval) : reg.kinds.find(k => k.name === spec.kind);
    if (!kind) throw Error("Missing registered kind: " + spec.kind);
    const obj = Core.objectPrep(state.rng, reg, game.booted.registries.constants, kind, 60, "maximise");
    if (artifact) { obj.artifact = artifact; Core.copyArtifactData(state.rng, reg, obj, artifact); }
    if (spec.toA !== undefined) obj.toA = spec.toA; // Legal constructed enchantment, never an identity substitution.
    if (spec.curse) {
      const curse = reg.curses.find(c => c?.name === spec.curse);
      if (!curse) throw Error("Missing registered curse: " + spec.curse);
      Core.appendObjectCurse(state.rng, obj, reg.curses.indexOf(curse), 50, reg.curses);
    }
    obj.number = 1; obj.notice |= Core.OBJ_NOTICE.ASSESSED;
    if (spec.known !== false) {
      game.flavor.objectFlavorAware(kind, state.flavorAwareDeps ?? Core.NOOP_FLAVOR_AWARE_DEPS);
      Core.playerLearnAllRunes(state.actor.player, state.runeEnv);
    }
    const actual = Core.gearAdd(state.gear!, obj); state.gear!.pack.push(actual);
    state.actor.player.upkeep.totalWeight = Core.gearTotalWeight(state.gear!);
    const candidate = Core.buildKnownWorld(state, { reg }).inventory!.find(i => i.handle === actual);
    if (!candidate || candidate.tval !== kind.tval || (spec.known !== false && (candidate.sval !== kind.sval || candidate.kindKey !== `kind:${kind.kidx}`)))
      throw Error("Public object identity mismatch");
    if (spec.known !== false && (candidate.unknownRunes || candidate.artifactName !== (artifact?.name ?? null) || candidate.dd !== obj.dd || candidate.ds !== obj.ds))
      throw Error("Public object knowledge/dice mismatch");
    known = candidate; cache.set(key, known);
  }
  // These are combined unit-view identities; no live engine command uses the remapped handle.
  const { itemKey: _oldKey, ...rest } = structuredClone(known);
  return { ...rest, handle, carried: handle > 0, ...(handle > 0 ? { itemKey: `gear:${handle}` } : {}) };
}
