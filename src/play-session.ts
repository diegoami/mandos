/**
 * THE SESSION: boot a real game, hand it to the Borg, drive the loop.
 *
 * This module is the measurement instrument's one copy of the play harness.
 * It was extracted from src/play.test.ts (B02, issue #3) because a session
 * loop that exists twice exists one-and-a-half times: the suite and the
 * bake-off runner (tools/sweep.mjs) must drive the SAME loop or the numbers a
 * run record quotes stop being the numbers the suite asserts on. At the M2
 * unification (#15) neowarrior-borg's session driver (its src/records/
 * session.ts, shipped in v0.1.0 e1ec1b7) merged in here for the same reason
 * - ending the last duplication - so there is ONE session module with TWO
 * drivers over ONE loop body:
 *
 *   - playSession (B02's): the STOCK Borg. One boot per seed, race and class
 *     default Human Warrior first birth, one character per life, the next life the engine's own
 *     reincarnation in the same session. This is the instrument behind
 *     B01/B02/B14's committed records, and its survivor runs reproduce
 *     bit-for-bit (the seed-1 door-close census, 771 closes, is the
 *     regression proof).
 *   - playPackSession (ported): the PACK Borg. The planned births the
 *     strategy packs own (default: warrior, src/class/), chained on deaths
 *     the way the restart loop chains them in the mod, with the journal and
 *     graveyard installed per life - the in-mod records (src/records/
 *     journal.ts) exercised against the engine's real arrival events, and
 *     each ended run archived to install storage BEFORE the next boot, the
 *     loop's journal-before-create ordering.
 *
 * THE ENGINE ARRIVES AS A PARAMETER, the way ctx.core arrives in the plugin.
 * A harness file under src/ may not value-import the engine
 * (core-import-census.test.ts), so the callers - the vitest suite and the
 * runners' bundled entries - each import it themselves and hand it over.
 *
 * BEHAVIOUR IS THE CONTRACT for the stock driver: every line of the loop
 * below is the one the suite ran before the extraction, in the same order,
 * asking the same things of the same objects; the additions are observation
 * only (reads of live player fields, a kill counter wrapped around the
 * engine's own onPlayerKill hook, a wall-clock stamp). None of them draws
 * RNG, so a session on a given engine build is what it always was.
 *
 * COUNTING: a completed command reply is a decision, including the command
 * that kills the character. An armed reply with no command is an attempt,
 * counted separately, not a fabricated command. The outer loop-call budget
 * stays bounded. Independent scalar counters protect the command census;
 * normal command-only records retain their previous counting and shape.
 *
 * Determinism (rule 5): the birth input fixes the game, and the Borg starts
 * its private stream exactly as the shipped plugin does (#54). Wall-clock
 * durations are recorded as metadata and never influence a result.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { birthReplayDataOf, type BirthReplayData } from "./records/birth-replay.js";
import type { JsonRecord, KnownWorldData, LoadoutSimulation } from "@rpgm-tools/neo-angband-mod-sdk";
import { itemView, playerView, simulationView } from "./api2/world.js";
import { itemAnalyzerFromRecords, type ItemAnalyzer, type GradeFloors } from "./api2/records.js";
import { dirname, join, sep } from "node:path";
import type * as Core from "@rpgm-tools/neo-angband-core";
import type { GamePack, GameState, StartedGame } from "@rpgm-tools/neo-angband-core";
import type {
  Api2Events,
  Api2Slot,
  Api2Subscription,
  JsonValue,
  RunReport as SdkRunReport,
} from "@rpgm-tools/neo-angband-mod-sdk";
import { createBorg } from "./controller.js";
import { borgCfg, type BorgCfg } from "./trait/config.js";
import { aimedGrid, createStallWatch, forgetGrid, sceneKey } from "./loop/stall.js";
import { bindCore, coreIsBound } from "./core-api.js";
import { makeCoreResolvers } from "./resolvers.js";
import { assessUncertainty, MAX_UNSURE_KEPT, type UnsurePoint } from "./uncertainty.js";
import { installBorgJournal, parseJournal, GRAVEYARD_KEY, graveyardArchiveOf, type ArchivedRun, type BorgJournalData } from "./records/journal.js";
import { retireAtStage } from "./loop/restart.js";
import { librarySlotName, stageAttained, type StageDefinition } from "./loop/stage.js";
import type { StrategyPack } from "./class/pack.js";
import { warriorPack } from "./class/warrior/index.js";
import type { GameEvents, DungeonLevelEventData } from "@rpgm-tools/neo-angband-core";

/** This repository's root, from src/ and from a runner's bundle in artifacts/ alike. */
const REPO_ROOT = fileURLToPath(new URL("../", import.meta.url));

/** The published content package, pinned in package.json beside the engine. */
const CONTENT_PKG = "@rpgm-tools/neo-angband-content";

/**
 * The content pack a real boot needs (#46), first match wins:
 *   1. NEO_ANGBAND_REPO - an explicit checkout, the owner's override;
 *   2. the published content package, version-pinned and lockfile-locked
 *      like the engine it belongs to - what CI and a fresh clone play;
 *   3. a sibling ../neo-angband checkout, for a tree without node_modules.
 * The package comes before the sibling because the sibling is the lab
 * branch, which moves; the published pack is the one the engine pin names.
 */
export function packRoot(): string | null {
  const checkout = (root: string | undefined): string | null => {
    if (root === undefined || root.length === 0) return null;
    const dir = join(root, "packages", "content", "pack");
    return existsSync(join(dir, "constants.json")) ? dir : null;
  };
  const published = (): string | null => {
    try {
      const require = createRequire(join(REPO_ROOT, "package.json"));
      return dirname(require.resolve(`${CONTENT_PKG}/pack/constants.json`));
    } catch {
      return null;
    }
  };
  return checkout(process.env["NEO_ANGBAND_REPO"]) ?? published() ?? checkout(join(REPO_ROOT, "..", "neo-angband"));
}

/**
 * Where a pack directory came from, as a run record names it: the package
 * and its version, or the checkout's commit. Decided by node_modules, not by
 * the package name - a checkout's packages/content carries the same name.
 */
export function packSource(dir: string): string {
  if (dir.split(sep).includes("node_modules")) {
    try {
      const pkg = JSON.parse(readFileSync(join(dir, "..", "package.json"), "utf8")) as { version?: string };
      return `${CONTENT_PKG} ${String(pkg.version)}`;
    } catch {
      return `${CONTENT_PKG} (version unknown)`;
    }
  }
  try {
    const short = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: join(dir, "..", "..", ".."), encoding: "utf8" }).trim();
    return `neo-angband@${short}`;
  } catch {
    return "neo-angband (not a git checkout)";
  }
}

function playGradeFloors(game: Core.StartedGame): GradeFloors {
  return new Map(game.players.timed.map((effect) => {
    let floor = 1;
    const grades = new Map<string, number>();
    for (const grade of effect.grades) {
      if (grade.name && !grades.has(grade.name)) grades.set(grade.name, floor);
      floor = grade.max + 1;
    }
    return [effect.name, grades];
  }));
}

function playView(core: typeof Core, game: Core.StartedGame, raw: Core.AgentView,
  deps: Core.AgentViewDeps, floors: GradeFloors, analyze: ItemAnalyzer): Core.AgentView {
  // This is the same public known-world builder the real API2 host invokes.
  const known = core.buildKnownWorld(game.state, deps) as unknown as KnownWorldData;
  if (!known.player || !known.level) throw new Error("The play harness has no known player/level");
  const player = playerView(known.player, floors);
  const adapt = (item: Parameters<typeof itemView>[0]) => itemView(item, analyze);
  const { width, height } = known.level;
  const cells = new Map(known.level.cells.map((cell) => [cell.y * width + cell.x, cell]));
  const names = new Map((known.monsters ?? []).map((monster) => [`${monster.grid.x},${monster.grid.y}`, monster]));
  const monsters = core.trueMonsterViews(game.state, deps).flatMap((monster) => {
    if (!core.monsterIsObvious(game.state.monsters[monster.id]!)) return [];
    const named = names.get(`${monster.grid.x},${monster.grid.y}`);
    return named?.raceIndex === monster.raceIndex ? [{ ...monster, id: named.id }] : [];
  });
  const occupants = new Map(monsters.map((monster) => [monster.grid.y * width + monster.grid.x, monster.id]));
  return {
    ...raw,
    player: () => structuredClone(player),
    monsters: () => structuredClone(monsters),
    mapBounds: () => ({ width, height }),
    cell: (x, y) => {
      if (x < 0 || y < 0 || x >= width || y >= height) return null;
      const monster = player.grid.x === x && player.grid.y === y ? -1 : (occupants.get(y * width + x) ?? 0);
      const remembered = cells.get(y * width + x);
      if (!remembered) return { x, y, feat: 0, passable: false, inView: false, known: false,
        monster, objectCount: 0, knownObjectCount: 0, glow: false, trap: false };
      const memory = remembered.remembered;
      return { x, y, feat: memory.feat, passable: memory.passable, inView: remembered.visible,
        known: true, monster, objectCount: memory.objects.length, knownObjectCount: memory.objects.length,
        glow: remembered.glow, trap: memory.traps.some((trap) => !trap.disabled
          && game.booted.registries.traps?.[trap.index]?.flags.has(core.TRF.TRAP)),
        ...(memory.featCode === undefined ? {} : { featCode: memory.featCode }) };
    },
    inventory: () => (known.inventory ?? []).map(adapt),
    equipment: () => (known.equipment ?? []).map((item) => item === null ? null : adapt(item)),
    quiver: () => (known.quiver ?? []).map(adapt),
    floorItems: (x, y) => (x === player.grid.x && y === player.grid.y
      ? (known.floorHere ?? []) : (cells.get(y * width + x)?.remembered.items ?? [])).map(adapt),
    target: () => known.target === null ? null : { midx: known.target.monster ?? 0, grid: { ...known.target.grid } },
    stores: () => (known.stores ?? []).map((store) => ({ ...structuredClone(store),
      stock: store.stock.map((item) => ({ ...adapt(item), index: item.index,
        ...(item.price === undefined ? {} : { price: item.price }) })) })),
    spellbooks: () => structuredClone(known.spellbooks ?? []) as unknown as Core.SpellbookView[],
    simulateLoadout: (change) => {
      const result = raw.simulateLoadout?.(change);
      return result ? simulationView(floors)(core.knownLoadoutSimulation(game.state, result) as unknown as LoadoutSimulation) : null;
    },
  };
}

export function loadPack(dir: string): GamePack {
  const json = <T,>(name: string): T =>
    JSON.parse(readFileSync(join(dir, `${name}.json`), "utf8")) as T;
  const records = <T,>(name: string): T[] => json<{ records: T[] }>(name).records;
  const optionalRecords = <T,>(name: string): T[] => existsSync(join(dir, `${name}.json`)) ? records<T>(name) : [];
  return {
    constants: json("constants"),
    terrain: records("terrain"),
    roomTemplates: records("room_template"),
    vaults: records("vault"),
    dungeonProfiles: records("dungeon_profile"),
    /* FORK: Mandos #54, DEFECT in our loader. Match the desktop's full
     * GamePack: omitted shops changed initialization RNG and left the
     * benchmark playing a different world despite an identical seed. */
    chestTraps: records("chest_trap"),
    world: records("world"),
    projection: records("projection"),
    trap: records("trap"),
    messageTypes: optionalRecords("message_type"),
    tvals: optionalRecords("tval"),
    monsterSpells: records<{ type?: unknown }>("monster_spell").filter((record) => typeof record.type === "string"),
    names: records("names"),
    store: records("store"),
    quest: records("quest"),
    uiKnowledge: records("ui_knowledge"),
    hints: records("hints"),
    obj: {
      objectBase: json("object_base"),
      object: json("object"),
      egoItem: json("ego_item"),
      artifact: json("artifact"),
      curse: json("curse"),
      brand: json("brand"),
      slay: json("slay"),
      activation: json("activation"),
      objectProperty: json("object_property"),
      flavor: json("flavor"),
    } as GamePack["obj"],
    mon: {
      pain: records("pain"),
      blowMethods: records("blow_methods"),
      blowEffects: records("blow_effects"),
      monsterSpells: records("monster_spell"),
      monsterBases: records("monster_base"),
      monsters: records("monster"),
      summons: records("summon"),
      pits: records("pit"),
    },
    player: {
      races: records("p_race"),
      classes: records("class"),
      properties: records("player_property"),
      timed: records("player_timed"),
      shapes: records("shape"),
      bodies: records("body"),
      history: records("history"),
      realms: records("realm"),
    },
  } as unknown as GamePack;
}

/* ==================================================================
 * The shared loop: one Borg per life, one observing controller, one
 * counting rule - everything both drivers do identically
 * ================================================================== */

/**
 * FORK (Mandos #56): a life that stalled - the same command against the same
 * scene STALLS_BEFORE_RELEASE times, or no command IDLE_BEFORE_RELEASE times.
 * `decision` retains its historical name: the 1-based armed reply/attempt
 * that completed the stall, including replies with no command.
 */
export interface LifeStall {
  readonly kind: "repeat" | "idle";
  readonly command: string | null;
  readonly decision: number;
  readonly turn: number;
}

/** What one life's controller observed, asked of the LIVE game. */
interface LifeObservation {
  /** The command census: how many times each code was issued. */
  readonly commands: Record<string, number>;
  /** One entry per decision: where the character stood, and whether anything was in sight. */
  readonly trail: Array<{ at: string; alone: boolean; cmd: string }>;
  /** Distinct depth+grid occupied. A loop leaves this tiny. */
  readonly places: Set<string>;
  /** Every depth the character stood on. */
  readonly depths: Set<number>;
  /** Decisions on which the Borg chose to sit still with a monster adjacent. */
  restedBesideMonster: number;
  /**
   * The uncertainty journal (#27): how many decisions marked themselves
   * unsure, and the bounded tail of the points themselves. Collected beside
   * the census for the same reason - the record must be able to say where
   * the Borg was NOT sure, read from the world model the decisions ran on.
   */
  readonly unsure: {
    total: number;
    points: UnsurePoint[];
  };
  /** FORK (Mandos #56): the stall that ended this life, or null (src/loop/stall.ts). */
  readonly stall: LifeStall | null;
  /** Independent actual callback counters, never derived from the census map. */
  readonly issuedCommands: number;
  readonly attempts: number;
  readonly noCommandReplies: number;
  /** The last actual Borg decision's explicit stop, not an arbitrary null. */
  readonly stopReason: string | null;
  /** Arm the Borg for the next decision (the host's latch, main.ts). */
  arm(): void;
  /** Remove the controller (the engine restores the previous provider). */
  uninstall(): void;
}

/**
 * Install the Borg as the command provider, with the observation both
 * drivers share. Every question here is asked of the LIVE game rather than
 * of the Borg, so a Borg that has mislaid a monster cannot talk its way out
 * of the record: the census counts what the controller issued, the trail
 * notes where the character stood and whether anything was visible, and
 * resting beside a monster is counted as it happens.
 *
 * Exported for the death-replay driver (#29): a replay IS a life driven by
 * this same observation (the census it verifies against the record is this
 * census), so the replay rides the one copy rather than growing a second.
 */
/** Optional harness-only observation; absent for all existing callers. */
export interface LifeInstrumentation {
  readonly cfg?: Partial<BorgCfg>;
  readonly settingsRead?: (cfg: Readonly<BorgCfg>) => void;
  readonly event?: (event: unknown) => void;
}

export function observingLife(
  core: typeof Core,
  game: StartedGame,
  pack: GamePack,
  instrumentation?: LifeInstrumentation,
): LifeObservation {
  const state: GameState = game.state;
  /* FORK: Mandos #99 keeps the measurement on the shipped API2 item analysis. */
  const records = (value: unknown) => (value as { records: JsonRecord[] }).records;
  const analyze = itemAnalyzerFromRecords(records(pack.obj.object), records(pack.obj.egoItem),
    records(pack.obj.artifact), records(pack.obj.objectProperty));
  // The real host marks a character when its autoplayer takes control.
  state.actor.player.noscore |= core.NOSCORE.BORG;
  const resolver = new core.ContentIdResolver({
    objects: game.booted.registries.objects,
    playerRaces: game.players.races,
    playerClasses: game.players.classes,
  });
  const borg = createBorg({
    ...(instrumentation?.cfg === undefined ? {} : { cfg: instrumentation.cfg }),
    /* FORK: Mandos #54, DEFECT in our measurement/replay driver. Use the
     * shipped plugin's default private stream; hashing the world seed here
     * made this a different Borg even with an identical game state. Tests
     * can still exercise explicit private seeds through createBorg. */
    resolvers: makeCoreResolvers({
      bookKind: (tval, name) => {
        const kind = game.booted.registries.objects.kinds.find((kind) => kind.tval === tval && kind.name === name);
        return kind ? { tval, sval: kind.sval } : null;
      },
      spellEffect: (cls, sidx) => {
        const spell = game.players.classes.find((entry) => entry.name === cls)?.magic.books
          .flatMap((book) => book.spells).find((entry) => entry.sidx === sidx);
        const effect = spell?.effectsRaw[0] as { eff?: string } | undefined;
        return effect?.eff ? { name: effect.eff, aim: core.EFFECT_ENTRIES.find((entry) => entry.name === effect.eff)?.aim ?? false } : null;
      },
      races: game.booted.registries.monsters.races,
      objects: game.booted.registries.objects,
      state: state as never,
      /* The attack-message table, on the same terms plugin.ts wires it. Without
       * it the Borg does not recognise being hit by something it cannot see, so
       * a run measured without it is a run measured on a different Borg. */
      blowMethods: game.booted.registries.monsters.blowMethods.values(),
    }),
  });
  instrumentation?.settingsRead?.({ ...borgCfg() });
  /* FORK Mandos198: shadow ItemViews need the same public description as
   * the host so KnownItem fuel survives hypothetical loadout conversion. */
  const viewDeps: Core.AgentViewDeps = { resolver, reg: game.booted.registries.objects,
    describe: obj => core.describeObject(state, obj, core.ODESC.PREFIX | core.ODESC.FULL) };
  const floors = playGradeFloors(game);

  /* The latch the host installs for the same reason (main.ts): runGameLoop
   * asks nextCommand for as long as the player has energy, so a controller
   * that always answers never lets the loop return. */
  let armed = false;
  const commands: Record<string, number> = {};
  const trail: Array<{ at: string; alone: boolean; cmd: string }> = [];
  const places = new Set<string>();
  const depths = new Set<number>([state.chunk.depth]);
  let restedBesideMonster = 0;
  /* The uncertainty journal (#27): observation-only, the same standing the
   * census and the trail keep. assessUncertainty draws nothing - it reads the
   * valuation the attack chooser already recorded and the world model the
   * decision already ran on - so the driven life is exactly what it was. */
  const unsure = { total: 0, points: [] as UnsurePoint[] };
  /* FORK (Mandos #56): the mod's stall watch, the same copy the tick uses -
   * the forget step at STALLS_BEFORE_FORGET repeats, and the stall itself,
   * which ends the life here where the tick releases the keyboard. */
  const watch = createStallWatch();
  let stall: LifeStall | null = null;
  let decision = 0;
  let issuedCommands = 0;
  let noCommandReplies = 0;
  const session = core.installController(
    state,
    (legacyView, legacyAct) => {
      if (!armed) return null;
      armed = false;
      const view = playView(core, game, legacyView, viewDeps, floors, analyze);
      const act = { ...legacyAct, setTargetMonster: (id: number) => {
        const actual = core.knownMonsterMidx(state, id);
        return actual === null ? false : legacyAct.setTargetMonster(actual);
      } };
      // Observation hooks do not change target arguments, results or order.
      if (instrumentation?.event !== undefined) {
        const targetMonster = act.setTargetMonster;
        act.setTargetMonster = (id) => {
          const accepted = targetMonster(id);
          instrumentation.event?.({ type: "target_monster", args: { id }, accepted });
          return accepted;
        };
        const targetLocation = act.setTargetLocation;
        act.setTargetLocation = (x, y) => {
          targetLocation(x, y);
          instrumentation.event?.({ type: "target_location", args: { x, y } });
        };
      }
      const cmd = borg.controller(view, act);
      if (cmd !== null) instrumentation?.event?.({ type: "command", command: cmd });
      if (cmd) {
        issuedCommands++;
        commands[cmd.code] = (commands[cmd.code] ?? 0) + 1;
      } else {
        noCommandReplies++;
      }
      decision += 1;
      const step = watch.observe(cmd === null ? "" : sceneKey(view), cmd);
      if (step.forget && cmd !== null) {
        const aim = aimedGrid(cmd, view.player().grid);
        if (aim !== null) forgetGrid(borg.world, aim.x, aim.y);
      }
      if (step.stalled !== null && stall === null) {
        stall = { kind: step.stalled.kind, command: step.stalled.command, decision, turn: state.turn };
      }
      if (cmd !== null) {
        const point = assessUncertainty(borg.world, view, cmd);
        if (point !== null) {
          unsure.total += 1;
          unsure.points.push(point);
          if (unsure.points.length > MAX_UNSURE_KEPT) unsure.points.shift();
        }
      }

      let alone = true;
      let adjacent = false;
      const me = state.actor.grid;
      for (const m of view.monsters()) {
        if (!m.visible) continue;
        alone = false;
        if (Math.max(Math.abs(m.grid.x - me.x), Math.abs(m.grid.y - me.y)) <= 1) {
          adjacent = true;
        }
      }
      if (adjacent && cmd?.code === "rest") restedBesideMonster += 1;
      trail.push({
        at: `${String(state.chunk.depth)}:${String(me.x)},${String(me.y)}`,
        alone,
        cmd: cmd?.code ?? "none",
      });
      return cmd;
    },
    { viewDeps },
  );

  return {
    commands,
    trail,
    places,
    depths,
    unsure,
    get restedBesideMonster(): number {
      return restedBesideMonster;
    },
    get stall(): LifeStall | null {
      return stall;
    },
    get issuedCommands() { return issuedCommands; },
    get attempts() { return decision; },
    get noCommandReplies() { return noCommandReplies; },
    get stopReason() { return borg.world.stopReason; },
    arm: () => {
      armed = true;
    },
    uninstall: () => session.uninstall(),
  };
}

/**
 * One driven life: the shared loop body, with the ONE counting rule (#36).
 *
 * `visit` (#29, observation-only, optional) is called at the TOP of each
 * iteration - after the previous decision completed and its turns elapsed,
 * before the next decision is armed. The death-replay driver passes one to
 * freeze the post-mortem capture at each ladder rung's release boundary (the
 * first boundary at or after T-N); both session drivers pass nothing, and a
 * call that only READS cannot move play, so the driven lives are exactly
 * what they were.
 */
export function driveLife(
  core: typeof Core,
  game: StartedGame,
  decisions: number,
  life: LifeObservation,
  seed: number,
  stage: StageDefinition | undefined = undefined,
  visit: (() => void) | undefined = undefined,
  measurement?: { readonly turnCap?: number; readonly afterLoop?: (status: ReturnType<typeof Core.runGameLoop>) => void },
): { dead: boolean; taken: number; attained: boolean; attempts: number; noCommandReplies: number; stopped: string | null } {
  const state: GameState = game.state;
  let dead = false;
  let attained = false;
  let stopped: string | null = null;
  let taken = 0;
  /** The stage watch (#25): the same sticky facts the mod's tick reads -
   * level and maxDepth from the LIVE player - asked before each decision
   * the way the tick asks before it decides, so the first wait of an
   * already-attained life retires at once and a mid-life attainment spends
   * no further decision. */
  const attainedNow = (): boolean =>
    stage !== undefined && stageAttained(stage, { clvl: state.actor.player.lev, maxDepth: state.actor.player.maxDepth });
  // Cap Core loop calls, not just commands: null replies must not add an
  // unbounded number of extra attempts to the requested budget.
  for (let calls = 0; calls < decisions; calls++) {
    visit?.();
    // Core can advance multiple game ticks in one call: stop at its next boundary.
    if (measurement?.turnCap !== undefined && state.turn >= measurement.turnCap) break;
    if (attainedNow()) {
      attained = true;
      break;
    }
    life.arm();
    const status = core.runGameLoop(state, game.registry);
    measurement?.afterLoop?.(status);
    // Command replies are counted independently from their per-code census.
    // This still includes the killing command; empty replies stay attempts.
    taken = life.issuedCommands;
    life.places.add(
      `${String(state.chunk.depth)}:${String(state.actor.grid.x)},${String(state.actor.grid.y)}`,
    );
    life.depths.add(state.chunk.depth);
    if (status === core.LOOP_STATUS.DEAD) {
      dead = true;
      break;
    }
    if (life.stopReason !== null) {
      stopped = life.stopReason;
      break;
    }
    /* #56: arbitrary nulls retain the existing 25-idle wait; repeat stalls
     * remain stalls, not a newly invented explicit Borg stop. */
    if (life.stall !== null) break;
    if (status === core.LOOP_STATUS.DEATH_CONFIRM) {
      state.pendingDeath?.resolve(true);
      continue;
    }
    if (status === core.LOOP_STATUS.LEVEL_CHANGE) {
      game.changeLevel(state.targetDepth ?? state.chunk.depth + 1);
      state.generateLevel = false;
      life.depths.add(state.chunk.depth);
    }
  }
  /* Attainment noticed only after the budget ran out (the last decision
   * completed it) still counts: the mod's next wait would retire it. A
   * DEAD run never does - death breaks the loop first and the killing
   * decision cannot newly complete an attainment. */
  if (!attained && !dead && stopped === null && attainedNow()) attained = true;

  /* The census, counted independently of `taken` (it counts commands as
   * the controller issues them, not loop iterations), must agree with it:
   * a disagreement means the record is about to lie, and the honest failure
   * is to fail the session rather than commit it (#36's required assertion,
   * in the driver so every caller - test, runners, sweeps - inherits it). */
  const issued = Object.values(life.commands).reduce((total, count) => total + count, 0);
  if (issued !== taken || life.attempts !== taken + life.noCommandReplies) {
    throw new Error(
      `seed ${String(seed)}: the census counts ${String(issued)} commands over ${String(taken)} decisions (${String(life.attempts)} armed attempts, ${String(life.noCommandReplies)} no-command replies) - the record would disagree with the game`,
    );
  }
  return { dead, taken, attained, attempts: life.attempts, noCommandReplies: life.noCommandReplies, stopped };
}

/**
 * The tightest ground a life covered in any 60-decision stretch while
 * NOTHING was visible and the Borg was not resting.
 *
 * Resting and dropping are EXCLUDED, and the exclusions are the whole reason
 * this number means anything. Both keep a character on one square while
 * making real progress, so counting them turns patience into a false alarm.
 *
 * `rest` maps to a single-turn hold in this engine, so a character healing up
 * spends sixty decisions standing still - upstream's `R&` rendered one
 * decision at a time, not a loop. `drop` discards one item from a stack per
 * command in the C too (borg-junk.c:472-475), so emptying a stack of forty
 * arrows is forty decisions on one grid, and that is upstream's own pace.
 *
 * What is left is the Borg deciding, over and over, to go somewhere it has
 * just been with nothing in sight to hold it there. A genuine runaway drop is
 * still caught, by the single-command cap above. 999 when no such stretch
 * occurred.
 */
function jitterOf(life: LifeObservation): number {
  const moving = life.trail.filter((t) => t.cmd !== "rest" && t.cmd !== "drop");
  const WINDOW = 60;
  let jitter = 999;
  for (let i = 0; i + WINDOW <= moving.length; i++) {
    const win = moving.slice(i, i + WINDOW);
    if (win.some((t) => !t.alone)) continue;
    const cells = new Set(win.map((t) => t.at)).size;
    if (cells < jitter) jitter = cells;
  }
  return jitter;
}

/** What a run did, in the terms a stall shows up in. */
export interface RunReport extends BirthReplayData {
  /** The game seed this character was born under. */
  seed: number;
  /** 1-based life number within the seed's session (one character per life). */
  life: number;
  /** The character's race, as the pack named it. */
  race: string;
  /** The character's class, as the pack named it. */
  class: string;
  /** stat_birth at birth, in the pack's stat order (str int wis dex con here). */
  baseStats: number[];
  /** Decisions taken before the run ended. */
  decisions: number;
  /** Game turns elapsed this life. A stall that costs no energy leaves this flat. */
  turns: number;
  /** Every depth the character stood on. */
  depths: number[];
  /** max(depths): the run record's headline number (docs/runs/README.md). */
  maxDepth: number;
  /** Character level at end of run. */
  clvl: number;
  /** Gold carried at end of run. */
  gold: number;
  /** Monsters this character killed (counted at the engine's onPlayerKill). */
  kills: number;
  /** How many times each command code was issued. */
  commands: Record<string, number>;
  /** Distinct depth+grid the character occupied. A loop leaves this tiny. */
  places: number;
  /** Whether the character died (an ending, not a failure). */
  dead: boolean;
  /** player->died_from when dead, else null: the killer as the game named it. */
  causeOfDeath: string | null;
  /**
   * The fewest distinct squares any 60-decision stretch covered while NOTHING
   * was visible and the Borg was not resting. This is "sitting there or moving
   * frantically back and forth across three cells" written as a number: a Borg
   * with no monster in sight has nothing to hold it in place, so a low value is a
   * decision loop and not caution. 999 when no such stretch occurred.
   */
  jitter: number;
  /** Decisions on which the Borg chose to sit still with a monster adjacent. */
  restedBesideMonster: number;
  /** #56, additive: present only when the life stalled. */
  stall?: LifeStall;
  /** #47, additive: present for attempts that did not issue a command. */
  attempts?: number;
  noCommandReplies?: number;
  /** #47, an explicit Borg stop reason; not death or an ordinary idle stall. */
  stopped?: string;
  /**
   * The uncertainty journal (#27, additive in spirit - records before it
   * carry no `unsure` key): how many decisions marked themselves unsure, and
   * the bounded tail of the points. Raw facts: the aggregation a post-mortem
   * or a reader layer does over them is derived, and lives elsewhere.
   */
  unsure: { total: number; points: UnsurePoint[] };
  /**
   * Whether this run attained the session's stage (#25): character level
   * and first-arrival depth both at or past its thresholds. False when the
   * session played no stage.
   */
  stageAttained: boolean;
  /**
   * Whether the retire flow kept a save of this run (#25): the pack driver
   * runs the protocol and renames the slot into the library; the STOCK
   * driver measures attainment only and never keeps saves, so its runs
   * always record false here even when they attained.
   */
  retired: boolean;
  /**
   * Wall-clock time the life took. METADATA, never a fact: it varies with the
   * machine and never influences a number above (rule 5).
   */
  wallClockMs: number;
}

/** One seed's session: the lives the runner asked for, in order. */
export interface SessionReport {
  seed: number;
  runs: RunReport[];
}

export interface PlaySessionOptions {
  /** The game seed: it fixes the dungeon AND the Borg's private stream. */
  seed: number;
  /** Characters to play in this session (default 1). See playSession. */
  lives?: number;
  /** Decision budget per life. */
  decisions: number;
  /**
   * The stage this session measures (#25), if any. With a stage, a life
   * that attains ENDS THERE (the analog of the mod's retire: the stock
   * driver keeps no saves, it measures) and its run records
   * `stageAttained: true`; without one the loop is exactly what B02 shipped
   * and every run records `stageAttained: false`.
   */
  stage?: StageDefinition;
}

/**
 * Play one seed's session of the STOCK Borg: one game boot, then one
 * character per life.
 *
 * A LIFE is one character. It ends at death (the ending the harness counts) or
 * when its decision budget runs out, whichever comes first; the next life, if
 * any, is the engine's own `reincarnate` - the borg's respawn
 * (borg-reincarnate.c), wiping the player in place and rolling a new one in
 * the SAME session, with the turn counter and the RNG stream carried forward.
 * That is the only honest way a deterministic engine can offer "N lives per
 * seed": a second fresh boot of the same seed would replay the first life
 * bit-for-bit, while a reincarnation is a genuinely new draw that is still a
 * pure function of the seed. The published beta.3 startGame default first
 * birth is Human Warrior; only subsequent reincarnations roll race/class
 * (BORG_RESPAWN_RACE/CLASS are -1 unless configured). Each entry records the
 * actual pair. The historical comment describing the first birth as rolled
 * was inaccurate; the instrument does not change that existing behavior.
 *
 * The turn tail is the host's job in the real shell (main.ts); here it is the
 * three lines inside the loop, which is all a level change needs when nothing
 * has to be drawn.
 */
export function playSession(
  core: typeof Core,
  pack: GamePack,
  opts: PlaySessionOptions,
): SessionReport {
  const lives = opts.lives ?? 1;
  const game = core.startGame(pack, { seed: opts.seed, depth: 0 });
  const state: GameState = game.state;

  /* B02's one observational wrap: count kills at the engine's own
   * player_kill_monster seam, then hand the kill to the handler the session
   * installed. The wrap draws no RNG and reorders nothing, so play is
   * untouched - without it the run record has no kills column and the census
   * has to be inferred.
   */
  const tally = { kills: 0 };
  const engineOnPlayerKill = state.onPlayerKill;
  state.onPlayerKill = (mon) => {
    tally.kills += 1;
    engineOnPlayerKill?.(mon);
  };

  const runs: RunReport[] = [];
  for (let life = 1; life <= lives; life++) {
    /* The Borg starts each life as it started the first: the plugin's default
     * private stream, fresh world model (the previous character's
     * map is not this character's knowledge), fresh resolvers. */
    const observed = observingLife(core, game, pack);
    const turnStart = state.turn;
    const startedAt = Date.now();

    const { dead, taken, attained, attempts, noCommandReplies, stopped } = driveLife(core, game, opts.decisions, observed, opts.seed, opts.stage);

    const player = state.actor.player;
    const depthsSorted = [...observed.depths].sort((a, b) => a - b);
    runs.push({
      seed: opts.seed,
      ...birthReplayDataOf(state),
      ...(state.options === undefined ? {} : { birthOptions: state.options.snapshot().birth }),
      life,
      race: player.race.name,
      class: player.cls.name,
      baseStats: [...player.statBirth],
      decisions: taken,
      ...(attempts === taken ? {} : { attempts, noCommandReplies }),
      ...(stopped === null ? {} : { stopped }),
      turns: state.turn - turnStart,
      depths: depthsSorted,
      maxDepth: depthsSorted[depthsSorted.length - 1] ?? 0,
      clvl: player.lev,
      gold: player.au,
      kills: tally.kills,
      commands: observed.commands,
      places: observed.places.size,
      dead,
      causeOfDeath: dead ? player.diedFrom : null,
      jitter: jitterOf(observed),
      restedBesideMonster: observed.restedBesideMonster,
      ...(observed.stall === null ? {} : { stall: observed.stall }),
      unsure: { total: observed.unsure.total, points: [...observed.unsure.points] },
      stageAttained: attained,
      retired: false,
      wallClockMs: Date.now() - startedAt,
    });
    tally.kills = 0;

    /* The next life rolls a fresh character in this same session. uninstall
     * first so the controller seam is clean (the engine restores the previous
     * provider; installing over an install would chain two borgs). An
     * attained life ends the same way a death does here: the stock driver
     * measures the stage, it does not keep saves - the mod's retire keeps
     * those. */
    observed.uninstall();
    if (stopped !== null) break;
    if (life < lives) game.reincarnate();
  }

  return { seed: opts.seed, runs };
}

/**
 * One life of one seed - the shape the suite's per-seed tests want. Exactly
 * playSession with lives 1, returning the single run. The optional stage
 * (#25) is the reach-rate's rung: an attained life stops at attainment and
 * records it.
 */
export function playRun(
  core: typeof Core,
  pack: GamePack,
  seed: number,
  decisions: number,
  stage?: StageDefinition,
): RunReport {
  return playSession(core, pack, { seed, decisions, lives: 1, ...(stage === undefined ? {} : { stage }) }).runs[0]!;
}

/* ==================================================================
 * The pack session: planned births chained on deaths, the journal and
 * graveyard installed per life (ported from neowarrior-borg's
 * src/records/session.ts, v0.1.0 e1ec1b7)
 * ================================================================== */

/** An in-memory character slot, the stand-in for `mod.store.character`. */
function characterSlot(): Api2Slot & { held(): JsonValue | null } {
  let value: JsonValue | null = null;
  return {
    get: () => Promise.resolve({ ok: true as const, value: structuredClone(value) }),
    set: (next) => {
      value = structuredClone(next);
      return Promise.resolve({ ok: true as const, value: null });
    },
    held: () => value,
  };
}

/**
 * The session's install slot, the stand-in for `mod.store.install`: ONE for
 * the whole session, outliving every character's bag the way the host's
 * install storage outlives every character (#34). The graveyard archive
 * lives here, so the record of a run that ended survives that character's
 * own save - which the next iteration's fresh `characterSlot` stands in for
 * the host deleting.
 */
function installSlot(): Api2Slot & { held(): JsonValue | null } {
  return characterSlot();
}

/**
 * The events domain the journal subscribes through, over the engine's own
 * bus: the payload the engine emits for `dungeonlevel` IS the API's
 * Api2LevelEvent shape, so the journal hears the real arrivals, never a
 * simulation of them.
 */
function eventsOverBus(bus: GameEvents): Pick<Api2Events, "on" | "off"> {
  const handlers = new Map<string, (type: "dungeonlevel", data: DungeonLevelEventData) => void>();
  let serial = 0;
  return {
    on: (name: string, listener: (payload: never) => void) => {
      if (name !== "dungeonlevel") {
        return Promise.resolve({
          ok: false as const,
          reason: "not-granted" as const,
          capability: `event:${name}`,
          message: `the headless host carries no ${name} event`,
        });
      }
      serial += 1;
      const id = `dungeonlevel:${String(serial)}`;
      const handler = (_type: "dungeonlevel", data: DungeonLevelEventData): void => {
        listener(data as never);
      };
      handlers.set(id, handler);
      bus.on("dungeonlevel", handler);
      return Promise.resolve({ ok: true as const, value: { id } });
    },
    off: (subscription: Api2Subscription) => {
      const handler = handlers.get(subscription.id);
      if (handler !== undefined) {
        bus.off("dungeonlevel", handler);
        handlers.delete(subscription.id);
      }
      return Promise.resolve({ ok: true as const, value: null });
    },
  } as unknown as Pick<Api2Events, "on" | "off">;
}

/**
 * The run report the harness writes at a death, every real field read from
 * the player the engine just killed: the killer is the player's own
 * died-from, the score is the engine's own formula (totalPoints, score.c
 * L28), the build is the birth stats the engine stored at birth. The fields
 * a bare engine has no host surface for (history, messages, belongings, the
 * sheet) are empty: this is the report of a headless session and claims
 * nothing else.
 */
function runReportOf(core: typeof Core, state: GameState, outcome: SdkRunReport["outcome"], knownSeed: number): SdkRunReport & { readonly seed: number } {
  const player = state.actor.player;
  const name = player.fullName.length > 0 ? player.fullName : "Borg";
  return {
    outcome,
    cause: player.diedFrom,
    /* A bare engine has no host naming the save's key, so the report says
     * null rather than inventing one - the archive's unknown-run rule
     * (append, never dedupe) is built for exactly this shape. */
    key: null,
    name,
    race: player.race.name,
    cls: player.cls.name,
    level: player.lev,
    maxLevel: player.maxLev,
    maxDepth: player.maxDepth,
    depth: state.chunk.depth,
    gold: player.au,
    turn: state.turn,
    /* The harness knows the seed it passed to this fresh startGame call.
     * Stock hosts need not expose seed/birth provenance; do not require PR #433. */
    seed: knownSeed >>> 0,
    ...birthReplayDataOf(state),
    ...(state.options === undefined ? {} : { birthOptions: state.options.snapshot().birth }),
    score: core.totalPoints(player),
    scored: false,
    endedAt: 0,
    history: [],
    messages: [],
    belongings: [],
    sheet: null,
    birth: { race: player.race.name, cls: player.cls.name, name, stats: [...player.statBirth] },
  };
}

/** The kills the game itself counted: per-race pkills, summed. */
function killsOf(state: GameState): number {
  let kills = 0;
  for (const lore of state.lore.values()) kills += lore.pkills;
  return kills;
}

/** One pack character's life, with its records read back from the journal's slots. */
export interface SessionLife extends BirthReplayData {
  readonly seed: number;
  /** 1-based life number within the session (one character per life). */
  readonly life: number;
  /** Whether the character died (the event that boots the next one). */
  readonly dead: boolean;
  readonly decisions: number;
  readonly turns: number;
  /** Deepest depth the LIVE player says it reached. */
  readonly maxDepth: number;
  /**
   * The depth the live chunk carried when the run ended - the level a death
   * happened on (0 = town), or where a survivor stood when its slice ran out.
   * A town-versus-dungeon death split reads this, never a guess from maxDepth
   * (a character can die in town after visiting the dungeon).
   */
  readonly endDepth: number;
  /** Character level at end of run (the live player's). */
  readonly clvl: number;
  /** Monsters slain, from the game's own lore counters. */
  readonly kills: number;
  readonly gold: number;
  /** The killer as the game reported it (died-from), only when dead. */
  readonly causeOfDeath: string | null;
  readonly race: string;
  readonly className: string;
  readonly baseStats: readonly number[];
  /** The command census: how many times each command code was issued. */
  readonly commands: Record<string, number>;
  /** Every depth the character stood on, observed from the live game. */
  readonly depthsVisited: readonly number[];
  /** Distinct depth+grid the character occupied - the shared observation, so the ONE record writer can take a pack life as a stock run. */
  readonly places: number;
  /** The tightest 60-decision monster-free stretch's ground (999 = none); see jitterOf. */
  readonly jitter: number;
  /** Decisions on which the Borg chose to sit still with a monster adjacent. */
  readonly restedBesideMonster: number;
  /** #56, additive: present only when the life stalled. */
  readonly stall?: LifeStall;
  readonly attempts?: number;
  readonly noCommandReplies?: number;
  readonly stopped?: string;
  /**
   * The uncertainty journal (#27), the stock RunReport's own field: the
   * total and the bounded tail, from the same observation both drivers share.
   */
  readonly unsure: { readonly total: number; readonly points: readonly UnsurePoint[] };
  /**
   * Wall-clock time the life took. METADATA, never a fact (rule 5) - the
   * same standing the stock RunReport's wallClockMs has.
   */
  readonly wallClockMs: number;
  /**
   * The (level, turn) the live game carried at each arrival, keyed by depth -
   * what the journal's milestone stamps must match, read independently of it.
   */
  readonly arrivalStamps: ReadonlyMap<number, { readonly level: number; readonly turn: number }>;
  /** The journal as it stood in the character's slot at the end of the life. */
  readonly journal: BorgJournalData | null;
  /**
   * Whether this life attained the session's stage (#25): character level
   * and first-arrival depth both at or past its thresholds. False when the
   * session played no stage.
   */
  readonly stageAttained: boolean;
  /**
   * Whether the retire protocol KEPT a save of this life (#25): the slot
   * was renamed into its library name and the next character starts, the
   * same protocol the mod's restart loop runs. An attained life whose
   * protocol refused (a refused save, here as in the mod) records
   * `stageAttained: true, retired: false` - the honest split between the
   * fact and the bookkeeping.
   */
  readonly retired: boolean;
  /**
   * The graveyard entries this life's report added to the INSTALL archive
   * (#34): empty for a survivor, one entry for a character that died. Read
   * from the install slot - the storage that survives the character - never
   * from the character's own bag, which the host deletes at the death.
   */
  readonly graveyard: readonly ArchivedRun[];
}

/** A whole pack session: the lives in play order, chained by deaths. */
export interface SessionOutcome {
  readonly lives: readonly SessionLife[];
  /**
   * The LIBRARY (#25): one entry per retired life - the kept, renamed
   * roster slot, named with the seed the ladder (#26) maps its per-seed
   * cohorts by. The graveyard's mirror: failures below, successes here.
   */
  readonly library: readonly LibrarySlot[];
  /**
   * The install archive as it stands after the session: every ended run,
   * still readable now that every character's own bag is gone - the property
   * #34 exists to give the record (#34's required read is exactly this one,
   * after the last character's storage no longer exists).
   */
  readonly graveyard: readonly ArchivedRun[];
}

/** One kept save of a retired run (#25), as the harness's roster modeled it. */
export interface LibrarySlot {
  /** The slot's library name (`M s<seed> <stage>`; src/loop/stage.ts). */
  readonly name: string;
  /** The seed the run played under - the name's identity segment. */
  readonly seed: number;
}

/** How a pack session is asked for. */
export interface PackSessionOptions {
  /** #54: one recorded character's accepted birth input, for a verified replay/control. */
  birthInput?: BirthReplayData;
  /** The seeds to play, in order; each character boots only behind its predecessor's death or retirement. */
  readonly seeds: readonly number[];
  /** The decision cap for each life. */
  readonly capFor: (seed: number) => number;
  /** The race to birth; the pack's default candidate when omitted. */
  readonly raceName?: string;
  /**
   * The stage this session's lineage grinds toward (#25). Without it the
   * session is exactly what B15 ported: play to death or cap, no retire.
   * With it, an attained life runs the retire protocol (save, rename into
   * the library, next character) - the same `retireAtStage` the mod's loop
   * runs - and the lives record attainment.
   */
  readonly stage?: StageDefinition;
  /** Where the harness's log lines go (the mod's own log when it has one). */
  readonly log?: (message: string) => void;
}

/**
 * Play a session of the pack's planned characters: boot (the presenter's
 * build, through the pack's one plan), play to death or cap, record (journal
 * milestones from the engine's own arrival events, the graveyard entry
 * awaited before the next boot - the loop's journal-before-create ordering),
 * and return everything the tests and the run-record writer read. A
 * character that survives its cap ENDS the session: the real loop sequences
 * on death, and a session record must not pretend otherwise.
 */
export async function playPackSession(
  core: typeof Core,
  pack: GamePack,
  strategy: StrategyPack,
  options: PackSessionOptions,
): Promise<SessionOutcome> {
  const birth = birthReplayDataOf(options.birthInput);
  if (options.birthInput !== undefined && options.seeds.length !== 1) {
    throw new Error("A recorded birth input belongs to exactly one seed");
  }
  if ((options.birthInput?.birthRngState !== undefined && birth.birthRngState === undefined)
    || (options.birthInput?.birthOptions !== undefined && birth.birthOptions === undefined)) {
    throw new Error("Invalid accepted-birth input");
  }
  /* The port's engine constants (FEAT, TV, ...) are live bindings that the
   * host fills from the engine it hands the mod; the vitest setup file
   * stands in for that in tests, and here the session binds the one engine
   * it drives - the same published copy the tests import. */
  if (!coreIsBound()) bindCore(core);
  const plan = strategy.planFor(core, pack, options.raceName ?? strategy.defaultRaceName);
  const say = options.log ?? ((): void => undefined);
  const lives: SessionLife[] = [];
  /* The session's ONE install slot (#34): every life's journal archives its
   * ended run here, exactly as the mod archives into mod.store.install - the
   * storage whose lifetime survives each character. The per-life character
   * slots below are created fresh per iteration, which is the harness's
   * stand-in for the host deleting the dead character's save. */
  const install = installSlot();
  const archivedSoFar = (): readonly ArchivedRun[] =>
    graveyardArchiveOf((install.held() !== null && typeof install.held() === "object" && !Array.isArray(install.held())
      ? (install.held() as Record<string, JsonValue>)[GRAVEYARD_KEY] ?? null
      : null)).runs;

  /* THE ROSTER the retire protocol drives (#25): the harness's model of the
   * host's save slots. One alive slot per character, fresh per life (the
   * host's create makes a new one); `session.save` stamps the live slot
   * newest and `saves.rename` renames it in place - the same behavior
   * harness-api2.ts models for the plugin tests, kept in one shape so the
   * protocol's find-the-slot leg is exercised identically in both. The
   * play clock is a counter, never the wall clock (rule 5). */
  const library: LibrarySlot[] = [];
  let playClock = 0;

  for (const seed of options.seeds) {
    const previous = lives[lives.length - 1];
    if (previous !== undefined && !previous.dead && !previous.retired) {
      say(`the session stops at seed ${String(previous.seed)}: that character ${previous.stopped !== undefined ? `stopped: ${previous.stopped}` : previous.stall !== undefined ? `stalled (${previous.stall.kind})` : "survived its slice"}, so the loop would never have booted seed ${String(seed)}`);
      break;
    }

    const game: StartedGame = core.startGame(pack, {
      seed,
      depth: 0,
      raceName: plan.raceName,
      className: strategy.className,
      roller: "point",
      birthStats: [...plan.baseStats],
      ...(birth.birthRngState === undefined ? {} : { rngState: birth.birthRngState }),
      ...(birth.birthOptions === undefined ? {} : { optionOverrides: birth.birthOptions }),
    });
    const state: GameState = game.state;
    /* The host's event bus, attached before anything can arrive on a level:
     * the engine emits `dungeonlevel` into it at every changeLevel, and the
     * session's first arrival comes from announceArrival below. */
    const bus = new core.GameEvents();
    state.events = bus;

    /* The harness's OWN eyes on the game, independent of the journal: every
     * arrival the engine announces is captured with the live player's level
     * and the live turn, so the journal's stamps can be checked against the
     * game rather than against themselves. */
    const arrivalStamps = new Map<number, { level: number; turn: number }>();
    bus.on("dungeonlevel", (_type, event) => {
      if (!arrivalStamps.has(event.depth)) {
        arrivalStamps.set(event.depth, { level: state.actor.player.lev, turn: state.turn });
      }
    });

    /* The journal, on the same seams the plugin wires: this character's slot,
     * the events domain, and stamps read from the live game at the arrival -
     * and the session's install slot as the graveyard archive. */
    const slot = characterSlot();
    const journal = installBorgJournal({
      slot,
      archive: install,
      log: say,
      events: eventsOverBus(bus),
      stamps: async () => ({ level: state.actor.player.lev, turn: state.turn }),
    });

    /* The host's duty for the session's first arrival: exactly once, after
     * the listeners are attached and before the first changeLevel. */
    game.announceArrival();

    const observed = observingLife(core, game, pack);
    const startedAt = Date.now();
    const { dead, taken, attained, attempts, noCommandReplies, stopped } = driveLife(core, game, options.capFor(seed), observed, seed, options.stage);

    /* THE RETIRE PROTOCOL (#25) for a life that attained: the same
     * `retireAtStage` the mod's loop runs, over this harness's roster
     * model - save the live slot, rename it into its library name (the
     * seed is the name's identity segment: the ladder, #26, maps its
     * per-seed cohorts by it), arm the birth flag in the shared install
     * slot, and answer whether the keep landed. A death needs none of
     * this: the graveyard entry below is its record. */
    let retired = false;
    if (attained && options.stage !== undefined) {
      const saveSlot = {
        id: `slot-${String(lives.length + 1)}`,
        name: "Borg",
        race: state.actor.player.race.name,
        cls: strategy.className,
        level: state.actor.player.lev,
        depth: state.chunk.depth,
        dead: false,
        lastPlayed: 0,
      };
      const outcome = await retireAtStage(
        {
          slot: install,
          log: say,
          create: () => Promise.resolve({ ok: true as const, value: null }),
          save: () => {
            playClock += 1;
            saveSlot.level = state.actor.player.lev;
            saveSlot.depth = state.chunk.depth;
            saveSlot.lastPlayed = 1000 + playClock; /* newest, always */
            return Promise.resolve({ ok: true as const, value: null });
          },
          listSaves: () => Promise.resolve({ ok: true as const, value: [structuredClone(saveSlot)] }),
          rename: (id: string, name: string) => {
            if (id !== saveSlot.id || name.length > 15) {
              return Promise.resolve({ ok: false as const, reason: "refused" as const, code: "refused", message: "the roster refused" });
            }
            saveSlot.name = name;
            return Promise.resolve({ ok: true as const, value: null });
          },
        },
        {
          clvl: state.actor.player.lev,
          depth: state.chunk.depth,
          slotName: librarySlotName(options.stage, { seed }),
        },
      );
      retired = outcome === "retired";
      if (retired) library.push({ name: saveSlot.name, seed });
    }

    /* The graveyard entry for this life, BEFORE anything that would stand in
     * for the loop's create (here: the next iteration's startGame) - the
     * record cannot be lost to a teardown that follows. It lands in the
     * INSTALL archive (#34), so the next life - and any later page - can
     * still read it after this character's bag is gone. */
    const archivedBefore = archivedSoFar();
    if (dead) await journal.graveyard(runReportOf(core, state, "death", seed));
    /* The load re-fire the docs warn about (MOD_SEAMS 4l and 4w): every depth the
     * character visited, re-announced as a session's first level the way a
     * loaded save re-announces it. The dedup rule must leave the milestones
     * untouched; the assertion lives in the test, over the slot's contents. */
    for (const depth of observed.depths) {
      bus.emit("dungeonlevel", { depth, levelId: state.levelSerial ?? 0, cause: "load", arena: false } satisfies DungeonLevelEventData);
    }
    await journal.stop();

    /* This life's archived entries: what the install archive gained while
     * this character lived (its one report, if it died). Read from the
     * archive AFTER the awaited write, so the assertion is over the record a
     * later page would read - not over what the writer promised. */
    const archived = archivedSoFar();

    lives.push({
      seed,
      ...birthReplayDataOf(state),
      ...(state.options === undefined ? {} : { birthOptions: state.options.snapshot().birth }),
      life: lives.length + 1,
      dead,
      decisions: taken,
      ...(attempts === taken ? {} : { attempts, noCommandReplies }),
      ...(stopped === null ? {} : { stopped }),
      turns: state.turn,
      maxDepth: state.actor.player.maxDepth,
      endDepth: state.chunk.depth,
      clvl: state.actor.player.lev,
      kills: killsOf(state),
      gold: state.actor.player.au,
      causeOfDeath: dead ? state.actor.player.diedFrom : null,
      race: state.actor.player.race.name,
      className: state.actor.player.cls.name,
      baseStats: [...state.actor.player.statBirth],
      commands: observed.commands,
      depthsVisited: [...observed.depths].sort((a, b) => a - b),
      places: observed.places.size,
      jitter: jitterOf(observed),
      restedBesideMonster: observed.restedBesideMonster,
      ...(observed.stall === null ? {} : { stall: observed.stall }),
      unsure: { total: observed.unsure.total, points: [...observed.unsure.points] },
      wallClockMs: Date.now() - startedAt,
      arrivalStamps,
      journal: parseJournal(slot.held()),
      stageAttained: attained,
      retired,
      graveyard: archived.slice(archivedBefore.length),
    });
    observed.uninstall();
  }

  return { lives, library, graveyard: archivedSoFar() };
}
