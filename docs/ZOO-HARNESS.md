# One-run headless measurement for the Borg zoo

[Owner task #213](https://github.com/diegoami/mandos/issues/213) adds an external
measurement interface. It does not add a strategy or move cohort research into
Mandos. The zoo chooses suites and owns their results. No zoo repository or
existing run record is modified by this tool.

```sh
pnpm install --frozen-lockfile
node tools/zoo-build.mjs --out artifacts/zoo
node tools/zoo-run.mjs --bundle artifacts/zoo \
  --seed 7 --turns 100000 --out /tmp/run.json \
  --race Human --class Warrior --settings /tmp/flags.json \
  --states /tmp/states.jsonl --commands /tmp/commands.jsonl
```

Build once per source/dependency version, then reuse the bundle in many separate
processes. `zoo-run` never runs esbuild. Its default bundle directory is
`artifacts/zoo`; the build output can be selected explicitly. Source, bundle and
content fingerprints are checked before play. Rebuild after any input changes, selecting a fresh directory (for example
`artifacts/zoo-next`) and passing it with `--bundle`; existing bundles are immutable.
Only the installed, pinned registry Core/SDK/content graph is accepted, with
Mandos's declared pnpm patches. Local source profiles, a second SDK, `NEO_*`
aliases and sibling lab/content fallbacks are not used. The tool runs no desktop
or host process and needs no replay/birth engine patch.

All output files must be fresh and explicitly named. Parent directories are
created as needed. Existing files are never overwritten. No output, including
build output or a resolved symlink alias, may be under a `docs/runs/` directory
in this or another checkout. No output path is included in play inputs or hashes. Build input labels are
normalized through the pnpm virtual store, include tsconfig.json, and whitespace-only
bundling removes filesystem-location comments without renaming or rewriting policy.
A shared-node_modules/second-checkout regression verifies identical fingerprints.

## Options and births

`--seed` is a required unsigned 32-bit integer, including zero. `--turns` is a
required non-negative integer, including a birth-only zero. `--decisions` is the
Core-loop-call safety budget (default 10,000,000). State and command files are
optional. `--help` lists the interface.

`--race` and `--class` independently select case-insensitive names from the
pinned content pack. Unknown names fail rather than falling back silently.
Assigned births use ordinary `startGame` and its standard stat roller: no
strategy pack, point-buy plan, RNG rewind or stat substitution is introduced.
The record includes the actual pair, selection mode, five birth stats, roller
method and immutable birth options.

**Correction to the old harness comment:** published beta.3's `startGame` first
birth defaults to **Human Warrior**, not a seeded race/class roll. Only later
`reincarnate` calls roll omitted choices. Omitting these new options preserves
that actual existing behavior; this tool plays one life and never reincarnates.

`--settings` accepts a JSON object of the nine boolean **controller** flags:
`borg.playsRisky`, `borg.worshipsDamage`, `borg.worshipsSpeed`, `borg.worshipsHp`,
`borg.worshipsMana`, `borg.worshipsAc`, `borg.worshipsGold`, `borg.selfScum` and
`borg.munchkinStart`. The build derives their mapping from the actual plugin's
`RULE_CFG`, not a second policy table. Values are installed before `createBorg`
reads them; `settings` records the resulting values for all nine, including
defaults. `cfg` also records the complete actual internal configuration.

Host birth-pool toggles and parked stage/replay settings are not controller
settings. They are rejected instead of falsely recorded as applied; use the
assigned birth options for this single character. This interface does not change
the plugin's settings or expose additional gameplay knobs.

## Counters, caps and outcomes

`state.turn` counts Core **game ticks** from birth, initially zero. Published
beta.3's `game/energy.js` defines normal speed110, gain10 per tick and move
energy100: one normal-speed action takes **10 game ticks**. The scheduler can
spend several ticks or queued actions inside one `runGameLoop` call. These are
not Borg decisions, energy units or seconds. Mandos/Neo seeds do not identify
the same game as original-C seeds; the zoo must not pair them across engines.

No supported hook stops at every individual game tick without changing the
loop. The tool stops at the **first existing Core loop boundary at or after T**,
before arming another Borg decision. A cap can overshoot, especially during an
automatically repeated command. `turnCap` records requested/actual ticks,
overshoot, per-run `exact` and `guaranteedExact:false`. A T51 control stops at60;
a coincidentally exact endpoint does not make the policy generally exact.

`decisions` counts actual returned controller commands, including the killing
command. `attempts` includes armed replies with no command. `loopCalls` counts
Core loop invocations; that is what the `--decisions` safety limit bounds.
`noCommandReplies` and the per-code `commands` census retain the existing
instrument's meanings. Immediate target-setting events do not add decisions.

The single `outcome` is `death`, `borg_stopped`, `stalled`, `turn_cap` or
`decision_cap`, in that precedence at a shared stopping boundary. Death includes
the engine's `causeOfDeath`; a stop includes the Borg's explicit reason; a stall
includes the existing watch record. None is a harness error, and all exit zero.
Only `harness_failure` exits nonzero, with an error object. If a failure occurs
before bundle/provenance or birth can be loaded, those facts are unavailable
rather than invented; state/command files may be absent or partial. An unexplained engine `STOPPED` without a Borg reason is a harness failure,
not a safety-cap result. An existing
or prohibited output path is never overwritten just to write an error record.

## Run JSON and streams

The record schema is `mandos/zoo-run@1`. In addition to outcome, counters and
birth/settings, it contains final `turn`, `depth`, `maxDepth`, `level`, `maxLevel`,
`hp`, `maxHp`, `energy`, `firstDepthTurns`, caps and `playSha256`. Natural-death
HP is preserved, including negative HP. No cheat-death continuation is used.

The optional state stream is canonical JSON Lines. Each line has `kind`, `turn`,
`decisions`, `attempts`, `loopCalls`, `depth`, `maxDepth`, `level`, `maxLevel`,
`hp`, `maxHp` and `energy`. There is a `birth` line, a `periodic` line at each
100 issued commands, a `stop` line and separately typed `depth` arrival anchors.
`firstDepthTurns` records each depth's first completed arrival boundary. The
existing driver handles `LEVEL_CHANGE` before this boundary, without advancing
the game tick between arrival and observation. The extra anchors avoid claiming
an exact first arrival from coarse 100-command samples. Maxima are sticky reads
at every boundary, including the stop; maximum level also uses Core's maxLev.

`playSha256` hashes the exact UTF-8 bytes optionally written by `--commands`.
Each event is recursively key-sorted JSON, followed by exactly one LF (no BOM).
Objects omit undefined properties as JSON does; arrays preserve positions;
non-finite or non-JSON command values fail rather than lose arguments silently.
Events, in issuance order, are:

```json
{"command":{"code":"walk","dir":6},"type":"command"}
{"accepted":true,"args":{"id":12},"type":"target_monster"}
{"args":{"x":20,"y":10},"type":"target_location"}
```

Target actions change the game immediately outside a returned command, so their
arguments/results are recorded too. Null replies are counters, not fabricated
commands. The hash identifies the ordered issued play stream; interpreting it as
the same game also requires matching starting inputs and engine/content/source
identity. It is not a save/replay-fidelity or survival-benefit claim.

## Provenance and verification

Every completed run records build commit and dirty state, source and bundle
SHA-256, actual package versions/registry integrity, content-pack SHA-256,
configured/applied pnpm patch paths with raw SHA-256 and normalized pnpm hashes,
declared/installed lock hashes,
entry version, inputs and runtime Node/platform/architecture. Installed and project lock patch hashes must match the configured patch bytes
under pnpm12's UTF-8/CRLF-normalized SHA-256 algorithm; importer patch hashes must
agree too. A stale or edited-but-unapplied patch fails with a reinstall request. Build provenance describes the compiled
source, not an unrelated current HEAD; stale source/bundle/content is refused.
`metadata.wallTimeMs` is the sole elapsed-time measurement and never influences
play. No wall timestamp, hostname, PID or generated run ID is included.

Identical inputs/build/runtime produce identical records after removing wall
metadata, and identical state/command bytes. Different Node/platform provenance
necessarily describes those differences; deterministic play/hash is separate
from such required machine metadata. The supported zoo proof uses Node22 on
Ubuntu24.04 with one CPU affinity. Bounded cohort and speed receipts, all legal
birth pairs, exact pin, failures and practical limits are reported on #213;
they do not create an ongoing Mandos cohort program or publish zoo statistics.
