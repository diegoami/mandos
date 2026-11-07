# Independent faithful-port correction units

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
