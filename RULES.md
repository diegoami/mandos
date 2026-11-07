# Mandos working rules

1. Mandos is a verified bug-fix consumer; docs/MANDOS-SCOPE.md defines active
   versus parked work. Keep targeted regressions and basic run/death evidence.
   Upstream port fixes belong in diegoami/neo-angband-borg-mod-tracker; C Borg/C game/
   Neo engine fixes belong in diegoami/neo-angband-tracker. Do not fix a different
   repository silently or duplicate its authoritative defect state here.
2. Read AGENTS/PLAN/session.json and checkpoint36 before acting. Reconcile
   boards/source/current bug state first, then triage/list maintenance, then
   implementation. Use qualified cross-repo refs and canonical issue URLs.
3. A bug outranks a new feature. Current new strategies/learning/fatal-state
   snapshots/unattended stage-resume features stay parked unless the owner
   explicitly authorizes them. Restoring C parity is a defect, not a strategy.
4. Mandos remains class-agnostic; class/build policy belongs under src/class.
   Bug corrections use a targeted legal regression and relevant proxy; a broad
   reach-rate cohort or strategy round is not a prerequisite.
   Mark intentional divergence FORK with source reference and what/why.
5. The mod obeys declared APIs; no privileged engine reads or network/wall
   clock in its controller. Determinism is required. Offline tools produce
   frozen data; do not sneak new gameplay policy into an integration fix.
6. Full changes use pnpm verify as the merge gate: typecheck, session check,
   tests and committed plugin currency. The narrow prose-only gate in docs/CI.md
   checks metadata/docs/privacy; unknown and workflow changes stay full.
   Relevant tests must execute; CI missing content fails.
   Prefer an unpatched published engine. An engine carry is an exception for
   a demonstrated required gameplay defect, with regression and removal criteria.
   Optional replay/PR433 is not a mandatory runtime or upgrade requirement.
   Default functionality and basic evidence remain required; parked advanced
   suites have an explicit optional profile, not blanket upgrade-gate status.
   Local-core testing is an explicit opt-in and must not masquerade as published.
7. For Neo engine/port corrections, adopt with local changes, rebuild and verify
   affected in-scope package/plugin/harness consumers before closing adoption.
   Verify a lab only when separately authorized; source merge is not deployment.
   Source repair forks have no consumer carry/fixed labels. Mandos engine/port
   carried issues stay OPEN until upstream resolves the correction and verified
   adoption reaches us; then fixed/CLOSED. No release wait or speculative holds.
   Partial needs a concrete missing component; new actual recurrences get new
   linked bugs. patch-active maintenance is independent of closure.
   C-origin tracking is the explicit exception in rule13: reviewed native
   milestones close ADOPTED, without a per-source upstream-status mirror queue.
8. Keep C defect catalogue, native evidence and active C proposals canonical
   in the engine/C fork. Historical Mandos evidence/patch copies stay immutable
   for old links. No angband/angband issues, PRs or comments from us; C posting
   pause persists. A faithful inherited C defect is not a Neo port omission.
9. Git history/tags/credit remain intact. No amend/force-push. Owned default
   branches now contain session docs; integrate upstream without resetting
   those commits. Isolated source proposals start from correct pristine bases
   in their owning session, excluding bootstrap docs. Preserve topic heads.
10. Committed docs/runs records and evidence are append-only. Preserve owner
    saves, browser profiles and mandos-lab-data. Keep old lab/reference trees
    untouched unless the owner task explicitly requires their update.
11. Coordinate one heavy local gate across sessions with flock
    /tmp/angband-validation.lock; log/watch background gates. Do not start
    background agents without owner direction. Reviews are read-only. No
    AI-attribution trailers; retain AI_USAGE_POLICY and upstream licences.
12. Checkpoint36 and owner issues hold durable decisions/receipts. Update
    monitors, patch ledger, affected docs and consumer state at merge/stop.
    A question alone is not an edit request; explicit owner tasks override
    local process defaults. Current source/issue evidence overrides old history.

13. C translation remains Mandos work, but intake follows REVIEWED immutable
    better-borg-c milestones, not individual neo-angband-tracker proposals or
    moving native main. Canonical C defects stay in the source tracker; native
    better-borg-c owns per-bug native/upstream follow-up. Read
    docs/C-MILESTONE-ADOPTION.md and landing203 before selection.
    One adoption issue per reviewed milestone records per-fix TS applicability,
    existing equivalence, independent translations/proof/removal units and tests.
    Close ADOPTED after all applicable coverage is verified; that is not a source
    fixed claim. Legacy per-C Mandos issues are superseded tracking history.
    Before NEW C milestone code, clear the classified port-first gate: a genuine
    missing parity leaf blocks; mere proposed PRs are not verified carries.
    Tests/audit umbrellas are assessed separately, without ignoring required reds.
    Never auto-copy C-only memory changes, strategies, recording/death tooling.
    Retire each TS unit only after its actual Neo/TS replacement and relevant
    consumer controls/build are verified, even if native already removed its patch.
    Keep existing verified units, including the grandfathered Enlightenment unit;
    later native adoption outside the reviewed target does not roll it back or
    silently expand that target. Reconcile it through a future reviewed milestone.
    Faithful-port C parity and independent Rust ownership remain unchanged.

14. Read current bug/source/action comments and mark agent receipts explicitly.
    Advanced death-analysis/feedback sessions and DISCUSSIONS.md are parked
    optional reference, not routine startup or upgrade prerequisites.
    Acknowledgement is not resolution; no unattended-monitoring claim.
15. Preserve all applied bug fixes and historical code/evidence/branches when
    parking experiments. Do not silently move tasks/code to better-borg-c or
    independent borg-rs, poll Rust or dispatch a Rust worker. Parent reviews
    scope labels; parking/unapplying a carry is never a fixed-bug closure.
