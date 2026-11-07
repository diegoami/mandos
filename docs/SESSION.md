# Independent component sessions and parent coordination

| Session | Repository | Root under the Angband umbrella | Owns |
| --- | --- | --- | --- |
| C/game/engine fixes | [diegoami/neo-angband-tracker](https://github.com/diegoami/neo-angband-tracker) | neo-angband-tracker/ | C Borg, C Angband game, Neo engine; C branch/worktree in this same fork |
| Port fixes | [diegoami/neo-angband-borg-mod-tracker](https://github.com/diegoami/neo-angband-borg-mod-tracker) | neo-angband-borg-mod-tracker/ | Upstream TypeScript Borg port defects and isolated Neo proposals |
| Native C consumer/producer | [diegoami/better-borg-c](https://github.com/diegoami/better-borg-c) | better-borg-c/ | Native application/reviewed milestones and per-bug upstream follow-up; source defects stay canonical on engine/C tracker |
| Mandos bug-fix consumer | [diegoami/mandos](https://github.com/diegoami/mandos) | better-borg/ | Applicable bug adoption/C-to-TS translation, targeted regressions and basic records |

Mandos's [current consumer scope](MANDOS-SCOPE.md) parks experimental cohorts,
strategy/stage research and advanced death tooling. Existing code/evidence stays.
Future experiments may be independently owner-directed in better-borg-c or
borg-rs, without automatic task/code migration or Rust dispatch/polling.

Mandos's selected default is the verified unpatched beta.3 **Core/harness**.
Official stock desktop/web has a separate first-party controller gate and does
not register Mandos under its own ID. There is no supported configuration or
Ctrl-Z fallback; `engine:access` alone is insufficient. See
[the exact host boundary](MANDOS-SCOPE.md#interactive-host-boundary) and
[runtime180](https://github.com/diegoami/mandos/issues/180). The retained authorized
host/lab code is unchanged and undeployed by this integration. Do not infer a
stock interactive launch or lab refresh from passing npm/harness checks.

Each session reads its own AGENTS/RULES/PLAN/checkpoint. It does not inherit
another repository's queue or start fixing a different component silently.
The old neo-angband lab checkout and pristine neo-angband-upstream / original
neo-angband-mod-borg checkouts are retained references, not these workspaces.
Do not change the live lab or its mandos-lab-data while bootstrapping.

One GitHub Angband fork network is available: our neo-angband fork therefore
hosts Neo engine master and the separately based C workbench/reference topic
branches. A C proposal must never be based on Neo TypeScript master. The
native C worktree is .worktrees/angband-c inside the engine session root;
it is part of the same source-tracker repository/session. A separately launched
native-C proposal
lane uses this worktree; it is not the better-borg-c consumer product.

Upstream reports stay on angband/angband or the appropriate neostryder repo
only under the standing posting rules. Our fork issues are our canonical
trackers; transferred Mandos URLs remain historical redirects. See the
migration ledger and each checkpoint for exact current issue numbers.

## C correction flow and independent Rust peer

The engine/C tracker remains canonical for original-C defects/evidence/proposals.
Native better-borg-c applies/reviews fixes and tracks its per-bug upstream state.
Mandos follows one reviewed immutable native milestone per adoption issue,
currently203's M3 cumulative target; it does not recreate per-source C mirrors.
Read [the milestone contract](C-MILESTONE-ADOPTION.md) and its port-first gate
before any new C code. Applicable TS translations/proof/removal units stay here;
ADOPTED closure is not a source-fixed claim. Native patch retirement alone never
proves the Neo/TS correction can be removed. Existing verified units remain.

borg-rs reports directly to the source board; do not poll/fetch its repository,
files or external issues or dispatch Rust work. Its historical reference clone
is not managed. The faithful Neo port still does not translate C corrections;
engine/port/Mandos-own bug routes and lifecycle are unchanged.

The umbrella parent coordinates scoped dispatch, dependencies and verified
recovery metadata; it does not take component code ownership. Read the owning
repository instructions/checkpoint before acting. Broad reconciliation is a
weekly manual batch; targeted active blockers and closure checks remain timely.
Read the current bug and relevant source/action comments. The retained
[advanced death-session contract](deaths/DISCUSSIONS.md) is parked optional
reference, not routine startup or an upgrade prerequisite. No unattended reader
exists. [Optional window profiles](deaths/WINDOWS.md) preserve actual Neo units
and legacy evidence, independently of native C gameplay/save semantics.
