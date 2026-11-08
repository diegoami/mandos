/** Mandos #217: a decision-boundary adapter, never imported by the plugin. */
import * as Core from "@rpgm-tools/neo-angband-core";
import { createHash } from "node:crypto";
import { bindCore } from "../src/core-api.js";
import type { AgentCommand, ItemView } from "@rpgm-tools/neo-angband-core";
import type { BorgContext } from "../src/context.js";
import { BorgWorld } from "../src/world/model.js";
import { makeBorgRng } from "../src/rng.js";
import { makeFakeActions, makeScenarioView } from "../src/harness.js";
import { borgBackupSwap, type WearDeps } from "../src/item/item-wear.js";
import { isCursed, isIdent, packItems } from "../src/item/deps.js";
import { BI } from "../src/trait/trait-index.js";
import { borgCfg, resetBorgCfg, setBorgCfg } from "../src/trait/config.js";
import { getDerived } from "../src/trait/state.js";
import { getDangerGlobals } from "../src/danger/index.js";
import { getFightState } from "../src/fight/state.js";
import { TV } from "../src/item/svals.js";
import { canonicalJson } from "./zoo-format.js";

export { canonicalJson };

export type Role = "armour" | "weapon";
export interface Critical { rconf: number; rblind: number; rlite: number; rdark: number; fract: number; sav: number }
export interface Candidate {
  item: { category: "SWORD" | "SHIELD"; quantity: number; identified: boolean; artifact: boolean; cursed: boolean; uncursable: boolean };
  evaluation: { rawDanger: number; critical: Critical };
}
export interface Inputs {
  currentDanger: number; avoidance: number;
  gates: { usesSwaps: boolean; maxDepth: number; hungry: boolean; weak: boolean; panelCount: number; nearbyUnique: boolean };
  randarts: boolean;
  baseCritical: { rconf: number; rblind: number; fract: number };
  candidates: { armour: Candidate | null; weapon: Candidate | null };
}
export interface Action { kind: "none" | "wield"; role?: Role }
export interface FixtureCase { id: string; inputs: Inputs; expected: { inherited: Action; corrected: Action } }
export interface Corpus { schema: string; mechanism: string; boundary: string; provenance: unknown; cases: FixtureCase[] }
const roles: readonly Role[] = ["armour", "weapon"];
const sha = (text: string) => createHash("sha256").update(text, "utf8").digest("hex");
const object = (v: unknown, path: string): Record<string, unknown> => {
  if (v === null || typeof v !== "object" || Array.isArray(v)) throw new Error(`${path}: expected object`);
  return v as Record<string, unknown>;
};
const keys = (v: Record<string, unknown>, expected: readonly string[], path: string) => {
  if (Object.keys(v).sort().join("\0") !== [...expected].sort().join("\0")) throw new Error(`${path}: missing or unexpected fields`);
};
const integer = (v: unknown, path: string, min = 0) => { if (typeof v !== "number" || !Number.isSafeInteger(v) || v < min) throw new Error(`${path}: expected safe integer >= ${min}`); };
const boolean = (v: unknown, path: string) => { if (typeof v !== "boolean") throw new Error(`${path}: expected boolean`); };
const bit = (v: unknown, path: string) => { integer(v, path); if (v !== 0 && v !== 1) throw new Error(`${path}: expected 0 or 1`); };
function action(value: unknown, path: string): void {
  const v = object(value, path);
  if (v.kind === "none") keys(v, ["kind"], path);
  else if (v.kind === "wield" && (v.role === "armour" || v.role === "weapon")) keys(v, ["kind", "role"], path);
  else throw new Error(`${path}: unsupported normalized action`);
}
/** Reject unknown shapes instead of silently guessing a native field's meaning. */
export function validateCorpus(value: unknown): asserts value is Corpus {
  const c = object(value, "corpus");
  if (c.schema !== "angband/borg-fixture-corpus@1" || c.mechanism !== "CBUG-0066" || c.boundary !== "backup-swap/post-evaluation") throw new Error("Unsupported fixture corpus/boundary");
  if (!Array.isArray(c.cases) || c.cases.length === 0) throw new Error("Expected nonempty fixture cases");
  const ids = new Set<string>();
  for (const entry of c.cases) {
    const row = object(entry, "case");
    if (typeof row.id !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(row.id) || ids.has(row.id)) throw new Error("Case IDs must be unique ASCII mode names");
    ids.add(row.id);
    const i = object(row.inputs, row.id); keys(i, ["currentDanger", "avoidance", "gates", "randarts", "baseCritical", "candidates"], row.id);
    integer(i.currentDanger, "currentDanger"); integer(i.avoidance, "avoidance", 1); boolean(i.randarts, "randarts");
    const g = object(i.gates, "gates"); keys(g, ["usesSwaps", "maxDepth", "hungry", "weak", "panelCount", "nearbyUnique"], "gates");
    for (const k of ["usesSwaps", "hungry", "weak", "nearbyUnique"]) boolean(g[k], `gates.${k}`);
    integer(g.maxDepth, "maxDepth"); integer(g.panelCount, "panelCount");
    if (g.usesSwaps !== true || g.maxDepth !== 50 || g.hungry !== false || g.weak !== false || (g.panelCount as number) > 300
      || (i.currentDanger as number) <= Math.trunc((i.avoidance as number) / 3)) throw new Error("Outside original eligible-helper corpus: depth50, swaps enabled, healthy, panel<=300, p>avoidance/3 required");
    const b = object(i.baseCritical, "baseCritical"); keys(b, ["rconf", "rblind", "fract"], "baseCritical");
    for (const k of ["rconf", "rblind", "fract"]) bit(b[k], `baseCritical.${k}`);
    const candidates = object(i.candidates, "candidates"); keys(candidates, roles, "candidates");
    if (candidates.armour === null && candidates.weapon === null) throw new Error("Original corpus always has a selected backup");
    for (const role of roles) {
      if (candidates[role] === null) continue;
      const candidate = object(candidates[role], role); keys(candidate, ["item", "evaluation"], role);
      const item = object(candidate.item, `${role}.item`); keys(item, ["category", "quantity", "identified", "artifact", "cursed", "uncursable"], `${role}.item`);
      if (item.category !== (role === "armour" ? "SHIELD" : "SWORD")) throw new Error(`${role}: original corpus requires SHIELD/SWORD roles`);
      integer(item.quantity, `${role}.quantity`, 1);
      for (const k of ["identified", "artifact", "cursed", "uncursable"]) boolean(item[k], `${role}.${k}`);
      const e = object(candidate.evaluation, `${role}.evaluation`); keys(e, ["rawDanger", "critical"], `${role}.evaluation`);
      integer(e.rawDanger, `${role}.rawDanger`);
      const t = object(e.critical, `${role}.critical`); keys(t, ["rconf", "rblind", "rlite", "rdark", "fract", "sav"], `${role}.critical`);
      for (const k of ["rconf", "rblind", "rlite", "rdark", "fract"]) bit(t[k], `${role}.${k}`);
      integer(t.sav, `${role}.sav`);
    }
    const e = object(row.expected, "expected"); action(e.inherited, "expected.inherited"); action(e.corrected, "expected.corrected");
  }
}
function item(candidate: Candidate, handle: number): ItemView & { unknownRunes: boolean } {
  return { handle, kindKey: `fixture:${candidate.item.category}`, itemKey: `gear:${handle}`, aware: true,
    nameColor: "white", label: `native selected ${candidate.item.category}`, tval: TV[candidate.item.category],
    sval: 0, pval: 0, number: candidate.item.quantity, weight: 0, ac: 0, toA: 0, toH: 0, toD: 0, dd: 0, ds: 0,
    ego: false, artifact: candidate.item.artifact, flags: [], modifiers: [], brands: [], slays: [], resists: [],
    curses: candidate.item.cursed ? ["fixture observed curse"] : [], egoName: null,
    artifactName: candidate.item.artifact ? "fixture observed artifact" : null, activation: false, timeout: 0,
    inscription: null, unknownRunes: !candidate.item.identified };
}
/** Only the two original native candidate categories belong to this contract. */
export function assertEvaluationSlot(role: Role, slot: number): void {
  if (slot !== (role === "weapon" ? 0 : 8)) throw new Error(`${role}: actual evaluation requested the wrong equipment slot ${slot}`);
}
/** Execute the real selector; the answers supplied to its seam are native observations. */
export function runFixture(fixture: FixtureCase) {
  bindCore(Core);
  const input = fixture.inputs, handles = { armour: 101, weapon: 202 };
  resetBorgCfg(); setBorgCfg({ usesSwaps: input.gates.usesSwaps });
  const world = new BorgWorld(), derived = getDerived(world), inventory: ItemView[] = [];
  for (const role of roles) {
    const candidate = input.candidates[role];
    derived[role === "armour" ? "armourSwap" : "weaponSwap"] = { handle: candidate === null ? null : handles[role], value: candidate === null ? -1 : 1 };
    if (candidate) inventory.push(item(candidate, handles[role]));
  }
  const uncursable = (i: ItemView) => {
    const role = roles.find(r => i.handle === handles[r]);
    if (!role || !input.candidates[role]) throw new Error("Unknown fixture eligibility handle");
    return input.candidates[role].item.uncursable;
  };
  derived.armourSwapOpts = { armourSwap: { uncursable } }; derived.weaponSwapOpts = { weaponSwap: { uncursable } };
  const t = world.self.trait;
  t[BI.MAXDEPTH] = input.gates.maxDepth; t[BI.ISHUNGRY] = Number(input.gates.hungry); t[BI.ISWEAK] = Number(input.gates.weak);
  t[BI.RCONF] = input.baseCritical.rconf; t[BI.RBLIND] = input.baseCritical.rblind; t[BI.FRACT] = input.baseCritical.fract;
  world.self.timeThisPanel = input.gates.panelCount;
  getDangerGlobals(world).avoidance = input.avoidance; getFightState(world).fightingUnique = Number(input.gates.nearbyUnique);
  const base = makeScenarioView({ player: { race: "Human", cls: "Warrior", depth: 50, maxDepth: 50, hp: input.avoidance, maxHp: input.avoidance, grid: { x: 12, y: 12 } } });
  const rng = makeBorgRng(1000);
  const ctx: BorgContext = { world, view: { ...base, inventory: () => inventory }, act: makeFakeActions(), rng };
  const evaluationCalls: Array<{ role: Role; slot: number; answer: { danger: number; traits: Critical } }> = [];
  const deps: WearDeps = { randarts: input.randarts, backupEval: (i, slot) => {
    const role = roles.find(r => i.handle === handles[r]);
    if (!role || !input.candidates[role]) throw new Error("Actual selector requested an unbound candidate");
    assertEvaluationSlot(role, slot);
    const native = input.candidates[role].evaluation;
    const answer = { danger: native.rawDanger, traits: { ...native.critical } };
    evaluationCalls.push({ role, slot, answer: structuredClone(answer) });
    return answer;
  } };
  // Read the constructed state, not the request object. Evaluation readback is added below from actual consumed callbacks.
  const observed: Inputs = { currentDanger: input.currentDanger, avoidance: getDangerGlobals(world).avoidance,
    gates: { usesSwaps: borgCfg().usesSwaps, maxDepth: t[BI.MAXDEPTH]!, hungry: Boolean(t[BI.ISHUNGRY]), weak: Boolean(t[BI.ISWEAK]),
      panelCount: world.self.timeThisPanel, nearbyUnique: Boolean(getFightState(world).fightingUnique) },
    randarts: deps.randarts!, baseCritical: { rconf: t[BI.RCONF]!, rblind: t[BI.RBLIND]!, fract: t[BI.FRACT]! },
    candidates: { armour: null, weapon: null } };
  const rngBefore = rng.snapshot();
  try {
    const command = borgBackupSwap(ctx, observed.currentDanger, deps);
    const effectivePack = packItems(ctx);
    for (const role of roles) {
      const selected = derived[role === "armour" ? "armourSwap" : "weaponSwap"].handle;
      const actual = effectivePack.find(i => i.handle === selected);
      if (!actual) continue;
      const calls = evaluationCalls.filter(call => call.role === role);
      if (calls.length !== 1) throw new Error(`${fixture.id}/${role}: expected one actual evaluation, observed ${calls.length}`);
      const call = calls[0]!;
      if (call.slot !== (role === "weapon" ? 0 : 8)) throw new Error(`${fixture.id}/${role}: unexpected actual equipment slot ${call.slot}`);
      const category = actual.tval === TV.SWORD ? "SWORD" : actual.tval === TV.SHIELD ? "SHIELD" : null;
      if (!category) throw new Error("Actual fixture item has an unsupported type");
      const actualUncursable = role === "weapon" ? derived.weaponSwapOpts.weaponSwap?.uncursable
        : derived.armourSwapOpts.armourSwap?.uncursable ?? derived.armourSwapOpts.weaponSwap?.uncursable;
      observed.candidates[role] = { item: { category, quantity: actual.number, identified: isIdent(actual, deps), artifact: actual.artifact,
        cursed: isCursed(actual), uncursable: actualUncursable?.(actual) ?? false },
        evaluation: { rawDanger: call.answer.danger, critical: { ...call.answer.traits } } };
    }
    if (rng.snapshot() !== rngBefore) throw new Error("Selector unexpectedly advanced its private RNG");
    const observedAction: Action = normalizeAction(command, handles);
    return { id: fixture.id, observedInputs: observed, inputSha256: sha(canonicalJson(observed)), observedAction,
      evidence: { rawCommand: command, bindings: { ...handles }, evaluationCalls, rngBefore, rngAfter: rng.snapshot(),
        modelBoundary: "Native observed evaluations injected; no Neo world, danger calculation, valuation, damage or full-port equivalence" } };
  } finally { resetBorgCfg(); }
}
function normalizeAction(command: AgentCommand | null, handles: Record<Role, number>): Action {
  if (command === null) return { kind: "none" };
  if (command.code !== "wield") throw new Error(`Actual selector returned unexpected command ${command.code}`);
  const handle = command.args?.["handle"];
  const role = roles.find(r => handles[r] === handle);
  if (!role) throw new Error("Actual wield command did not refer to a fixture candidate");
  return { kind: "wield", role };
}
export function runCorpus(value: unknown) { validateCorpus(value); return value.cases.map(runFixture); }
