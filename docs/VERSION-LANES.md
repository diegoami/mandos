# Version lanes and exact upstream identity

Owner task [211](https://github.com/diegoami/mandos/issues/211), coordinated by
[workspace35](https://github.com/diegoami/angband-workspace/issues/35), separates
three distinct trees in this repository. No existing tag is moved or deleted.

| Ref | Contents and identity |
| --- | --- |
| `v1.4.0-beta.4` | Exact upstream annotated tag object9775b2a7ae574499387e515930fb37577e55d5a3, peeling to48ee6e1c4640ca66bdcb946952539690f558a5d9. Unmodified upstream Borg identity/artifact/version. |
| `v1.4.0-beta.4-port.1` | Separately verified faithful Borg port build, version1.4.0-beta.4-port.1, with accepted post-release and explicit pending port corrections. |
| `main` | Full Mandos consumer, identitymandos/version0.1.0, including the nine existing independently translated C corrections and Mandos's own controls/basic records. |

The Borg version and the Neo engine version are different. All these builds
continue to use published Core/SDK/content1.23.0-beta.3; neither newer engine
source nor an engine release is required by this port reconciliation.

## Port-only construction

Start from the exact official release, then its six accepted post-tag commits
through a10655c3b8113848092a7d66405ca3ec5e2222f9: light baseac9170d, fixture
corrections49285d5/56ed0b8, armour/HOMEe2950a5, known-curse13fb0e2 and changelog.
Add only source50's pending tactical/SR fidelity delta fromcf5e8b4b to6956308,
separately represented by clean producercc64c1ccc62f7197f5bef24a4a6d23cc96155e5f.
This restores C parity, including documented inherited comparator/snapshot quirks;
it does not incorporate a correction to original C behavior.

The runtime/source/test projection must match that clean producer exactly.
Allowed additional files/changes are version package/manifest metadata, the
version-sync regression's exact expected version, changelog and lane
provenance. Rebuild plugin.js with the pinned published SDK and compare its
hash/source projection. Run the clean lane's full normal gate with zero skips.
Record exact target, digest, dependency identity and actual results on211 before
creating the tag. A stored patch or a main test count is not clean-lane proof.

Never construct this lane by copying whole Mandos files or subtracting nine
patches from main: unrelated C or Mandos hunks could remain. Its ancestry and
allowlisted delta demonstrate absence of our own C translations. This is not a
claim that upstream never contains inherited C behavior or independently fixes
one of the same problems. Preserve upstream authorship, licence and Borg
identity; hosting a fork does not establish desktop/controller/hash approval.

## Main reconciliation and preservation

Mandos history and upstream history are unrelated. Do not fabricate an ours
merge or reset main. Compare accepted runtime/tests and update exact source
baseline/provenance through normal commits. Current light/armour corrections
were already carried and verified; retain the independent tactical carry pending
actual acceptance. Full Mandos C9 runtime/patch bytes and basic records remain.
The source tracker closes its original scope after accepted import/normal checks;
consumer issues retain their actual downstream resolution, separately from tags.
Stored accepted patch units remain historical/removal provenance, not evidence
of an ongoing upstream defect. Do not silently delete prior evidence.

## Publication containment

Both inherited GitHub-release and Nexus workflows are disabled at repository
level before any tag mirror. Exact upstream tags retain historical YAML that
would otherwise publish a release on anyv* push; changing only main's YAML
cannot make an immutable historical tag safe. Keep the workflows disabled.
Main additionally replaces automatic tag publication with a manual-only GitHub
release workflow, constrained to this repository/main, explicit existing tag,
explicit reviewed title/notes and prerelease status. No npm publication occurs.

Tag creation is separate from release publication. An exact upstream tag does
not declare that it is the latest Mandos/main, and -port.1 is not a full Mandos
build. Never automatically deploy either into the existing lab or change saves,
profiles or private data. Any future release operation needs its own explicit
scope and a fresh workflow-state/target/digest check. Preserve all prior branches
and evidence; tags are immutable once published.

The supported fork suffix is `-port.N`: published SDK beta.3 rejects SemVer
`+build` metadata. The failed initial attempt and its logs are preserved in the
[version reconciliation receipt](runs/2026-11-08-version-lanes/README.md).
The fork manifest repository and package homepage identify diegoami/mandos;
upstream Borg identity and original authorship remain intact. Final candidate
source/artifact identities are in [the projection](runs/2026-11-08-version-lanes/projection.json).
