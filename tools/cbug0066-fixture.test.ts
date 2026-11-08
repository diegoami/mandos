/** Constructed adapter controls only; the actual cross-language oracle is native corpus data. */
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { canonicalJson, runCorpus, validateCorpus, assertEvaluationSlot, type Candidate, type Corpus } from "./cbug0066-fixture-entry.js";
import { compileFixture, diagnosticSource, EXPECTED_SELECTOR_SHA256, INHERITED, PROTOTYPE } from "./cbug0066-fixture.mjs";

const critical = { rconf: 0, rblind: 0, rlite: 0, rdark: 0, fract: 0, sav: 30 };
const candidate = (category: "SWORD" | "SHIELD", rawDanger: number): Candidate => ({
  item: { category, quantity: 1, identified: true, artifact: false, cursed: false, uncursable: false },
  evaluation: { rawDanger, critical: { ...critical } },
});
function modelCorpus(): Corpus {
  return { schema: "angband/borg-fixture-corpus@1", mechanism: "CBUG-0066", boundary: "backup-swap/post-evaluation",
    provenance: { origin: "constructed adapter unit control; NOT the native fixture corpus" },
    cases: [{ id: "model-both", inputs: { currentDanger: 80, avoidance: 100,
      gates: { usesSwaps: true, maxDepth: 50, hungry: false, weak: false, panelCount: 0, nearbyUnique: false },
      randarts: false, baseCritical: { rconf: 0, rblind: 0, fract: 0 },
      candidates: { armour: candidate("SHIELD", 10), weapon: candidate("SWORD", 20) } },
      expected: { inherited: { kind: "wield", role: "weapon" }, corrected: { kind: "wield", role: "armour" } } }] };
}

describe("CBUG-0066 typed observation adapter", () => {
  it("reads the actual constructed context/items and consumed answers, not physical IDs", () => {
    const corpus = modelCorpus();
    const [r] = runCorpus(corpus);
    expect(r!.observedInputs).toEqual(corpus.cases[0]!.inputs);
    expect(r!.observedAction).toEqual({ kind: "wield", role: "weapon" });
    expect(r!.inputSha256).toBe(createHash("sha256").update(canonicalJson(r!.observedInputs)).digest("hex"));
    expect(r!.evidence.evaluationCalls.map(call => [call.role, call.slot])).toEqual([["armour", 8], ["weapon", 0]]);
    expect(r!.evidence.rawCommand).toEqual({ code: "wield", args: { handle: 202 } });
    expect(r!.evidence.rngAfter).toBe(r!.evidence.rngBefore);
    expect(canonicalJson(r!.observedInputs)).not.toContain('"handle"');
  });
  it("reads effective critical/knowledge/cursed/uncursable fields even when a guard refuses", () => {
    const corpus = modelCorpus(), row = corpus.cases[0]!;
    row.inputs.randarts = true;
    row.inputs.baseCritical.rconf = 1;
    for (const c of Object.values(row.inputs.candidates)) {
      c!.item.artifact = true; c!.item.identified = false; c!.item.cursed = true; c!.item.uncursable = true;
    }
    const [r] = runCorpus(corpus);
    expect(r!.observedInputs).toEqual(row.inputs);
    expect(r!.observedAction).toEqual({ kind: "none" });
  });
  it("refuses wrong role/slot bindings before supplying a native evaluation", () => {
    expect(() => assertEvaluationSlot("armour", 9)).toThrow(/wrong equipment slot/);
    expect(() => assertEvaluationSlot("weapon", 8)).toThrow(/wrong equipment slot/);
    expect(() => assertEvaluationSlot("armour", 8)).not.toThrow();
    expect(() => assertEvaluationSlot("weapon", 0)).not.toThrow();
  });
  it("retains ordinary availability, ties and no-benefit controls", () => {
    for (const missing of ["armour", "weapon"] as const) {
      const corpus = modelCorpus(); corpus.cases[0]!.inputs.candidates[missing] = null;
      const [r] = runCorpus(corpus);
      expect(r!.observedInputs).toEqual(corpus.cases[0]!.inputs);
      expect(r!.observedAction).toEqual({ kind: "wield", role: missing === "armour" ? "weapon" : "armour" });
      expect(r!.evidence.evaluationCalls).toHaveLength(1);
    }
    const tie = modelCorpus(); tie.cases[0]!.inputs.candidates.armour!.evaluation.rawDanger = 20;
    expect(runCorpus(tie)[0]!.observedAction).toEqual({ kind: "wield", role: "weapon" });
    const none = modelCorpus();
    for (const c of Object.values(none.cases[0]!.inputs.candidates)) c!.evaluation.rawDanger = 80;
    expect(runCorpus(none)[0]!.observedAction).toEqual({ kind: "none" });
  });
  it("rejects wrong types, absent numeric sentinels, duplicate IDs and unsupported caller domains", () => {
    for (const mutate of [
      (c: Corpus) => { (c.cases[0]!.inputs.baseCritical as unknown as Record<string, unknown>).rconf = false; },
      (c: Corpus) => { c.cases[0]!.inputs.candidates.weapon!.evaluation.rawDanger = -1; },
      (c: Corpus) => { c.cases[0]!.inputs.gates.maxDepth = 90; },
      (c: Corpus) => { c.cases[0]!.inputs.gates.usesSwaps = false; },
      (c: Corpus) => { c.cases[0]!.inputs.currentDanger = 1; },
      (c: Corpus) => { c.cases.push(structuredClone(c.cases[0]!)); },
    ]) {
      const corpus = modelCorpus(); mutate(corpus); expect(() => validateCorpus(corpus)).toThrow();
    }
  });
});

describe("diagnostic overlay on the actual source module", () => {
  it("guards the exact inherited preimage and leaves the source file untouched", () => {
    const source = readFileSync(new URL("../src/item/item-wear.ts", import.meta.url), "utf8");
    const at = source.indexOf("export function borgBackupSwap(");
    expect(createHash("sha256").update(source.slice(at)).digest("hex")).toBe(EXPECTED_SELECTOR_SHA256);
    expect(diagnosticSource(source, "inherited")).toBe(source);
    const changed = diagnosticSource(source, "prototype");
    expect(changed).toBe(source.replace(INHERITED, PROTOTYPE));
    expect(() => diagnosticSource(changed, "prototype")).toThrow(/pinned/);
    expect(() => diagnosticSource(source + "// changed\n", "prototype")).toThrow(/pinned/);
    expect(readFileSync(new URL("../src/item/item-wear.ts", import.meta.url), "utf8")).toBe(source);
  });
  it("compiles coherent inherited/prototype state graphs and preserves single-backup controls", async () => {
    const dir = mkdtempSync(join(tmpdir(), "c82-adapter-unit-"));
    const source = readFileSync(new URL("../src/item/item-wear.ts", import.meta.url));
    try {
      for (const variant of ["inherited", "prototype"] as const) {
        const file = join(dir, variant + ".mjs"), graph = await compileFixture(variant, file);
        const runner = await import(pathToFileURL(file).href);
        const cases = modelCorpus();
        expect(runner.runCorpus(cases)[0].observedAction).toEqual(cases.cases[0]!.expected[variant === "inherited" ? "inherited" : "corrected"]);
        expect(graph.overlaySha256 === null).toBe(variant === "inherited");
        expect(graph.inputs.filter(path => path.endsWith("/src/trait/state.ts") || path === "src/trait/state.ts")).toHaveLength(1);
        for (const role of ["armour", "weapon"] as const) {
          const one = modelCorpus(); one.cases[0]!.inputs.candidates[role === "armour" ? "weapon" : "armour"] = null;
          expect(runner.runCorpus(one)[0].observedAction).toEqual({ kind: "wield", role });
        }
      }
    } finally { rmSync(dir, { recursive: true, force: true }); }
    expect(readFileSync(new URL("../src/item/item-wear.ts", import.meta.url)).equals(source)).toBe(true);
  }, 30000);
});


describe("frozen actual native corpus (not constructed model data)", () => {
  it("matches the original C oracle in inherited mode and corrected C in diagnostic mode on all nine cases", async () => {
    const bytes = readFileSync(new URL("../test/fixtures/CBUG-0066/cases.json", import.meta.url));
    expect(createHash("sha256").update(bytes).digest("hex")).toBe("aed6a5a41dff7640578726bdbb98d4085d72b45a7bdd9db0a4e3d44b2ae9ba1f");
    const corpus = JSON.parse(bytes.toString("utf8"));
    validateCorpus(corpus);
    expect(createHash("sha256").update(canonicalJson(corpus)).digest("hex")).toBe("11d0f9d4dc02f12be3ca76efb1f5fda16c4b3a0b2d94c1ab686dfd9c8b8c6cf9");
    expect(corpus.cases).toHaveLength(9);
    expect(corpus.cases.filter(row => canonicalJson(row.expected.inherited) !== canonicalJson(row.expected.corrected))).toHaveLength(5);
    const dir = mkdtempSync(join(tmpdir(), "c82-actual-native-"));
    try {
      for (const variant of ["inherited", "prototype"] as const) {
        const file = join(dir, variant + ".mjs");
        await compileFixture(variant, file);
        const entry = await import(pathToFileURL(file).href);
        const actual = entry.runCorpus(corpus);
        expect(actual).toHaveLength(9);
        for (const row of actual) {
          const native = corpus.cases.find(candidate => candidate.id === row.id)!;
          expect(row.observedInputs, row.id).toEqual(native.inputs);
          expect(row.observedAction, row.id).toEqual(native.expected[variant === "inherited" ? "inherited" : "corrected"]);
        }
      }
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }, 30000);
});
