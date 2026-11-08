/** Exact target definition lifecycle, observed through a headless Core/API2 host. */
import { createHash } from "node:crypto";
import type * as Core from "@rpgm-tools/neo-angband-core";
import type { Api2ModDefinition, JsonRecord } from "@rpgm-tools/neo-angband-mod-sdk";
import { borgCfg, buffTimerSafetyNetEnabled } from "../src/trait/config.js";
import { canonicalJson, commandLine } from "./zoo-format.js";
import { createZooApi2Host } from "./zoo-api2-host.js";
export { canonicalJson };
export interface Api2MeasurementOptions {
  readonly seed: number; readonly turns: number; readonly decisions: number;
  readonly race?: string; readonly class?: string;
  readonly flags?: Readonly<Record<string, boolean>>;
  readonly onState?: (value: unknown) => void; readonly onCommand?: (line: string) => void;
}
/** New lanes share this profile; never compare its hash to the legacy213 profile. */
export async function runApi2Session(core: typeof Core, pack: Core.GamePack,
  options: Api2MeasurementOptions, definition: Api2ModDefinition,
  records: (file: string) => JsonRecord[], capabilities: readonly string[]) {
  const assigned = (wanted: string | undefined, values: readonly unknown[], kind: string) => {
    if (wanted === undefined) return undefined;
    const found = (values as readonly { name: string }[]).find(x => x.name.toLowerCase() === wanted.toLowerCase());
    if (!found) throw new Error(`Unknown ${kind}: ${wanted}`);
    return found.name;
  };
  const race = assigned(options.race, pack.player.races, "race"), cls = assigned(options.class, pack.player.classes, "class");
  const game = core.startGame(pack, { seed: options.seed, depth: 0,
    ...(race === undefined ? {} : { raceName: race }), ...(cls === undefined ? {} : { className: cls }) });
  const state = game.state, player = state.actor.player;
  state.actor.player.noscore |= core.NOSCORE.BORG;
  const birth = { race: player.race.name, class: player.cls.name,
    raceSelection: race === undefined ? "default" : "assigned", classSelection: cls === undefined ? "default" : "assigned",
    roller: "roller", baseStats: [...player.statBirth], options: state.options?.snapshot().birth ?? {} };
  const hash = createHash("sha256"), commands: Record<string, number> = {};
  let decisions = 0, acceptedCommands = 0, callbacks = 0, noCommandReplies = 0, events = 0, loopCalls = 0;
  let maxDepth = state.chunk.depth, maxLevel = player.maxLev, lastDepth = state.chunk.depth, lastPeriodic = 0;
  const firstDepthTurns: Record<string, number> = { [String(state.chunk.depth)]: state.turn };
  const host = createZooApi2Host(core, game, records, options.flags ?? {}, capabilities, event => {
    const line = commandLine(event); hash.update(line); events++; options.onCommand?.(line);
    const intent = event["intent"] as { kind?: string; command?: { code: string } } | undefined;
    if (event.type === "intent" && intent?.kind === "command" && intent.command) {
      decisions++; commands[intent.command.code] = (commands[intent.command.code] ?? 0) + 1;
      if (event["accepted"] === true) acceptedCommands++;
    }
  });
  const snapshot = (kind: string) => {
    maxDepth = Math.max(maxDepth, state.chunk.depth); maxLevel = Math.max(maxLevel, player.maxLev, player.lev);
    firstDepthTurns[String(state.chunk.depth)] ??= state.turn;
    return { kind, turn: state.turn, decisions, attempts: callbacks, loopCalls, depth: state.chunk.depth,
      maxDepth, level: player.lev, maxLevel, hp: player.chp, maxHp: player.mhp, energy: state.actor.energy };
  };
  const boundary = () => {
    const row = snapshot("periodic");
    if (decisions > 0 && decisions % 100 === 0 && decisions !== lastPeriodic) { options.onState?.(row); lastPeriodic = decisions; }
    if (row.depth !== lastDepth) { options.onState?.({ ...row, kind: "depth" }); lastDepth = row.depth; }
  };
  let started = false;
  try {
    // These are the real plugin methods, including constructor config and rewind policy.
    await definition.start?.(host.mod); started = true;
    const failure = host.logs.find(line => line.startsWith("the Borg could not start:"));
    if (failure) throw new Error(failure);
    const cfg = { ...borgCfg() }, crossModFlags = { "bugfix.borgFixes": buffTimerSafetyNetEnabled() };
    options.onState?.(snapshot("birth"));
    for (; loopCalls < options.decisions;) {
      if (state.turn >= options.turns || state.isDead || host.releaseReason !== null) break;
      const before = host.beforeLoop();
      const status = core.runGameLoop(state, game.registry); loopCalls++;
      if (status === core.LOOP_STATUS.LEVEL_CHANGE) { game.changeLevel(state.targetDepth ?? state.chunk.depth + 1); state.generateLevel = false; }
      host.afterLoop(before); boundary();
      if (state.itemRequest) throw new Error("Core requested an item-choice UI not available in this headless profile");
      if (state.isDead || status === core.LOOP_STATUS.DEAD || status === core.LOOP_STATUS.DEATH_CONFIRM) break;
      if (status === core.LOOP_STATUS.STOPPED) throw new Error("Engine stopped without a target controller release");
      // Never launch a speculative async controller after a reached cap.
      if (state.turn >= options.turns || loopCalls >= options.decisions) break;
      if (host.inputNeeded) {
        const count = decisions; callbacks++;
        await host.decide(definition);
        if (decisions === count) noCommandReplies++;
        if (host.releaseReason !== null) break;
      }
    }
    boundary(); const stop = snapshot("stop"); options.onState?.(stop);
    const reason = host.releaseReason;
    const stallKind = reason === "The Borg had no command to give." ? "idle"
      : reason === "The game kept refusing the Borg's commands." ? "refusal"
        : reason?.startsWith("The Borg's ") && reason.endsWith(" times running.") ? "repeat" : null;
    const stall = stallKind ? { kind: stallKind, command: host.lastConsumed?.code ?? null,
      decision: callbacks, turn: state.turn, reason } : null;
    const dead = state.isDead;
    const outcome = dead ? "death" : stall !== null ? "stalled" : reason !== null ? "borg_stopped"
      : state.turn >= options.turns ? "turn_cap" : "decision_cap";
    return { outcome, causeOfDeath: dead ? player.diedFrom : null, stopped: stall === null ? reason : null, stall,
      controllerProfile: "api2-plugin", commandStreamProfile: "api2-intents-v1", birth, cfg, crossModFlags,
      turn: stop.turn, decisions, acceptedCommands, attempts: callbacks, noCommandReplies, loopCalls,
      depth: stop.depth, maxDepth: stop.maxDepth, level: stop.level, maxLevel: stop.maxLevel,
      hp: stop.hp, maxHp: stop.maxHp, energy: stop.energy,
      turnCap: { requested: options.turns, actual: state.turn, overshoot: Math.max(0, state.turn - options.turns),
        exact: state.turn === options.turns, guaranteedExact: false, policy: "first_core_loop_boundary_at_or_after_cap",
        unit: "core_game_tick", normalActionTicks: 10 },
      decisionCap: { requested: options.decisions, unit: "core_loop_call" }, firstDepthTurns,
      commands, playSha256: hash.digest("hex"), commandStreamEvents: events, hostReads: { ...host.stats },
      profileLimits: { stores: "Core registered shop transaction commands; no browser modal", prompts: "Core preset command arguments; no UI-created prompt catalogue" },
    };
  } catch (error) {
    try { options.onState?.(snapshot("stop")); } catch { /* Keep the original measurement failure. */ }
    throw error;
  } finally {
    if (started) await definition.stop?.();
    host.dispose();
  }
}
