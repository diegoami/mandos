# Mandos development and adoption process

Start at ../AGENTS.md, ../RULES.md, ../PLAN.md and checkpoint36. This process
owns Mandos work, not the source-defect queues in the two repair forks.

## Workspaces and issue ownership

[Session map](SESSION.md). Neo engine/C session: ../neo-angband-tracker, native
C worktree inside it. Port session: ../neo-angband-borg-mod-tracker. Mandos:
../better-borg. The original lab/pristine checkouts remain unchanged references.
Transferred histories/redirects are in migrations/repository-split.json.

Open a source defect in its owning fork with provenance, pins and reproduction.
Engine/port defects have separate Mandos consumer work. C defects remain canonical
there, while Mandos consumes reviewed native milestones through203 instead of
creating one mirror per source issue. Source repairs/proposals
are implemented by that session from the correct pristine upstream base.
Native C submissions remain paused; no repo performs them automatically.

## Mandos gate

Use Node22+, source ~/.nvm/nvm.sh locally, and pnpm from package.json.
pnpm install --frozen-lockfile installs the matching published content/engine
with no default package patch. Run-record tools use tools/engine-pin.mjs; md5sum of
node_modules/@rpgm-tools/neo-angband-core/dist/game/trap.js identify the runtime;
current published beta.3 trap fingerprint is ce8b43e933803487d70973d5a9e0905c.
Optional historical backports under patches/optional are not applied. Old
beta.2 records retain their original34c27241f96aceff581bcb186a9d898f profile.
Core/harness verification does not certify ordinary stock desktop loading: beta.3
gates the current API2 controller to first-party mods; no trust bypass is implied.

Run relevant basic gameplay/record and bug regressions first, then
CI=1 pnpm verify logged under artifacts/. The default discovery explicitly
excludes four advanced postmortem/human-replay suites. Preserve them through
pnpm test:optional-replay; its separate result is optional and never a runtime
requirement. It needs sufficient captured birth inputs and compatible code/data;
missing input reports unavailable rather than fabricating a replay. Use
flock /tmp/angband-validation.lock to avoid another local heavy gate across
sessions. A worktree must have dependencies; install or use an owned symlink.
Relevant skips/reds require diagnosis, not assertion/seed edits to pass.
Full gate checks session bootstrap, types/tests and committed plugin currency.
[CI routing](CI.md) documents the conservative prose-only metadata/docs/privacy
gate, PR/main/manual triggers and workflow-maintenance validation. Unknown,
workflow and runtime paths retain full verification.

Bug fixes retain before/after legal scenario controls and relevant basic
run/death evidence; experimental cohorts/stage research are parked and optional; source-only evidence is not a practical outcome claim.
Committed docs/runs/evidence is append-only. Bulky scratch data stays ignored.

## Adoption and merge

Inspect canonical correction and exact API/dependency pins. Adopt with local
Mandos changes and FORK marks; rebuild plugin.js, verify applicable published
package/harness/plugin and separately authorized lab consumers. Source merge
is not deployment. Keep patch-active on required backports even after closure.
Do not remove a hunk just because another consumer adopted a fix.

The main session merges after the documented gate and required CI. No amend,
force-push or moved tags; preserve topic heads and unique evidence. Update the
owner integration issue and checkpoint36 at merge/stop. No background agent
without owner direction; independent model review remains owner-launched,
with a ready-to-paste read-only prompt in migrations/review.md.

## Reviewed native C milestone intake

[The C milestone contract](C-MILESTONE-ADOPTION.md) is authoritative for C only.
Canonical original-C defects remain in neo-angband-tracker. Native better-borg-c
applies/reviews fixes and owns its per-bug upstream/adoption follow-up. Mandos
uses one adoption issue per REVIEWED immutable milestone, currently
[203's cumulative M3 target](https://github.com/diegoami/mandos/issues/203), not
moving main or a per-source C mirror queue. Source issue links remain secondary
provenance, not separate Mandos work items.

Before any new C code, inspect203's classified port-first gate. A known actual
missing parity leaf blocks until applicable verified upstream adoption or a
verified locally carried correction. Mere proposed PRs are insufficient. Tests
and broad audit umbrellas are classified separately, without waiving required
reds or hiding genuine missing components.

Each selected milestone records per-unit TS disposition, existing equivalence,
legal regressions and independent provenance/removal units. C-only memory code,
strategies, measurements and recording/death infrastructure do not migrate
automatically. Close ADOPTED once all applicable coverage is verified; this is
not a source-fixed claim and does not wait for native/source upstream closure.
Retirement still verifies the actual Neo/TS replacement per unit, even when the
native patch has disappeared. Keep the grandfathered existing Enlightenment
unit: native157 is now adopted after reviewed M3, not a reviewed-target extension.
No rollback or blocking unrelated reviewed coverage is implied.

The [current TS ledger](../patches/c-translations/README.md) links existing proof
and units. Legacy C issue IDs, old dated applicability receipts, FORK comments
and migration *_at_split data are preserved history. Their former per-source
queue/carried-open rule is superseded; their tracking-superseded closure removes
no code and claims no upstream fix. Do not recreate those mirrors. Engine/port
consumer and Mandos-owned bug lifecycle remains unchanged.

## Records and lab safety

The lab remains on its intentional branch/build and uses ../mandos-lab-data.
Do not repurpose it for either repair session. tools/lab.mjs, tools/runs.mjs,
postmortem tools and docs/runs/README.md document current instruments; original
setup/lab procedure is archived at history/repository-split/process-before.md.
That archive is historical context, not a competing queue/scope policy.

## Fresh clone hooks

Clone the source trackers using their canonical names alongside better-borg.
Set git config core.hooksPath .githooks in Mandos. The wrappers prefer the
new neo-angband-tracker hook source (or explicit NEO_ANGBAND_REPO), with the
old lab path only as compatibility fallback. No live lab checkout is needed
to commit Mandos work on a fresh three-session setup.

## Backup and workspace recovery

[Current private-backup procedure](backup.md) covers lab state, restore points,
selected unique evidence and verification. The supplementary owner workspace
records four Git submodules (including the independent native C consumer),
directory inventory and exact recovery pins.
Recovery supplements the accepted session plan without changing source ownership;
use the lane-specific adoption lifecycle above. OAuth migration remains tracked by Mandos #52.
