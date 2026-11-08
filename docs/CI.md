# Mandos CI gates

[CI maintenance issue157](https://github.com/diegoami/mandos/issues/157) owns this
policy, coordinated by [workspace9](https://github.com/diegoami/angband-workspace/issues/9).

The `ci / verify` check runs once for each opened, synchronized or reopened PR
against main, on pushes to main after merge, and on manual dispatch. Feature
branch pushes, issues and comments do not run code tests. Privacy has the same
triggers and always scans the tracked content, including documentation changes.
Each workflow cancels its superseded run for the same PR or ref. The verify job
always exists, so required checks are not hidden behind a workflow path filter.

## Full verification

Runtime, tests, dependencies, locks, patches, plugin/build/grant files,
workflows, scripts, configuration and unknown paths use the existing complete
`CI=1 pnpm verify`: types, session metadata, every required test and committed
plugin currency, preceded by frozen install and the manifest-grant check. The
published engine plus named carries remains the default runtime. No assertions,
seeds, timeouts, missing-content behavior or consumer lifecycle changes here.

Workflow/script changes themselves take this route. Manual dispatch, missing or
unusable history, an empty/unrecognized diff, deletions and renames also take
full verification. Version tags no longer automatically publish GitHub Releases: the default
release workflow is manual-only, and inherited release/Nexus workflows are
disabled at repository level before mirroring historical upstream tags.
Default-branch YAML alone cannot guard workflows present on an old tag. See
[version lanes](VERSION-LANES.md); Nexus also retains its upstream-only guard.

## Small prose changes

Only additions/edits to these paths can use the lightweight route:

- Root README.md, AGENTS.md, CLAUDE.md, RULES.md, PLAN.md, PLANNED.md, SETTINGS.md.
- Markdown beneath docs/, except docs/audit/.

Every changed file must match; mixed changes use full verification. The route
runs dependency-free classification/trigger controls, session metadata validation,
changed-document local-link checks and Git whitespace checks, plus the separate
privacy workflow. It does not install packages or run the live game. Links to
local files must exist inside this repository; external links cause no network
requests and Markdown anchors are not checked. A lightweight documentation
check is not a runtime/replay/adoption receipt.

The allowlist deliberately excludes all JSON, logs, other data and unknown
extensions. `src/postmortem/replay.test.ts` reads the committed
`docs/runs/2026-11-05-b99-desktop-death-replay/runs.json`. Session/watch tools read
migration, adoption and catalogue JSON. Audit tooling checks generated
`docs/audit/c-classification.md`. CHANGELOG.md is release-notes input. These
remain full inputs even though they sit beside prose. New file consumers must
be considered before expanding this allowlist; there is no broad docs/** skip.

## Diff and local controls

PR classification uses the complete base-SHA...head-SHA merge-base diff, so a
later prose-only commit cannot conceal earlier source changes, and unrelated
base-branch changes do not contaminate a prose-only PR. Main pushes use the
exact before-SHA..after-SHA range, including every commit in a batched push.
The checkout fetches complete history. Refs are validated as immutable SHA-1s,
Git arguments never pass through a shell, and NUL-delimited statuses retain
rename source and destination names. An unusable range chooses full.

```sh
node --test .github/scripts/ci-controls.mjs
```

The controls build real isolated Git histories for PR/push semantics and test
mixed/unknown/data inputs, renames, malformed or unavailable refs, fail-safe CLI
output, document-link failures and workflow trigger/release guards. They require
only Node and Git and execute on both verification routes. CI workflow changes
still require their actual full hosted gate before merge. For this owner-scoped
maintenance task, focused local controls plus that hosted full gate avoid a
redundant local live-game run; this does not waive full verification.
