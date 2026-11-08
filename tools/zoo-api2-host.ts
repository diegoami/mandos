/** Core-only API2 host for the pinned target plugin; no Borg policy lives here. */
import type * as Core from "@rpgm-tools/neo-angband-core";
import type { Api2InputState, Api2Intent, Api2ModDefinition, JsonRecord, ModApi2 } from "@rpgm-tools/neo-angband-mod-sdk";
import { createIntentGate } from "./zoo-host/intent-gate.js";

export interface Api2Event { readonly type: string; readonly [key: string]: unknown }
// Same data ownership cut as published beta.3 mod-api2-host.ts.
function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  }
  return value;
}
const ok = <T>(value: T) => ({ ok: true as const, value: deepFreeze(structuredClone(value)) });
const unavailable = (message: string) => ({ ok: false as const, code: "unavailable", message });
const refused = (message: string) => ({ ok: false as const, code: "rejected", message });
export function createZooApi2Host(core: typeof Core, game: Core.StartedGame,
  records: (file: string) => JsonRecord[], flags: Readonly<Record<string, boolean>>,
  capabilities: readonly string[], event: (event: Api2Event) => void) {
  const state = game.state;
  const grants = new Set(capabilities);
  const caps = { has: (cap: string) => grants.has(cap) };
  const resolver = new core.ContentIdResolver({ objects: game.booted.registries.objects, monsters: game.booted.registries.monsters,
    playerRaces: game.players.races, playerClasses: game.players.classes });
  const deps: Core.AgentViewDeps = { ...state.knownWorldDeps, resolver,
    reg: game.booted.registries.objects,
    describe: obj => core.describeObject(state, obj, core.ODESC.PREFIX | core.ODESC.FULL),
    describeStore: obj => core.describeObject(state, obj, core.ODESC.PREFIX | core.ODESC.FULL | core.ODESC.STORE),
    ignored: obj => state.isIgnored?.(obj) ?? false,
    glyphs: new core.GlyphTable({ features: game.booted.registries.features.allFeatures(),
      kinds: game.booted.registries.objects.kinds, races: game.booted.registries.monsters.races,
      traps: game.booted.registries.traps, flavors: game.booted.registries.objects.flavors }).agentGlyphs() };
  let queued: { command: Core.AgentCommand; token: Core.InputToken } | null = null;
  let inputNeeded = false;
  let deciding = false;
  let store: number | null = null;
  let releaseReason: string | null = null;
  let lastConsumed: Core.AgentCommand | null = null;
  let prompt: Api2InputState["prompt"] = null;
  let answered: unknown = null;
  const logs: string[] = [];
  const stats = { loadoutRequests: 0, worldReads: 0 };
  const listeners = new Map<string, (event: { text: string }) => void>();
  const oldNext = state.nextCommand, oldMsg = state.msg;
  state.nextCommand = () => {
    if (queued !== null) {
      const held = queued; queued = null;
      if (core.tokenIsCurrent(state, held.token)) { lastConsumed = held.command; return held.command; }
    }
    inputNeeded = true;
    return null;
  };
  state.msg = text => { oldMsg?.(text); for (const fn of listeners.values()) fn({ text }); };
  const phase = () => store === null ? "play" as const : "store" as const;
  const queue = (command: Core.AgentCommand) => { queued = { command, token: core.inputToken(state) }; };
  const gate = createIntentGate({ state, registry: game.registry,
    snapshotSource: { phase, prompt: () => prompt }, push: queue,
    storeCommand: command => { queue(command); return true; }, advance: () => undefined });
  const input = (): Api2InputState => ({ token: core.inputToken(state), phase: prompt ? "modal" : phase(),
    driver: { kind: "controller", owner: "borg" }, prompt, messagePending: false,
    resting: null, running: (state.run?.running ?? 0) > 0,
    repeating: (state.cmdQueue?.[0]?.repeatRemaining ?? 0) > 0,
    repeatsLeft: state.cmdQueue?.[0]?.repeatRemaining ?? 0, unignoring: (state.unignoring ?? 0) > 0,
    messages: null, storeStatus: null, activeBlast: null });
  let memory: unknown = null;
  const mod = {
    meta: { id: "borg", flags, log: (text: string) => { logs.push(text); } },
    engine: { core, state },
    store: { install: { get: async () => ok(memory), set: async (v: unknown) => { memory = v; return ok(null); } } },
    view: {
      world: async () => { stats.worldReads++; return ok(core.buildKnownWorld(state, deps, caps)); },
      input: async () => ok(input()),
      options: async () => ok(state.options?.snapshot() ?? {}),
      simulateLoadout: async (change: Core.LoadoutChange) => {
        // Preserve pinned beta.3 host guard semantics, including its carry-wrapper shape.
        // Core still receives the original typed change; do not silently repair host policy here.
        stats.loadoutRequests++;
        const refs = [...(change.wield ?? []), ...(change.wieldAt ?? []).map(x => x.item), ...(change.carry ?? [])] as readonly Core.LoadoutItemRef[];
        for (const ref of refs) {
          const domain = ref.from === "store" ? "stores" : ref.from === "floor" ? "floor" : "inventory";
          if (!caps.has(`state:${domain}.read`)) return unavailable(`state:${domain}.read`);
          if (ref.from === "floor" && (!state.chunk.inBounds(ref) || !core.squareIsSeen(state.chunk, ref))) return refused("unobserved-item");
          if (ref.from === "store" && state.chunk.feat(state.actor.grid) !== state.stores?.[ref.store]?.feat) return refused("unobserved-item");
        }
        const result = core.createAgentView(state, undefined, deps, caps).simulateLoadout?.(structuredClone(change));
        return result ? ok(core.knownLoadoutSimulation(state, result)) : unavailable("no loadout calculation");
      },
    },
    content: {
      records: async (file: string) => ok(structuredClone(records(file))),
      boundRecords: async (file: string) => {
        const reg = game.booted.registries;
        if (file === "monster") return ok(reg.monsters.races.filter(Boolean).map(race => ({ index: race.ridx, name: race.name, base: race.base?.name ?? "", key: race.name, owner: "core" })));
        if (file === "object") return ok(reg.objects.kinds.filter(Boolean).map(kind => ({ index: kind.kidx, name: kind.name, tval: kind.tval, key: kind.name, owner: "core" })));
        return ok(records(file).map((record, index) => ({ ...record, index, key: String(record["name"] ?? index), owner: "core" })));
      },
      activation: async (ref: { tval?: number; sval?: number; ego?: string; artifact?: string }) => {
        const reg = game.booted.registries.objects;
        const source = ref.tval !== undefined ? reg.lookupKind(ref.tval, ref.sval ?? 0)
          : ref.ego !== undefined ? reg.egos.find(x => x?.name === ref.ego) : reg.artifacts.find(x => x?.name === ref.artifact);
        const activation = source?.activation;
        return ok(activation ? structuredClone({ ...activation }) : null);
      },
    },
    truth: {
      monsters: async () => caps.has("state:monsters-actual.read") ? ok(core.trueMonsterViews(state, deps).map(mon => ({ ...mon,
        perceived: core.monsterIsObvious(state.monsters[mon.id]!) }))) : unavailable("state:monsters-actual.read"),
      race: async (index: number) => {
        if (!caps.has("state:monsters-actual.read")) return unavailable("state:monsters-actual.read");
        const race = game.booted.registries.monsters.races.find(r => r.ridx === index);
        if (!race) return ok(null);
        return ok({ ridx: race.ridx, flags: [...race.flags].flatMap(f => core.MON_RACE_FLAG_ENTRIES[f] ? [core.MON_RACE_FLAG_ENTRIES[f]!.name] : []),
          spells: [...race.spellFlags].filter(f => f >= core.RSF.MAX || !!core.MON_SPELL_ENTRIES[f]).sort((a,b) => a-b),
          blows: race.blows.map(blow => { const dice = blow.dice?.randomValue(); return { dice: dice?.dice ?? 0, sides: dice?.sides ?? 0, effect: blow.effect.name }; }),
          level: race.level, sleep: race.sleep, spellPower: race.spellPower, freqInnate: race.freqInnate,
          freqSpell: race.freqSpell, hasFriends: race.friends.length > 0 || race.friendsBase.length > 0 });
      },
    },
    events: {
      on: async (name: string, listener: (event: { text: string }) => void) => {
        if (name !== "message" || !caps.has("event:message")) return unavailable(`event:${name}`);
        const id = String(listeners.size + 1); listeners.set(id, listener); return ok({ id });
      },
      off: async (subscription: { id: string }) => { listeners.delete(subscription.id); return ok(null); },
    },
    act: {
      submit: async (token: Core.InputToken, intent: Api2Intent) => {
        if (!deciding || releaseReason !== null || queued !== null) return refused("this controller decision has ended");
        const copy = structuredClone(intent) as Core.PlayerIntent;
        const sent = copy.kind === "target" && "midx" in copy ? { ...copy, midx: core.knownMonsterMidx(state, copy.midx) ?? 0 } : copy;
        const result = gate.submit(token, sent);
        event({ type: "intent", intent, accepted: result.accepted, ...(result.accepted ? {} : { reason: result.reason ?? "rejected" }) });
        return result.accepted ? ok(null) : refused(result.reason ?? "rejected");
      },
      answer: async (id: number, answer: unknown) => {
        const accepted = prompt !== null && prompt.promptId === id;
        event({ type: "prompt_answer", promptId: id, answer, accepted });
        if (!accepted) return refused("no matching prompt");
        answered = structuredClone(answer); prompt = null; core.bumpInputRevision(state); return ok(null);
      },
      controller: {
        release: async (reason = "The controller released input.") => { releaseReason = reason; event({ type: "release", reason }); return ok(null); },
        owns: async () => ok(releaseReason === null), setStatus: async () => ok(null),
      },
    },
  } as unknown as ModApi2;
  return { mod, input, logs, gate, stats,
    get inputNeeded() { return inputNeeded; }, get releaseReason() { return releaseReason; },
    get pending() { return queued !== null; }, get lastConsumed() { return lastConsumed; },
    setPrompt(value: Api2InputState["prompt"]) { prompt = value; }, get answered() { return answered; },
    async decide(definition: Api2ModDefinition) {
      inputNeeded = false; deciding = true;
      try { await definition.controller?.(mod, input()); } finally { deciding = false; }
    },
    beforeLoop() { inputNeeded = false; lastConsumed = null; return { ...state.actor.grid }; },
    afterLoop(before: { x: number; y: number }) {
      const consumed = lastConsumed as Core.AgentCommand | null;
      if (consumed?.code === "shop-exit") store = null;
      else if (before.x !== state.actor.grid.x || before.y !== state.actor.grid.y || consumed?.code === "hold") {
        const shop = state.chunk.feature(state.actor.grid).shopnum;
        store = shop > 0 && !core.playerIsShapechanged(state) ? shop - 1 : null;
      }
      if (store !== null && state.stores?.[store]) core.observeKnownStore(state, state.stores[store]!, deps);
    },
    dispose() { state.nextCommand = oldNext; if (oldMsg) state.msg = oldMsg; else delete state.msg; listeners.clear(); },
  };
}
