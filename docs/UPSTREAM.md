# Fix ownership and Mandos integration

Canonical source defects live in our repair forks:
- diegoami/neo-angband-borg-mod-tracker: TypeScript Borg port omissions/defects.
- diegoami/neo-angband-tracker: original C Borg/C game and Neo engine defects.

Mandos owns its own bugs and applicable verified consumer adoption. Native
better-borg-c applies/reviews C fixes and owns per-bug native/upstream follow-up.
Mandos's C unit of work is a REVIEWED immutable native milestone through
[203](https://github.com/diegoami/mandos/issues/203), not per-source mirrors.
[The C contract](C-MILESTONE-ADOPTION.md) defines the port-first gate, independent
TS translation/proof/removal units and ADOPTED closure. C source links remain
secondary provenance; an adopted milestone is not an upstream-fixed declaration.

[Scope181](MANDOS-SCOPE.md) parks experiments, not applied corrections.
[Migration history](migrations/repository-split.json) preserves old issue URLs.
The21 retired C mirrors are tracking-superseded history with code/proofs intact.
Existing port/engine and own-bug routes are not part of that retirement.

Use targeted source/consumer checks for active bugs and closure. Broad
reconciliation stays weekly/manual or explicit owner work. Native moving main
is not review-qualified by default. Before inherited watchers, audit their scope:
Mandos C intake follows named native milestone/review records, not per-bug source
queues; no Rust repo/files/external issue polling is authorized. borg-rs reports
directly to the canonical C board. Incomplete reads are not successful baselines.

Prefer the unpatched published engine. A carry needs a demonstrated required
Mandos gameplay path plus regression/removal conditions. Optional433/replay is
not a default requirement. Not needing a carry does not fix its source issue.

For Neo engine/port defects, source fork issues own the defect/proposal and have
no consumer carry/fixed labels. Their separate Mandos consumer stays carried/OPEN
until accepted upstream correction plus verified local adoption; then fixed/CLOSED.
Partial needs a real missing component. patch-active maintenance is independent
of closure. Proposal/file alone is not application; no release wait alone.
Mandos-owned bugs close after normal verified own-main correction.

For C, close the milestone ADOPTED after applicable coverage is verified.
Retire each TS unit only after the actual Neo/TS replacement and relevant
consumer proof, not merely native patch removal or source acceptance. Never
silently discard an unrelated hunk or reapply an already equivalent correction.

Canonical C catalogue/native evidence/source proposals remain in the engine/C
tracker. No official C issues/PRs/comments are authorized here. Neo source
proposals use the proper neostryder repository after proof/duplicate checks,
from isolated branches excluding session docs. Preserve source-owned history
through normal merges, never force resets. Lab deployment remains separate.
