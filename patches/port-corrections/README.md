# Faithful-port correction units and adopted baselines

These are source/test provenance units, not pnpm engine patches. The source
tracker owns the Neo Borg defect; Mandos consumer issues own carry/adoption
state. A stored patch or work-branch commit is not a carried main correction.

- [port41](https://github.com/diegoami/neo-angband-borg-mod-tracker/issues/41),
  reviewed source2ee4f82f7f845674e6c12575afbcc7837ae713db:
  [Mandos196](https://github.com/diegoami/mandos/issues/196),
  [source41-light-base.patch](source41-light-base.patch). Start BI_LIGHT from
  the C zero base, avoiding a second addition of already-derived player light.
  The source also corrects beam/recovery unit-fixture model inputs without
  changing assertions. It deliberately preserves C238's duplicate modifier,
  whose independent Mandos unit belongs in c-translations.

Retire only after an equivalent accepted upstream TS correction is imported
and independently verified in Mandos. Keep unrelated C and engine units.

The fixture-only producer follow-up3bcfe2fd3aa39c9e95e711ecbbc889930a40d26e
is preserved separately in [source41-policy-fixtures.patch](source41-policy-fixtures.patch).
It corrects tests' explicit model-radius or actual-known-lamp inputs while
keeping original assertions. The actual-source light fixture was unchanged at
import; Mandos's two C238 Phial expectations are a separately documented
intentional divergence afterward. The base unit has a local comment-only
clarification pointing to Mandos186; producer runtime code is otherwise exact.

The test helper is finally located outside production src/ at
 test/fixtures/known-light.ts, matching qualified producer714852008d6dff58f2ca72132d13e4e11716fd80.
The current fixture patch includes that mechanical relocation/import update.
No production boundary test/allowlist is relaxed. Prior source/adoption commits
and their failed required checks remain preserved; current consumer issues and
PR197 own final gate/application status.

Accepted upstream94d wiring is recorded by
[accepted94-wiring.patch](accepted94-wiring.patch), consumer
[Mandos200](https://github.com/diegoami/mandos/issues/200), source43/PR44.
The actual accepted upstream baseline is a4437882; this stored adoption delta
is provenance, not a claim of a remaining upstream bug or mandatory active
backport after verified adoption. SAURON_DEAD and future C240 remain separate.
The accepted gap removals/comment change require context-only refreshes of
C239's inventory hunk and source41's light-base hunk; original b8 units/history
remain immutable. Their functional behavior is preserved and reverse checks
remain independent.

Accepted backup-notice PR76 is recorded separately in
[accepted76-notice-swap.patch](accepted76-notice-swap.patch), consumer
[Mandos204](https://github.com/diegoami/mandos/issues/204), canonical
[port46](https://github.com/diegoami/neo-angband-borg-mod-tracker/issues/46).
Producer2860eef imports accepted official235a6f9 through normal merge07af34e.
The unit contains only the four accepted runtime hunks and three unchanged tests:
normal notice recomputes the backup; hypothetical power AND danger retain the
last full backup/options. It is accepted-upstream adoption provenance, not a
remaining upstream defect or an indefinite backport requirement. Actual Mandos
main verification controls closure. C9/source41/own198 stay independent.

The accepted94 option hunk now uses noticeSwap as surrounding context, preserving
all its added/removed correction lines. Its prior SHA256 at main75ffa891 is
7688aeff78ae2dbaab9a4b08e37fa334bb01f959ce343f8a2e6270155d25fbc5;
[the new receipt](../../docs/runs/2026-11-07-notice-swap-adoption/README.md)
records both hashes and all14 independent reverse checks. Old records/units
remain retrievable unchanged from their historical commits.

## Armour data/value/HOME carry and baseline dependency

[Source48](https://github.com/diegoami/neo-angband-borg-mod-tracker/issues/48),
source runtime79fc5a5883b0fca6cf24d61401e704027ddd9d97 and owned
[PR49](https://github.com/diegoami/neo-angband-borg-mod-tracker/pull/49), feeds
[Mandos125](https://github.com/diegoami/mandos/issues/125) through
[source48-armour-home.patch](source48-armour-home.patch). It restores only armour
backup data/value and strict HOME acquisition. Tactical swaps/SR-availability,
drop/enchant actions and original-C behavioral corrections remain separate.
This aggregate consumer stays partial for those actual omissions; source/main
and consumer verification remain independent.

Accepted76 is now a verified upstream BASELINE prerequisite. The armour unit
extends its shared noticeSwap and scratch snapshot controls to both backups.
Keep the original accepted76 delta/proof byte-immutable: do not reverse it
arbitrarily while dependent armour code remains, or claim that a text check
certifies functional independence. First remove the armour unit; the
[disposable reverse-image proof](../../docs/runs/2026-11-07-armour-home-adoption/reverse-image.json)
then matches all13 affected runtime/test paths exactly to verified main09566b87,
with four new paths absent, and accepted76's original reverse text check passes
in that order. A source retirement still needs a verified actual replacement;
removing a patch file alone is not retirement. Rebuild the generated plugin
after any runtime removal and run relevant replacement controls.

C9/source41/own198 patch bytes and their separate textual reverse applicability
remain preserved. Accepted94 gets only a surrounding import-context refresh for
the new armour type, with identical correction lines and old/new hashes in
[the current receipt](../../docs/runs/2026-11-07-armour-home-adoption/README.md).
Historical claims of all14 independent reverse checks describe the earlier
accepted76-only tree, before this dependent carry existed; they are not rewritten.

The armour source report/proposal is [Neo485](https://github.com/neostryder/neo-angband/issues/485)
and [modPR78](https://github.com/neostryder/neo-angband-mod-borg/pull/78), clean
head6e8aa5d3d6fe6137b1682e104b722cec99d61f73. An open proposal is not upstream
acceptance. Follow actual source resolution plus verified replacement adoption
before removing a carried unit;125's remaining tactical scope stays explicit.

## Armour curse-classification follow-up

[Source51](https://github.com/diegoami/neo-angband-borg-mod-tracker/issues/51),
reviewed runtime d9beead34594e52ab5a00b064f0aac395471945b, supplies
[source51-armour-curse.patch](source51-armour-curse.patch) to aggregate
[Mandos125](https://github.com/diegoami/mandos/issues/125). The armour-only
correction uses existing known isCursed classification for its hard gate and
5000 removable penalty. It includes six actual registered Razorback controls;
weapon handling/Deathwreaker and the earlier armour/HOME controls remain unchanged.
No tactical/SR or original-C behavioral correction is folded into this follow-up.

All earlier patch files stay byte-immutable. The removal order is source51,
then its source48 armour baseline, then accepted76 if an actual retirement
requires it. [The disposable source51 reverse image](../../docs/runs/2026-11-07-armour-curse-adoption/reverse-image.json)
returns its runtime/test paths exactly to verified main6e03, removing the new
six-case test; source48's original reverse text check then applies. This does
not certify arbitrary reverse order, replace actual upstream/replacement proof,
or rebuild plugin.js. Normal rebuild/current and relevant checks remain required.
Source48/51 share the pending Neo485/mod78 proposal lane; a proposal is not
upstream acceptance.125 remains partial for the separate tactical/SR leaf50.

## Tactical backup actions and SR availability

[Source50](https://github.com/diegoami/neo-angband-borg-mod-tracker/issues/50),
reviewed runtime fefd34131da5e7892d366315a28c3ace43e4cfae and final tests
352201a9cf47d88fb8ba67beb5a548bb41f1c95e, supplies
[source50-tactical-sr.patch](source50-tactical-sr.patch) through owned
[PR53](https://github.com/diegoami/neo-angband-borg-mod-tracker/pull/53) and
[Mandos125](https://github.com/diegoami/mandos/issues/125). It restores the native
backup maneuver, selected capability snapshots and SR availability, public
options and typed public loadout danger. Original C82's comparator/ties,
weapon acid-from-ELEC, never-populated backup fear and armour-only initial
critical snapshot are preserved. No original-C correction is included.

[The new removal proof](../../docs/runs/2026-11-07-backup-tactical-adoption/reverse-image.json)
returns all14 affected runtime/test paths exactly to verified a708, with three
new paths absent. Retirement order is50→51→48→accepted76; all prior16 patch
files stay byte-immutable. Text application alone is not replacement proof or
permission to remove an adopted prerequisite. Rebuild the generated plugin
and verify relevant actual replacement behavior on any retirement.

125's current carry/remaining scope and203's gate follow verified actual-main
receipts, not a proposal, work branch or this stored patch. Existing C9/source41/
own198 and basic evidence remain independent. See the
[pinned proof and limits](../../docs/runs/2026-11-07-backup-tactical-adoption/README.md),
including the explicit unverified floor-conservation boundary.
