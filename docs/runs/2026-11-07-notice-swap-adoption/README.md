# Accepted backup-notice adoption

[Mandos204](https://github.com/diegoami/mandos/issues/204), canonical
[port46](https://github.com/diegoami/neo-angband-borg-mod-tracker/issues/46),
[workspace31](https://github.com/diegoami/angband-workspace/issues/31).
Neo480 is resolved by accepted [mod PR76](https://github.com/neostryder/neo-angband-mod-borg/pull/76),
official235a6f9b28beb82a8bb4b30dc8d3a6c807108170. The qualified source candidate
is2860eef58b992d1f46bad4359f62ffa82916e996, with normal merge07af34e6 incorporating
235 and the earlier accepted72 history. This consumer receipt does not replace
its required source/main gates or claim Mandos main adoption before delivery.
Exact identities and hashes are in [pins.json](pins.json).

## Accepted scope and failure control

The four runtime added/removed-line sets exactly match the reviewed producer:
config adds optional noticeSwap; state seeds a fresh scratch derived block with
the live backup/options; notice defaults TRUE and preserves the previous snapshot
when FALSE; BOTH generic hypothetical power/danger inherit that snapshot and
force FALSE. No ring-only redesign or new strategy is substituted. Normal full
notice/HOME recomputation and borgNoticeWithout remain as upstream accepted.
The option is a per-call control, not a new user setting.

The three upstream unit tests are byte-identical, SHA256
b141f081b9b83467d8cba4d4331c831b899729278bb6b9a5d5fc7304ef779143.
They use a synthetic known test sword: this is a unit contract, not registered
item evidence, an observed bad decision or a survival claim. At frozen test-only
commit463e8dc1d17d0ab9c1120ab8df998588368e008f, unchanged runtime loses backup1199
for sentinel-1 and returns power delta0 instead of1200: [2fail/1pass](notice-swap-before.log),
[exit1](notice-swap-before.exit). After exact accepted runtime commit
75fb80ac03d91e65e3c51ec43d1eebd159e452ef, the [same3 pass](notice-swap-after.log).
Live-state immutability is the passing before/after negative control. No existing
assertion, seed, decision/game cap, timeout or safety guard was changed.

## Bounded qualification

Default published Core/SDK/content beta.3 is unchanged. On local Node26.13.0,
[350tests/24files/zero skips](accepted76-focused.log) cover trait/simulation,
registered public KnownItem weapon/HOME and capacity, store/ring fallback,
C9, own198 fuel, stop/basic loop records and architecture. A second
[79tests/5files/zero](accepted76-package-records.log) checks the actual root
plugin29, install/archive integrity and manifest grants/tunables. Two originally
requested metadata test paths and one plugin path used a nonexistent src/ prefix;
these counts describe actual execution, not requested filenames. The actual root
metadata tests separately pass [5tests/2files](root-metadata.log). No hidden excludes are added.

Types, session, grants, build and current checks pass (adjacent logs). The rebuilt
own plugin is742.3KiB, SHA256
80394b56e1c243ddcc9f906759153d1ed24418a2e664436e44619736a3cc439c.
[Seven CI event controls](ci-controls.log) pass. Required hosted default Node22
full verification remains mandatory; this local focus is not a duplicate full.

The existing official06a release-stamped Edge218 tuple is checked in a fresh
throwaway profile, using the previously qualified archive SHA256s and root-YAML
exactSDK override. [ActualNode22.23.4](edge218-node-version.log), all three package
versions/Core.ENGINE_VERSION, and [one direct/transitive SDK](edge218-edge-source-graph.json)
are verified; local-core aliases are off. [Affected focus131/8/zero](edge218-focused.log),
[types](edge218-typecheck.log) and [same current plugin](edge218-currency.log) pass.
This is targeted compatibility, not a second full or interactive-host/save claim.
No package, lock, workspace, manifest or profile-helper change reaches the product.

## Independent corrections and remaining gate

All nine C patch bytes, source41 base/fixture units and own198 patch bytes remain
unchanged. [All14 independent reverse checks](independent-units.log) include the
new accepted76 provenance unit. Accepted94's config hunk needs only surrounding
context refreshed for the newly accepted option; its correction lines are
unchanged, with old/new hashes retained in pins.json and immutable history.
Existing C9 tests, own fuel/stop tests, engine pins, stage defaults and historical
evidence are preserved. The source-port session anchor advances only to235;
C and engine anchors stay unchanged.

After verified actual main,204 may close fixed because upstream accepted76 is
already incorporated, without a release wait or speculative old-scope hold.
A new concrete recurrence is a new linked case. Source2/consumer125's missing
armour/HOME and tactical leaves remain separate work and still block NEW C
milestone adoption203. This task adopts no C milestone or research work.
No engine patch, Worker/host rewrite, GUI/lab/save/profile/data access, native C
or Rust work was performed. The historical Edge desktop/save evidence remains
separate and has not been rerun for this new bundle.

Publication copies trim terminal blank lines to satisfy git's whitespace check;
raw outputs remain in the owned artifacts/profile directories. No assertion or
failure/result text is removed.
