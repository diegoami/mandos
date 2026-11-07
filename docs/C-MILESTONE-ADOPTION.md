# Reviewed native C milestones → Mandos

This contract changes **C-origin intake and tracking only**. The owner-selected
[landing/adoption record203](https://github.com/diegoami/mandos/issues/203) replaces
Mandos's per-C-source mirror queue. [Coordination29](https://github.com/diegoami/angband-workspace/issues/29)
owns the tracking migration. It changes no gameplay, applied correction or
reviewed milestone coverage by itself.

## Ownership and unit of work

- [neo-angband-tracker](https://github.com/diegoami/neo-angband-tracker/issues)
  remains canonical for original-C defects, source evidence and proposals.
- [better-borg-c](https://github.com/diegoami/better-borg-c) applies/reviews native
  fixes and maintains its per-bug upstream/adoption status. Its reviewed immutable
  milestones are Mandos's C producer; its moving main is not a review verdict.
- Mandos assesses/translates applicable behavior from a **reviewed, pinned native
  milestone**, using one adoption issue per selected milestone. It does not
  recreate each source defect or native consumer issue as a Mandos work queue.
  Keep canonical C-source links as secondary provenance.
- Faithful Neo Borg port repairs stay in the port tracker, Neo engine repairs in
  the engine tracker, and Mandos-owned bugs here. Their existing source-first
  issue/PR/adoption routes and lifecycle are unchanged. C corrections are not
  sent to the fidelity-only port as omissions.

A new C lead still belongs on the canonical source board and in native intake;
it does not bypass milestone review by becoming a direct Mandos carry task.
borg-rs reports directly there. Do not poll/fetch its repo, files or external
issues, or dispatch Rust work. The native sessions remain independently owned.

## Review-qualified targets, not latest main

| Native target | Immutable runtime and scope | Required review/follow-up references |
| --- | --- | --- |
| M2 foundation | [2675d198e4c3fcb1c69ee63ef25a2b6ac27ab96f](https://github.com/diegoami/better-borg-c/tree/2675d198e4c3fcb1c69ee63ef25a2b6ac27ab96f), patches0001–0007 | [Approved review](https://github.com/diegoami/better-borg-c/issues/38#issuecomment-6705894080). |
| M3 cumulative target | [702f091f6ac06cae1014df2f85ac218be0189813](https://github.com/diegoami/better-borg-c/tree/702f091f6ac06cae1014df2f85ac218be0189813), delta0008–0034, cumulative34 | [Approved-with-findings review](https://github.com/diegoami/better-borg-c/issues/128#issuecomment-6705894431); [follow-up130](https://github.com/diegoami/better-borg-c/issues/130), [PR131](https://github.com/diegoami/better-borg-c/pull/131), corrected metadata [8a8d66fea70d853102104d9013bc177a80099e43](https://github.com/diegoami/better-borg-c/tree/8a8d66fea70d853102104d9013bc177a80099e43). |

The8a8 follow-up changes no src/lib runtime relative to702f and fixes review
findings/evidence records; its [pinned34-entry ledger](https://github.com/diegoami/better-borg-c/blob/8a8d66fea70d853102104d9013bc177a80099e43/patches/series.json#L1)
is the metadata reference. The review is native consumer/code evidence, not
upstream acceptance or proof of TypeScript applicability. Later native main
patches, individual carry PRs, strategies and tools are outside this target
until separately reviewed and selected. An issue being closed/open is not its
review verdict.203 selects M3's cumulative target including the M2 foundation;
it does not declare either milestone already adopted by Mandos.

## Port-first gate before any new C milestone code

Consult203's current classified port-gate receipt before starting code. A known
relevant port correction must be incorporated into the verified source/consumer
baseline, or our proposed correction must actually be carried and verified.
An open PR or source claim alone is insufficient. An actual missing parity leaf
blocks new C milestone implementation. Never hide it under an audit umbrella
or call it complete because a narrower leaf landed.

The migration's gate is blocked by real armour/HOME/tactical-swap scope under
[source2](https://github.com/diegoami/neo-angband-borg-mod-tracker/issues/2)/
[Mandos125](https://github.com/diegoami/mandos/issues/125), and the new backup
simulation follow-up [source46](https://github.com/diegoami/neo-angband-borg-mod-tracker/issues/46)/
[Neo480](https://github.com/neostryder/neo-angband/issues/480)/
[Mandos204](https://github.com/diegoami/mandos/issues/204). Neo480 was explicitly
resolved by [upstream PR76](https://github.com/neostryder/neo-angband-mod-borg/pull/76)
(source235a6f9b28beb82a8bb4b30dc8d3a6c807108170); verified import/adoption is
still pending at this migration cutoff. Source acceptance alone is not import.
This is a dated routing
snapshot;203 and the canonical port issues own live gate state. The weapon/HOME
leaf already verified within125 is separate from its missing armour/tactical
scope. Source41/PR74's verified local carry196 is allowed while upstream remains
open; an upstream-open proposal does not block solely because it is open when
its correction is already verified locally. Native157's later Enlightenment adoption is outside the reviewed M3 target;
it does not remove the existing TS correction or block other reviewed coverage.

Tests-only/audit umbrellas are classified separately: their open label alone is
not proof of missing parity. They still block relevant verification if a required
test is red, absent or skipped. No promise of zero undiscovered defects or broad
all-class/strategy audit is required to pass this bounded gate. A genuine unresolved
parity/API dependency needs an explicit disposition, not a silent exemption.

## Adoption after review and port clearance

1. Pin the selected runtime, milestone scope, review and findings follow-up in
   its single Mandos adoption issue. Reconcile each applicable native correction
   against the current TS baseline before implementation. Existing equivalent
   corrections need proof/reuse, not a literal C commit reapplication.
2. Record each unit as already equivalent, translated and verified, no applicable
   counterpart at this pin, or deferred for an actual named dependency. Absence,
   dead C paths and memory representation differences need scoped evidence.
   Deferred applicable work is not silently counted as complete.
3. For translations, retain the independent TS provenance/removal unit, marked
   divergence, legal fail-before/pass-after and negative controls, and normal
   package/plugin/harness gates. Native evidence never substitutes for TS proof.
   Do not auto-copy C-only memory fixes, strategy changes, measurement cohorts,
   recording/death infrastructure or source-specific counters into Mandos.
4. Close the adoption issue **ADOPTED/completed** once all applicable coverage is
   verified. That means Mandos adopted the reviewed milestone behavior; it does
   **not** mean each original C source defect is fixed upstream. Do not keep the
   adoption issue open solely for native/source upstream status. Native per-bug
   follow-up remains with better-borg-c and the canonical source tracker.

Per-fix code/units/tests remain even though per-source Mandos issues no longer
serve as the queue. Concrete new Mandos defects still get their own issues.
Port/engine consumers retain carried-open until upstream resolution plus verified
adoption; this C-only tracking change does not alter their lifecycle.

## Retirement and existing units

Retirement stays **per TS unit**. When a native patch disappears after an
upstream C fix, inspect the actual Neo/TS baseline and its caller semantics.
Retire the local delta only after the equivalent TS replacement and relevant
consumer controls/build are verified. Native patch removal, an adopted/closed
milestone or original-C upstream acceptance alone is not that proof. Keep
local maintenance/removal records independent of adoption-issue closure.

The [current TS ledger](../patches/c-translations/README.md) links eight already
independently proved TS units to their reviewed native producer units. This is
existing coverage, not a completed34-fix audit. Enlightenment is an explicit
**grandfathered existing verified TS unit**: [native157](https://github.com/diegoami/better-borg-c/issues/157)
has now been applied natively after that reviewed34-entry target. Its native
adoption does not make it part of reviewed M3 or authorize new Mandos code.
Keep the existing TS code/proof/unit intact; reconcile its producer in a future
reviewed milestone without blocking other coverage or rolling it back.

The21 retired per-source Mandos issues are **tracking-superseded history**, not
rejected fixes, removed code or source-fixed declarations. Their original
receipts and all historical docs/runs/branches remain.203 preserves applied9 /
pending12 migration provenance. Old IDs in FORK comments, proof commits and
`*_at_split` migration data are historical references, not live C queue rules.
This documentation migration performs no milestone adoption or gameplay change.
