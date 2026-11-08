# Mandos

Mandos is a **bug-fix consumer for the Neo Angband Borg**. It adopts verified
port and engine corrections, follows reviewed better-borg-c C milestones with
independent TypeScript translations, and keeps producer/consumer proof traceable.
Existing class/race choices and controller behavior remain; this repository is
not the active platform for strategy research or experimental performance work.

Neo engine/port work follows **intake → reproduce → verify → carry → upstream
adoption → retire the replaced backport**. C work follows **reviewed immutable
native milestone → TS applicability/translation → verify → ADOPTED**, with
independent per-unit retirement later. [Landing203](https://github.com/diegoami/mandos/issues/203)
replaces the old per-C-source mirror queue; [the contract](docs/C-MILESTONE-ADOPTION.md)
requires the port-first gate before new C milestone code. Targeted legal scenarios, fixed-seed
regressions and basic run/death/stall records support that work. Broad class/seed
cohorts, stage/save-ladder research, trainer feedback and advanced death/replay
analysis are parked optional tools. Their code, branches and evidence are
preserved, not deleted or automatically moved elsewhere. See
[the scope contract](docs/MANDOS-SCOPE.md) and [scope task181](https://github.com/diegoami/mandos/issues/181).

The selected default for the **Core/harness** is unpatched published beta.3.
[Runtime180](https://github.com/diegoami/mandos/issues/180) records the actual
proof: 87 controller/rest checks and three basic cases pass on raw beta.3 with
identical traces to the input-flush carry profile; 99 C/class controls also pass.
A local engine backport remains an exception for a demonstrated required Mandos
gameplay defect, with its regression/removal condition. Optional replay does not
require PR433 in the default engine. Dropping an unneeded carry does not fix its
general upstream issue. Final package/plugin adoption checks remain part of180.

**Official stock beta.3 desktop/web cannot currently run the Mandos controller
under its own `mandos` identity.** The [official97ce controller gate](https://github.com/neostryder/neo-angband/blob/97ceec2925e6715ba725624a61866ab93a196a12/packages/web/src/mod-api2-shim.ts#L603)
is first-party-only, and the compiled origins omit Mandos. No supported
configuration route was found; `engine:access` alone is insufficient. Core/npm
verification is therefore not an interactive installation claim, and Ctrl-Z or
the title screen is not a stock-host fallback. Existing authorized first-party
host/lab code is retained unchanged; no lab upgrade or deployment is claimed.
See [the host boundary](docs/MANDOS-SCOPE.md#interactive-host-boundary) and
[coordination22](https://github.com/diegoami/angband-workspace/issues/22).

Start an agent at [AGENTS](AGENTS.md), [RULES](RULES.md), [PLAN](PLAN.md) and
[checkpoint36](https://github.com/diegoami/mandos/issues/36). The
[component map](docs/SESSION.md) keeps ownership separate:

- Engine/C tracker: original C Borg, Angband game and Neo engine source defects.
- Neo Borg mod tracker: faithful TypeScript port defects and source proposals.
- Mandos: applicable consumer corrections, its own bugs and verified integration.
- better-borg-c: independent native consumer, reviewed C milestone producer and
  owner of its per-bug upstream/adoption status; experiments only when owner-directed.

Canonical original-C defects remain in the engine/C tracker. Mandos consumes
reviewed native milestones rather than duplicating their per-bug status; C
translations stay here, not in the fidelity-only port. Completing a milestone
means ADOPTED by Mandos, not that every C defect is fixed upstream.
borg-rs is independent and reports directly to our C board; no Rust polling,
dispatch, code transfer or issue migration is implied. Future experimental work
belongs in a separately authorized better-borg-c or borg-rs session, not this queue.

[Controls](docs/README.md), [adoption process](docs/process.md),
[source ownership](docs/UPSTREAM.md), [patch ledger](patches/README.md),
[historical records](docs/runs/README.md), [transferred issues](docs/migrations/repository-split.json).
The [canonical C catalogue](https://github.com/diegoami/neo-angband-tracker/blob/master/docs/C-BUGS.md)
stays in the engine/C repository. Old pages here are reference links.

Use Node22+ and the pnpm version in package.json. Run `pnpm install --frozen-lockfile`
and `CI=1 pnpm verify` for the supported default. `mandos.stageRetirement` is an
explicit optional opt-in, off by default. Retained replay/dossier/window/handoff
tests use `pnpm test:optional-replay` with their matching profile. Optional tools/profiles
have their own requirements and do not gate a routine engine upgrade. Rebuild
plugin.js when its runtime source changes. A source merge is not a lab deployment;
owner saves/profiles and the running lab stay untouched without separate authorization.

Existing verified C corrections, targeted regressions and independent TS removal
units are preserved. The [current ledger](patches/c-translations/README.md) maps
existing coverage to reviewed native units, with a grandfathered Enlightenment
exception; it is not a declaration that the full milestone is adopted. Closing
legacy mirror issues as tracking-superseded does not remove code or fix its source. Upstream credit, GPL/Angband licences and AI_USAGE_POLICY
remain intact. [Pre-split history](docs/history/repository-split) and
[reorganization reviews](docs/migrations/reorganization-review/README.md) remain reference evidence.

Accepted Borg PR76's backup-notice correction is tracked in
[consumer204](https://github.com/diegoami/mandos/issues/204) and its
[pinned adoption receipt](docs/runs/2026-11-07-notice-swap-adoption/README.md).
The published beta.3 default and nine existing C corrections are preserved.
This adoption checks Core/harness behavior; it does not repeat the separate
historical interactive-host qualification below or deploy the lab.

The [armour/HOME leaf of125](https://github.com/diegoami/mandos/issues/125)
adopts known carried armour-backup value and strictly better HOME retrieval from
source48, with [registered-item controls and a separate removal unit](docs/runs/2026-11-07-armour-home-adoption/README.md).
The separate [source50 tactical/SR adoption](docs/runs/2026-11-07-backup-tactical-adoption/README.md)
restores native backup commands and resistance availability. Source/consumer
required gates and actual-main status stay explicit. These are C parity
corrections; no strategy or C milestone correction is introduced.

## Exact edge.218 developer folder

The normal build keeps the unpatched published1.23.0-beta.3 default. For the
separately checked edge.218 developer mode, materialize a fresh folder from
the same checked plugin:

```sh
mkdir -p artifacts
node tools/build.mjs --profile edge218 --out artifacts/mandos-edge218
```

The command preserves Mandos's ID/version/runtime and all settings. It changes
only the exact engine requirement and the controller/Core permission requests,
and prints the manifest/plugin hashes. An existing output directory is refused.
Install this **folder**, not a ZIP, through the documented Lab Desktop developer
route with `labprocess=mandos`, approve the native permissions, create a
character normally and use Ctrl-Z to hand it over. This uses official source
and documented Lab build options; no compiled Mandos-registration patch or
first-party identity spoof is required. Ordinary public Worker execution still
cannot provide Mandos's raw Core access.

A fresh Lab Desktop probe of the profile’s checked plugin demonstrated native
consent, controller-owned game progress and Escape returning the keyboard.
It did **not** certify full management or persistence: profile/session scopes
remain first-party-only. The initial probe showed “Saving failed.”; a later
same-profile manual save succeeded. Startup/autosave timing remains separately
investigated, and persistence of that short controller interval was not measured.
Use disposable test characters for this qualification mode.
The downloaded ordinary desktop release was not the GUI tested.
[Task199](https://github.com/diegoami/mandos/issues/199) and the
[pinned evidence/profile description](docs/runs/2026-11-07-latest-borg-edge218/README.md)
own the current exact qualification and limits. The existing lab/data are untouched.

## Separate upstream and port-only version tags

[Version lanes](docs/VERSION-LANES.md) separates the exact upstream Borg release,
our faithful port-fix build and this full Mandos main. Port-only builds start
from official upstream ancestry and contain no Mandos C translations or own
controller/strategy/tooling changes. Main retains all nine C units and existing
consumer behavior. A version tag is not an engine update or lab deployment.


External measurements can use the [single-run zoo harness](docs/ZOO-HARNESS.md):
build once, then run one seed to a game-tick cap with explicit JSON/JSONL outputs.
The zoo owns suites/statistics; this adds no Borg behavior or Mandos cohort program.
