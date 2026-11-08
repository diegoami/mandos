# Cross-engine selection-fixture POC

Owner task [Mandos #217](https://github.com/diegoami/mandos/issues/217), coordinated by
[workspace #40](https://github.com/diegoami/angband-workspace/issues/40), compares one
explicit decision boundary. It does not adopt C82 or change Borg gameplay.

The original native CBUG-0066 nine-case fixture is the authority. The native
producer runs actual original and corrected C code and exports observed entry
facts, candidate-evaluation answers and selected actions. The shared contract,
actual corpus and orchestration comparator belong to the parent workspace; the
native exporter belongs to better-borg-c. Original C source/proposal ownership
remains in neo-angband-tracker.

## Run the TypeScript adapter

Install this checkout's frozen dependencies, then run each diagnostic variant:

```sh
pnpm install --frozen-lockfile
node tools/cbug0066-fixture.mjs --corpus /path/to/native/cases.json \
  --variant inherited --out /tmp/ts-inherited.json
node tools/cbug0066-fixture.mjs --corpus /path/to/native/cases.json \
  --variant prototype --out /tmp/ts-prototype.json
```

Outputs must be fresh explicit files outside docs/runs. The tool emits
`angband/borg-fixture-results@1` for mechanism `CBUG-0066`, boundary
`backup-swap/post-evaluation`. The parent comparator accepts these two files,
the native-before/native-fixed files and their canonical corpus. It checks input
equivalence before comparing actions and intended fix-state differences.

The inherited variant calls actual `src/item/item-wear.ts::borgBackupSwap`.
Native-observed raw danger and six critical traits are supplied through its
existing `backupEval` seam. Complete typed decision-boundary ItemViews, traits,
configuration, backup handles and WeakMap state represent the other supplied
facts. No Neo game is started, no Neo danger or gear score is calculated, and no
world/seed/damage equivalence is asserted. Equipment numbers are mapped through
the public Core's symbolic SWORD/SHIELD constants; native indices and local
handles remain diagnostic evidence, not common-input identities.

Readback comes from the actual constructed configuration, traits, derived
selected backups, effective pack, knowledge/cursed checks, and consumed callback
answers. Actual role/slot requests are verified before returning observations.
Exactly one evaluation per available role and no private-RNG change are required.
A wrong binding is a qualification failure, not automatically a port defect.

The original corpus is deliberately narrow: depth 50, swaps enabled, no hunger or
weakness, panel count at most 300, current danger above one-third avoidance.
The C helper has some eligibility checks at callers while TS combines them at
entry; this POC does not claim those broader paths are equivalent. Absent
candidates are null, not a fabricated zero or raw trial -1. Raw danger is distinct
from the selector's later 9999 guard sentinel.

## Unshipped prototype

The prototype is a guarded in-memory overlay of the actual selector's availability/
comparison block. It prefers lower danger among available candidates and preserves
weapon preference on ties. Source preimage SHA256 and the unique original block
must match; each variant compiles selector, context, config and derived-state
modules in one coherent bundle. No source file or committed plugin is rewritten.
The report records original/function/overlaid-module/bundle/overlay identities.

This is not a duplicated choose-min oracle, a production gameplay option, an
additional carried fix or a change to milestone #203's adoption coverage. The
normal plugin, zoo entry point, C ledger and existing nine corrections remain
unchanged. The other existing C fixes are outside this supplied-evaluation slice;
whole fix sets and engines are not claimed equivalent.

Expected relationships are original C versus inherited TS, corrected C versus
inherited TS as explicitly expected missing-carry differences, and corrected C
versus the diagnostic prototype. All original availability/tie/no-benefit controls
remain. The frozen consumer data copy is [test/fixtures/CBUG-0066](../test/fixtures/CBUG-0066/README.md), pinned to the immutable parent commit and exact raw/canonical SHA256. Both actual variants run all nine observations in the default regression suite. The real native corpus and measured matrix are reported on #217; constructed
unit controls are labelled as such and never presented as native observations.

## Verification boundaries

Focused pure-selector tests cover actual readback, role/slot rejection, original
availability/tie/no-benefit behavior, exact source preimage, coherent per-variant
module graphs and source-file immutability. Typecheck, session, committed plugin
currency and the full normal gate remain required. Native HP/damage rows are
context only and are not compared to a fabricated Neo encounter. No cohort,
engine patch, source port edit, Rust work, lab/desktop operation or snapshot tag
change is part of this POC.


A future production C82 adoption must intentionally update the preimage/fix-state
qualification and keep the old inherited comparison as historical evidence. The
prototype guard is not a reason to keep the known bug indefinitely. Normal
application still belongs to the reviewed native-milestone adoption process.
