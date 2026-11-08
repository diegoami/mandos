# Upstream and port-only version reconciliation

Owner task211 / workspace35. [The constructive projection](projection.json)
records exact source/tag/artifact identities and all nine preserved C patch
hashes. Full Mandos src/test/plugin and C units are byte-identical to dcd1b9c;
this reconciliation advances accepted upstream provenance rather than pretending
to merge unrelated histories or discarding consumer fixes.

Official beta.4 ends at48ee6e1; accepted light/armour work at a10655c is six
commits later. Main already contains equivalent light/armour/known-curse repairs,
with the independent original-C light modifier retained. Source50 tactical/SR
remains locally carried, not accepted upstream. Consumer125 therefore stays
carried/OPEN. Source issue state is independently reconciled in the port tracker.

The no-C lane is a fresh official-source construction. Its entire src/, test/,
plugin.ts and plugin.js projection matches the clean faithful-port producer
cc64c1ccc62f7197f5bef24a4a6d23cc96155e5f byte for byte. Five explicit version/notes
paths differ; no Mandos runtime/experimental/death code or C translation enters.
Both original-C flaws and faithful quirks deliberately remain in that lane.

## Actual attempts and version compatibility

- Initial9323455 used SemVer+build metadata. Exact pushCI42488230165 failed
  before tests because published SDKbeta.3's manifest validator rejects `+`.
  The failed branch/commit/log remain; no tag was created for that version.
- Normal42bfba3 changed to supported `1.4.0-beta.4-port.1`. A targeted version
  test exposed the upstream changelog parser's narrower prerelease character
  class. The correction was committed before its test failure halted the shell;
  no success was claimed. Its hosted result remains separately recorded.
- Normala4bd8ef extends that parser to accept the same prerelease hyphen syntax
  as the SDK; original manifest/package/changelog equality assertions remain.
  Targeted3/3 version tests, grant validation and current691.0KiB build pass.
- Exact release-candidate full pushCI42488349397 and privacy42488349392 verify
  a4bd8eff5d618b5ef2e56a302bdd4f3eb5617294. Their actual outcome is recorded on211;
  this preparation receipt does not borrow a source or Mandos-main test count.

No local heavy gate waits behind the independent native C validation holder.
No lab, saves, profiles or deployment changed. Inherited GitHub-release and
Nexus workflows are repository-disabled before any tag. Main's new manual-only
release YAML is additional containment; historical exact tag YAML is immutable.
Tags/releases remain separate operations subject to exact target/hash checks.
