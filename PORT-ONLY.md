# Neo Borg port-only build in the Mandos repository

This branch contains the faithful upstream Borg plus explicitly listed port
repairs. It is not the full Mandos consumer. The mod retains upstream's `borg`
identity, author and licence; the fork version is `1.4.0-beta.4-port.1`.
Hosting it in diegoami/mandos does not establish stock desktop authorization or
upstream catalogue/hash acceptance. No npm publication or lab deployment occurs.

Ancestry starts at exact upstream tag `v1.4.0-beta.4` (annotated tag object
9775b2a7ae574499387e515930fb37577e55d5a3, commit
48ee6e1c4640ca66bdcb946952539690f558a5d9). The six later official commits through
a10655c3b8113848092a7d66405ca3ec5e2222f9 add light-base correction and its fixtures,
armour value/HOME acquisition, known-negative-flag classification and changelog.
The only additional runtime changes are the tactical/SR fidelity delta from
cf5e8b4b5f93df8d92f0811360baed28cbbc7fe9 to
695630855d0378a369d9791da897f9422a7cc7fe (upstream PR79, source50).

This lane is constructed from official ancestry, never by subtracting patches
from Mandos main. It contains none of Mandos's nine translated C corrections,
Mandos-only controller/class/records/death/replay workflows, own198 fuel bridge,
or native better-borg-c milestone code. Inherited upstream behavior, including
original C quirks, remains. Tactical source50 preserves the native comparator,
acid-from-electricity and snapshot quirks; it is not a C correction.

The exact upstream tag remains byte-identical and points at the original commit;
it does not include any post-release official commit. The `-port.1` suffix names
this separately verified projection. Main remains the full Mandos consumer with
its nine existing C units preserved. Neither tag is a promise of a newer engine:
Core/SDK/content remain published 1.23.0-beta.3.

Automatic inherited release and Nexus workflows are disabled at repository
level before tags are mirrored. Do not enable them to publish this branch.
Release publishing is a separate explicit operation after target, provenance,
plugin digest and full checks are reviewed. See Mandos main docs/VERSION-LANES.md.

The resulting src/, test/, plugin.ts and plugin.js projection is byte-identical
to clean producer cc64c1ccc62f7197f5bef24a4a6d23cc96155e5f. Only version
metadata, its regression and these notes differ. Published SDK beta.3 rejects
SemVer +build metadata; -port.1 uses its supported prerelease syntax. The failed
initial +port.1 attempt remains in normal commit9323455/CI42488230165; no tag
was created for that rejected version.
