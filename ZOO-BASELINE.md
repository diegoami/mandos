# Zoo-ready upstream and port-only measurement lanes

Owner [task #215](https://github.com/diegoami/mandos/issues/215) adds two
harness-bearing snapshots. These are not full Mandos main and neither carries
our translations of original-C/better-borg-c corrections. Existing tags are
immutable and remain available.

| New tag | Frozen Borg policy source |
| --- | --- |
| `v1.4.0-beta.4-upstream.a10655c3-zoo.1` | Exact current official Neo Borg `a10655c3b8113848092a7d66405ca3ec5e2222f9` |
| `v1.4.0-beta.4-port.2` | That source plus our faithful port repairs, clean producer `cc64c1ccc62f7197f5bef24a4a6d23cc96155e5f` |

Each snapshot requires its own full gate, independent review and parent
confirmation of exact tag targets/digests before publication. The exact original release
`v1.4.0-beta.4` points at an older upstream commit, `48ee6e1c`; it remains an
unchanged release mirror. `v1.4.0-beta.4-port.1` remains the earlier port-only
build without this harness. Main keeps all nine C corrections.

## Build and run

In either new snapshot checkout:

```sh
pnpm install --frozen-lockfile
node tools/zoo-build.mjs --out artifacts/zoo
node tools/zoo-run.mjs --bundle artifacts/zoo \
  --seed 7 --race Human --class Warrior --turns 20000 \
  --out /tmp/run.json --states /tmp/states.jsonl --commands /tmp/commands.jsonl
```

Build into a fresh directory once, then reuse it across separate processes.
All output paths are explicit/fresh and cannot resolve into docs/runs. Published
Core/SDK/content beta.3 is required; no local engine/lab, desktop, Worker or
accepted-seed engine patch is used. All ordinary births and nine controller
settings follow the [one-run interface](https://github.com/diegoami/mandos/blob/cca1293cb5ab02681b1c200dca2d0cb014c90381/docs/ZOO-HARNESS.md).

## The measured controller profile

Both snapshots use the SAME tools-only host adapter and target their actual
`plugin.ts` definition's start/controller/stop lifecycle. The original target
Borg source, tests, title and plugin artifact remain byte-identical to the
producer. In particular, the adapter does not instantiate a second hand-written
Borg, hash the world seed into its private stream, add Mandos stall policy or
copy Mandos valuation/strategy code. The target definition itself supplies its
constructor flags, default private RNG, buff safety flag, API2 bridge, loadout
settle/rewind and release/forget behavior.

The profile is explicitly `api2-plugin`, and its hash encoding is
`api2-intents-v1`: canonical UTF-8/LF events for every submitted target/command,
acceptance/refusal and prompt answer. Command arguments are retained. Input
administrative tokens are not part of the play hash. Returned counters distinguish
controller callbacks, issued command intents, accepted commands and Core loop
calls. Release reasons come from the target; only its actual idle/refusal/repeat
releases map to stalled. Unknown engine stops or missing host services are
harness failures, not deaths or invented stalls.

Full Mandos main's existing #213 runner remains the legacy play-session profile.
Do not compare its hash with api2-intents-v1 or attribute every main-versus-clean
trace difference to C fixes alone. The two new clean snapshots are comparable
with each other because their adapter/profile is identical; only the sealed
Borg policy delta and declared metadata differ.

## Published host semantics and limits

The adapter uses Core buildKnownWorld/knownLoadoutSimulation with the ordinary
content resolver, glyph, description and store-description dependencies. It
exposes only the target's declared capabilities and two allowlisted truth reads.
No actual map or unperceived-monster knowledge is passed to the Borg.

The input gate is an exact copy of published beta.3 source at engine commit
`97ceec2925e6715ba725624a61866ab93a196a12`,
[packages/web/src/intent-gate.ts](https://github.com/neostryder/neo-angband/blob/97ceec2925e6715ba725624a61866ab93a196a12/packages/web/src/intent-gate.ts).
SHA256: `9c523c6c762799dfeeab8df5e34a5ec66d15a1c129aaa1ae82a0f2a622d15523`.
Only its erased snapshot type companion is local. Actual KnownMonster IDs are
translated before submission; target setters refresh the token as the real host
does. The async target is awaited only AFTER a Core input boundary and cap check,
so a reached cap cannot launch another speculative Borg decision.

Only the current shop is observed, when entered through movement/hold. Shop
commands use the Core registered transaction handlers and exiting clears the
store phase. No native store modal is rendered. This is a headless Core profile,
not a claim of desktop UI/controller authorization or modal-flow equivalence.
Core preset command arguments are retained; an unfulfilled Core item-choice UI
request fails explicitly rather than selecting a new target or pretending the
Borg stalled. Synthetic prompt controls exercise actual target reply semantics;
there is no general browser prompt catalogue.

The pinned host's carry-wrapper visibility guard shape is preserved, not silently
repaired. Visibility-refusal controls use wieldAt refs, which actually enter that
guard, and require the specific unobserved-item response. This task is not an
engine bug fix or permission-policy rewrite.

## Constructive no-C proof and validation

Each lane's zoo-policy.json records the original producer blob/mode inventory for
all src/test files and root plugin.ts/plugin.js/title.ts. Build refuses changes,
extra files or altered manifest/package policy. Only declared version,
repository/homepage metadata differs. The compiled graph must resolve plugin.ts
SOURCE (never the bundled plugin.js with a second private config/Core binding),
and every non-tools project runtime import must be sealed. Full policy files are
fingerprinted along with the actual compiled inputs.

The schema remains mandos/zoo-run@1 and the shared build-once/provenance/settings
interfaces remain available. The new records explicitly include lane/source,
controller and command-stream profiles. The legacy main defaults/RunReport and
old records remain unchanged.

Independent review and own full gates are required for both lanes, plus bounded
actual CLI repeats, constructor flags/cross-mod defaults, target/known-world,
loadout/refusal/token, current-store, prompt/startup and no-speculative-tick
controls. These are interface checks, not a new strategy/cohort program. No
100k/400k research or statistical-strength claim is part of #215. Actual heads,
results, preserved failures and published tag readbacks belong to issue #215.
