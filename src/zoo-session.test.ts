/** Owner-authorized external zoo instrument; no Borg policy fixtures. */
import { describe, expect, it } from "vitest";
import * as Core from "@rpgm-tools/neo-angband-core";
import { createHash } from "node:crypto";
import { createStallWatch } from "./loop/stall.js";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { loadPack, playSession } from "./play-session.js";
import { canonicalJson, commandLine, classifyZooOutcome, runZooSession } from "../tools/zoo-session.js";

const require = createRequire(import.meta.url);
const pack = loadPack(dirname(require.resolve("@rpgm-tools/neo-angband-content/pack/constants.json")));
const args = { seed: 7, turns: 60, decisions: 1000 };

describe("zoo command fingerprint", () => {
  it("canonicalizes object keys recursively and uses exactly one LF", () => {
    expect(canonicalJson({ b: [2, { z: true, a: 1 }], a: "é" })).toBe('{"a":"é","b":[2,{"a":1,"z":true}]}');
    expect(commandLine({ type: "command", command: { code: "walk", dir: 6 } })).toBe('{"command":{"code":"walk","dir":6},"type":"command"}\n');
    expect(commandLine({ type: "command", command: { dir: 6, code: "walk" } })).toBe(commandLine({ type: "command", command: { code: "walk", dir: 6 } }));
    expect(commandLine({ type: "command", command: { code: "walk", dir: 4 } })).not.toBe(commandLine({ type: "command", command: { code: "walk", dir: 6 } }));
    expect(canonicalJson(new Array(2))).toBe('[null,null]');
    expect(canonicalJson([, 1])).toBe('[null,1]');
    expect(canonicalJson({ 2: 'two', 10: 'ten' })).toBe('{"10":"ten","2":"two"}');
    expect(() => canonicalJson({ bad: Number.NaN })).toThrow(/finite/);
  });
  it("classifies a stall and explicit stop separately from a death", () => {
    const watch = createStallWatch();
    let stalled = null;
    for (let i = 0; i < 25; i++) stalled = watch.observe("", null).stalled;
    expect(stalled).not.toBeNull();
    const stall = { ...stalled!, decision: 25, turn: 0 };
    expect(classifyZooOutcome({ dead: false, stopped: null, stall, turn: 0, cap: 100 })).toBe("stalled");
    expect(classifyZooOutcome({ dead: false, stopped: "clock overflow", stall: null, turn: 10, cap: 100 })).toBe("borg_stopped");
    expect(classifyZooOutcome({ dead: true, stopped: null, stall: null, turn: 10, cap: 10 })).toBe("death");
    expect(classifyZooOutcome({ dead: false, stopped: null, stall: null, turn: 10, cap: 10 })).toBe("turn_cap");
    expect(classifyZooOutcome({ dead: false, stopped: null, stall: null, turn: 9, cap: 10 })).toBe("decision_cap");
  });
});

describe("one measured life", () => {
  it("repeats exactly, with command and state streams that do not alter play", () => {
    const commands: string[] = [], states: unknown[] = [];
    const first = runZooSession(Core, pack, { ...args, onCommand: line => commands.push(line), onState: state => states.push(state) });
    const second = runZooSession(Core, pack, args);
    expect(first).toEqual(second);
    expect(first.outcome).toBe("turn_cap");
    expect(first.turn).toBeGreaterThanOrEqual(args.turns);
    expect(first.turnCap.overshoot).toBe(first.turn - args.turns);
    expect(states[0]).toMatchObject({ kind: "birth", turn: 0, decisions: 0, depth: 0, level: 1 });
    expect(states.at(-1)).toMatchObject({ kind: "stop", turn: first.turn, hp: first.hp, maxHp: first.maxHp, energy: expect.any(Number), maxLevel: expect.any(Number), maxDepth: expect.any(Number) });
    expect(commands.length).toBeGreaterThanOrEqual(first.decisions);
    expect(first.playSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(first.playSha256).toBe(createHash("sha256").update(commands.join(""), "utf8").digest("hex"));
    const changed = commandLine({ type: "command", command: { code: "walk", dir: 4 } });
    const unchanged = commandLine({ type: "command", command: { code: "walk", dir: 6 } });
    expect(createHash("sha256").update(changed).digest("hex")).not.toBe(createHash("sha256").update(unchanged).digest("hex"));
  });
  it("records non-vacuous periodic samples and first depth-arrival anchors", () => {
    const states: Array<{ kind: string; decisions: number; depth: number; turn: number }> = [];
    const result = runZooSession(Core, pack, { seed: 7, turns: 20000, decisions: 10000, onState: state => states.push(state) });
    const periodic = states.filter(state => state.kind === "periodic");
    expect(periodic.length).toBeGreaterThan(0);
    for (const state of periodic) expect(state.decisions % 100).toBe(0);
    for (const state of states.filter(state => state.kind === "depth")) expect(result.firstDepthTurns[String(state.depth)]).toBeLessThanOrEqual(state.turn);
    expect(result.firstDepthTurns["0"]).toBe(0);
  }, 60000);
  it("keeps the actual published-engine default birth and stock command census", () => {
    const stock = playSession(Core, pack, { seed: 1, decisions: 20 }).runs[0]!;
    const measured = runZooSession(Core, pack, { seed: 1, turns: 100000, decisions: 20 });
    expect(measured.birth).toMatchObject({ race: "Human", class: "Warrior", raceSelection: "default", classSelection: "default", baseStats: stock.baseStats });
    expect(measured.commands).toEqual(stock.commands);
    expect(measured.turn).toBe(stock.turns);
    expect(measured.maxDepth).toBe(stock.maxDepth);
    expect(measured.level).toBe(stock.clvl);
  });
  it("records the actual applied controller settings including defaults", () => {
    const measured = runZooSession(Core, pack, { seed: 1, turns: 0, decisions: 1, cfg: { playsRisky: true, selfScum: false } });
    expect(measured.cfg).toMatchObject({ playsRisky: true, selfScum: false, worshipsHp: false, usesSwaps: true });
    expect(measured.outcome).toBe("turn_cap");
    expect(measured.decisions).toBe(0);
  });
  it("uses the safety budget independently of the turn cap", () => {
    const result = runZooSession(Core, pack, { seed: 1, turns: 1000000, decisions: 1 });
    expect(result.outcome).toBe("decision_cap");
    expect(result.loopCalls).toBe(1);
  });
  it("fails on an unexplained engine stop instead of burning the safety budget", () => {
    const states: unknown[] = [];
    const engine = { ...Core, runGameLoop: () => Core.LOOP_STATUS.STOPPED };
    expect(() => runZooSession(engine, pack, { ...args, onState: state => states.push(state) })).toThrow(/Engine stopped/);
    expect(states.at(-1)).toMatchObject({ kind: "stop", loopCalls: 1, decisions: 0 });
  });
  it("rejects unknown assigned names rather than the engine's silent default", () => {
    expect(() => runZooSession(Core, pack, { ...args, race: "not a race" })).toThrow(/race/);
    expect(() => runZooSession(Core, pack, { ...args, class: "not a class" })).toThrow(/class/);
  });
  it("births every content-defined race/class pair through the ordinary roller", () => {
    let pairs = 0;
    for (const race of pack.player.races as Array<{ name: string }>) {
      for (const cls of pack.player.classes as Array<{ name: string }>) {
        const result = runZooSession(Core, pack, { seed: 42, turns: 0, decisions: 1, race: race.name, class: cls.name });
        expect(result.birth).toMatchObject({ race: race.name, class: cls.name, raceSelection: "assigned", classSelection: "assigned", roller: "roller" });
        expect(result.birth.baseStats).toHaveLength(5);
        expect(result.birth.options).toHaveProperty("birth_randarts");
        pairs++;
      }
    }
    expect(pairs).toBe(99);
  }, 60000);
});
