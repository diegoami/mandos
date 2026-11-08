/** External measurement adapter (Mandos #213), never imported by plugin.ts. */
import { createHash } from "node:crypto";
import type * as Core from "@rpgm-tools/neo-angband-core";
import { bindCore } from "./core-api.js";
import { driveLife, observingLife, type LifeStall } from "./play-session.js";
import type { BorgCfg } from "./trait/config.js";

/** Sorted object keys, JSON scalars/arrays, UTF-8 at the stream boundary. */
export function canonicalJson(value: unknown): string {
  const encode = (v: unknown): string => {
    if (v === null || typeof v === "string" || typeof v === "boolean") return JSON.stringify(v);
    if (typeof v === "number") {
      if (!Number.isFinite(v)) throw new Error("Command numbers must be finite");
      return JSON.stringify(v);
    }
    if (Array.isArray(v)) return "[" + Array.from(v, item => item === undefined ? "null" : encode(item)).join(",") + "]";
    if (typeof v === "object" && v !== null && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null)) {
      return "{" + Object.keys(v).sort().filter(key => (v as Record<string, unknown>)[key] !== undefined)
        .map(key => JSON.stringify(key) + ":" + encode((v as Record<string, unknown>)[key])).join(",") + "}";
    }
    throw new Error(`Unsupported command value: ${typeof v}`);
  };
  return encode(value);
}

export function commandLine(event: unknown): string { return canonicalJson(event) + "\n"; }

export type ZooOutcome = "death" | "turn_cap" | "stalled" | "borg_stopped" | "decision_cap" | "harness_failure";
export function classifyZooOutcome(facts: { dead: boolean; stopped: string | null; stall: LifeStall | null; turn: number; cap: number }): ZooOutcome {
  if (facts.dead) return "death";
  if (facts.stopped !== null) return "borg_stopped";
  if (facts.stall !== null) return "stalled";
  return facts.turn >= facts.cap ? "turn_cap" : "decision_cap";
}

export interface ZooState {
  readonly kind: "birth" | "periodic" | "depth" | "stop";
  readonly turn: number;
  /** Actual issued controller commands, not Core loop calls or game ticks. */
  readonly decisions: number;
  readonly attempts: number;
  readonly loopCalls: number;
  readonly depth: number;
  readonly maxDepth: number;
  readonly level: number;
  readonly maxLevel: number;
  readonly hp: number;
  readonly maxHp: number;
  readonly energy: number;
}
export interface ZooSessionOptions {
  readonly seed: number;
  readonly turns: number;
  readonly decisions: number;
  readonly race?: string;
  readonly class?: string;
  readonly cfg?: Partial<BorgCfg>;
  readonly onState?: (state: ZooState) => void;
  readonly onCommand?: (line: string) => void;
}

/** One ordinary birth, one instance of the existing observing controller/loop. */
export function runZooSession(core: typeof Core, pack: Core.GamePack, opts: ZooSessionOptions) {
  const name = (wanted: string | undefined, entries: readonly unknown[], kind: string): string | undefined => {
    if (wanted === undefined) return undefined;
    const found = (entries as readonly { name: string }[]).find(entry => entry.name.toLowerCase() === wanted.toLowerCase());
    if (!found) throw new Error(`Unknown ${kind}: ${wanted}`);
    return found.name;
  };
  const race = name(opts.race, pack.player.races, "race");
  const cls = name(opts.class, pack.player.classes, "class");
  bindCore(core);
  const game = core.startGame(pack, { seed: opts.seed, depth: 0,
    ...(race === undefined ? {} : { raceName: race }), ...(cls === undefined ? {} : { className: cls }) });
  const state = game.state;
  const player = state.actor.player;
  const birth = {
    race: player.race.name, class: player.cls.name,
    raceSelection: race === undefined ? "default" : "assigned",
    classSelection: cls === undefined ? "default" : "assigned",
    roller: "roller", baseStats: [...player.statBirth],
    options: state.options?.snapshot().birth ?? {},
  };
  const hash = createHash("sha256");
  let eventCount = 0;
  let cfg: Readonly<BorgCfg> | null = null;
  let loopCalls = 0;
  let maxDepth = state.chunk.depth;
  let maxLevel = player.maxLev;
  const firstDepthTurns: Record<string, number> = { [String(state.chunk.depth)]: state.turn };
  const observed = observingLife(core, game, pack, {
    ...(opts.cfg === undefined ? {} : { cfg: opts.cfg }),
    settingsRead: actual => { cfg = actual; },
    event: event => {
      const line = commandLine(event);
      hash.update(line, "utf8");
      eventCount++;
      opts.onCommand?.(line);
    },
  });
  const snapshot = (kind: ZooState["kind"]): ZooState => {
    maxDepth = Math.max(maxDepth, state.chunk.depth);
    firstDepthTurns[String(state.chunk.depth)] ??= state.turn;
    maxLevel = Math.max(maxLevel, player.maxLev, player.lev);
    return { kind, turn: state.turn, decisions: observed.issuedCommands, attempts: observed.attempts,
      loopCalls, depth: state.chunk.depth, maxDepth, level: player.lev, maxLevel,
      hp: player.chp, maxHp: player.mhp, energy: state.actor.energy };
  };
  let lastPeriodic = 0;
  let lastDepth = state.chunk.depth;
  const boundary = () => {
    const current = snapshot("periodic");
    if (current.decisions > 0 && current.decisions % 100 === 0 && current.decisions !== lastPeriodic) {
      opts.onState?.(current);
      lastPeriodic = current.decisions;
    }
    if (current.depth !== lastDepth) {
      opts.onState?.({ ...current, kind: "depth" });
      lastDepth = current.depth;
    }
  };
  try {
    opts.onState?.(snapshot("birth"));
    const result = driveLife(core, game, opts.decisions, observed, opts.seed, undefined, boundary,
      { turnCap: opts.turns, afterLoop: status => {
        loopCalls++;
        if (status === core.LOOP_STATUS.STOPPED && !state.isDead && observed.stopReason === null) {
          throw new Error("Engine stopped without a Borg stop reason; measurement cannot continue");
        }
      } });
    boundary();
    const stop = snapshot("stop");
    opts.onState?.(stop);
    const dead = result.dead || state.isDead;
    const outcome = classifyZooOutcome({ dead, stopped: result.stopped, stall: observed.stall, turn: stop.turn, cap: opts.turns });
    return {
      outcome, causeOfDeath: dead ? player.diedFrom : null, stopped: result.stopped, stall: observed.stall,
      birth, cfg, turn: stop.turn, decisions: stop.decisions, attempts: stop.attempts,
      noCommandReplies: observed.noCommandReplies, loopCalls, depth: stop.depth, maxDepth: stop.maxDepth,
      level: stop.level, maxLevel: stop.maxLevel, hp: stop.hp, maxHp: stop.maxHp, energy: stop.energy,
      turnCap: { requested: opts.turns, actual: stop.turn, exact: stop.turn === opts.turns, guaranteedExact: false, policy: "first_core_loop_boundary_at_or_after_cap", overshoot: Math.max(0, stop.turn - opts.turns),
        unit: "core_game_tick", normalActionTicks: 10 },
      decisionCap: { requested: opts.decisions, unit: "core_loop_call" },
      firstDepthTurns, commands: observed.commands, playSha256: hash.digest("hex"), commandStreamEvents: eventCount,
    };
  } catch (error) {
    // A born character still gets a terminal snapshot on harness failure.
    try { opts.onState?.(snapshot("stop")); } catch { /* Preserve the original failure. */ }
    throw error;
  } finally { observed.uninstall(); }
}
