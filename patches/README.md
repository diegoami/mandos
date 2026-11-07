# Mandos consumer backports

This directory owns Mandos consumer correction units and named package/plugin/lab
receipts. Canonical source defects/proposals live in the two tracker forks.
Source repair issues have no consumer carry/fixed labels. Neo engine/port
consumers retain their existing lifecycle. C-origin work follows reviewed native
better-borg-c milestones through203, not per-source Mandos status mirrors;
native/source owners maintain per-bug upstream state.

## Published core patch removal units

The default is unmodified published Core/SDK/content1.23.0-beta.3 with no
patchedDependencies entry. The historical beta.2 combined patch remains
unchanged for its old receipts. Explicitly unapplied optional deltas are
[PR432/input-flush](optional/core-beta3-input-flush-432.patch) and
[PR433/accepted birth](optional/core-beta3-accepted-birth-433.patch).
A source merge, an unapplied file and the separately running lab are distinct.
Removing a default dependency is not a claim that its upstream bug was fixed.

| Upstream correction | Source issue | Mandos consumer issue | Replacement proof |
| --- | --- | --- | --- |
| Neo PR429 / issue428 (replaced in beta.3) | [source](https://github.com/diegoami/neo-angband-tracker/issues/4) | [adoption](https://github.com/diegoami/mandos/issues/126) | door/setFeat scenario |
| Neo PR432 / issue414 (optional/unapplied) | [source](https://github.com/diegoami/neo-angband-tracker/issues/5) | [adoption](https://github.com/diegoami/mandos/issues/128) | input-flush reset regression |
| Neo PR433 / issue431 (parked/unapplied) | [source](https://github.com/diegoami/neo-angband-tracker/issues/6) | [adoption](https://github.com/diegoami/mandos/issues/129) | accepted birth/seed replay |
| Neo commit0cc75b4af (replaced in beta.3) | [source](https://github.com/diegoami/neo-angband-tracker/issues/15) | [adoption](https://github.com/diegoami/mandos/issues/147) | all-class spell-index mapping |

Run-record code in tools/engine-pin.mjs derives the patch names from actual
marked hunks. Keep package and lab receipts distinct. Neo engine/port consumer
issues stay carried/open while upstream delivery is missing; fixed/closed follows
accepted correction plus verified adoption. C milestone ADOPTED closure follows
its separate contract. Local patch maintenance is independent of either closure.

## noteSpot consumer reconciliation

[2026-11-06 package receipt](../docs/runs/2026-11-06-notespot-consumer/README.md)
compares the existing published-beta.2 carry with engine PR200's exact source
`19ff25eac8997e8feb6b5e62eefa7ffe4d134631`. The hook is already equivalent;
this is regression coverage and verification, not a new runtime adoption.
That historical beta.2 receipt needed its local noteSpot hunk. Beta.3 now
provides it and the accepted class spell counts directly. The raw-versus432
Mandos comparison found identical basic life/archive/journal results and passing
structured-command/handover/rest controls; the subscriber contract was not required for that proved Mandos path. Source
resolution is independent and its canonical issue owns the later state.
PR433 is parked optional work, not a default seed/birth API requirement.
No change to the retained live lab bundle is implied.

## Historical native C copies

Active C catalogue/evidence/proposals/patches are owned by
[neo-angband-tracker](https://github.com/diegoami/neo-angband-tracker/tree/master/patches).
The upstream-c files here remain frozen for old report/PR links; do not edit
them as a second ledger. Native C map-cancel proposal1 remains closed/unmerged
and linkable in that fork. Mandos88 lighting wrapper is closed/unmerged and
retained as historical report evidence; practical impact remains unproven.
No official C submission is authorized by this index or migration.

## Mandos translations of C source corrections

[Native C translation provenance and independent TS units](c-translations/README.md)
link canonical C source issues/proposals, exact original translations, Mandos
consumer issues and replacement conditions. These are TS source deltas, separate
from the published core package patch and frozen historical upstream-c copies.
[The C milestone contract](../docs/C-MILESTONE-ADOPTION.md) owns current intake:
close ADOPTED after verified applicable coverage, independently of per-bug native
upstream state. The ledger retains per-fix TS proof/removal units and original
source links; old Mandos source-issue links are historical superseded receipts.

## Faithful-port source corrections

[Port correction units](port-corrections/README.md) record narrow TS source
imports, separate from C translations and engine package patches. Port41's
zero-base equipment-light correction is independent of original-C238's duplicate
modifier correction; each has its own consumer and removal unit.

## Mandos-owned corrections

[Own correction units](mandos/README.md) describe defects in our consumer/harness
without a false upstream dependency. They use normal verified own-issue closure;
source-port carries keep their existing upstream-linked lifecycle; C units use
the separate reviewed-milestone adoption/retirement contract.
