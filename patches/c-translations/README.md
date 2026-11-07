# Mandos translations from reviewed native milestones

[Landing/adoption203](https://github.com/diegoami/mandos/issues/203) and
[the C milestone contract](../../docs/C-MILESTONE-ADOPTION.md) own the current
queue. Primary C producers are reviewed immutable better-borg-c milestones;
canonical original-C defects stay in neo-angband-tracker as secondary provenance.
Native better-borg-c owns per-bug upstream follow-up. This table is a per-unit
provenance/removal index, **not** a live carry/status table or a34-fix adoption
claim. The old Mandos issue links are historical tracking-superseded receipts.

These are independent TypeScript source deltas, not C patches or pnpm engine
patch inputs. Each existing row retains its original translation and an
independent TS regression at verified main878. Links to native units identify
reviewed overlap; native code/review alone never proves a TS application.
M2 uses runtime2675d198e4c3fcb1c69ee63ef25a2b6ac27ab96f/first7;
M3 uses runtime702f091f6ac06cae1014df2f85ac218be0189813/cumulative34 with
corrected metadata8a8d66fea70d853102104d9013bc177a80099e43. See the contract
for exact reviews/findings follow-up, the port gate and later-unreviewed exclusions.

| Reviewed native producer unit | Independent TS translation/proof and historical receipt | TS removal unit | Original C provenance (secondary) |
| --- | --- | --- | --- |
| [M2 / 0004](https://github.com/diegoami/better-borg-c/blob/2675d198e4c3fcb1c69ee63ef25a2b6ac27ab96f/patches/0004-cold-melee-protection.patch#L1), [native17](https://github.com/diegoami/better-borg-c/issues/17) | [14a54fccbd3e287073a1b59d5cadd64d1d202512](https://github.com/diegoami/mandos/commit/14a54fccbd3e287073a1b59d5cadd64d1d202512), cold temporary-protection field; [TS regression](https://github.com/diegoami/mandos/blob/87836f0841daf701258fd01c259cc8a6f30ff07e/src/danger/cold-melee-carry.test.ts#L1); [legacy164](https://github.com/diegoami/mandos/issues/164) | [CBUG-0004-cold-melee.patch](CBUG-0004-cold-melee.patch) | [diegoami/neo-angband-tracker#26](https://github.com/diegoami/neo-angband-tracker/issues/26), [C proposal267](https://github.com/diegoami/neo-angband-tracker/pull/267), d504eb3d272ce96c0de2c00eba757a251b551334 |
| [M2 / 0007](https://github.com/diegoami/better-borg-c/blob/2675d198e4c3fcb1c69ee63ef25a2b6ac27ab96f/patches/0007-exact-unseen-name.patch#L1), [native36](https://github.com/diegoami/better-borg-c/issues/36) | [81600f90ab4e780a05333eb4aa4a988ed431c518](https://github.com/diegoami/mandos/commit/81600f90ab4e780a05333eb4aa4a988ed431c518), complete unseen-attacker pronoun; [TS regression](https://github.com/diegoami/mandos/blob/87836f0841daf701258fd01c259cc8a6f30ff07e/src/perceive-unseen-name.test.ts#L1); [legacy165](https://github.com/diegoami/mandos/issues/165) | [CBUG-0086-exact-unseen-name.patch](CBUG-0086-exact-unseen-name.patch) | [diegoami/neo-angband-tracker#102](https://github.com/diegoami/neo-angband-tracker/issues/102), [C proposal273](https://github.com/diegoami/neo-angband-tracker/pull/273), cad765806eed6431642ab02b53240d7938470c21 |
| Grandfathered verified TS unit; [native157 adopted after M3](https://github.com/diegoami/better-borg-c/issues/157), outside reviewed34 target | [b5f4e79f7193e05a2bceeea4587f7c28f85e417a](https://github.com/diegoami/mandos/commit/b5f4e79f7193e05a2bceeea4587f7c28f85e417a), recognized dungeon Enlightenment call; [TS regression](https://github.com/diegoami/mandos/blob/87836f0841daf701258fd01c259cc8a6f30ff07e/src/item/enlightenment-carry.test.ts#L1); [legacy171](https://github.com/diegoami/mandos/issues/171) | [CBUG-0065-enlightenment.patch](CBUG-0065-enlightenment.patch) | [diegoami/neo-angband-tracker#81](https://github.com/diegoami/neo-angband-tracker/issues/81), [C proposal275](https://github.com/diegoami/neo-angband-tracker/pull/275), 526906c0f367cd690bdd92b99ac1e114fd84b1a2 |
| [M3 / 0008](https://github.com/diegoami/better-borg-c/blob/8a8d66fea70d853102104d9013bc177a80099e43/patches/0008-caster-shot-origin.patch#L1), [native40](https://github.com/diegoami/better-borg-c/issues/40) | [e8c125b1038e20df3ea3218b5c838e93adef71e6](https://github.com/diegoami/mandos/commit/e8c125b1038e20df3ea3218b5c838e93adef71e6), caster-origin occupancy guard; [TS regression](https://github.com/diegoami/mandos/blob/87836f0841daf701258fd01c259cc8a6f30ff07e/src/danger/shot-origin-carry.test.ts#L1); [legacy172](https://github.com/diegoami/mandos/issues/172) | [shot-path-279-caster-origin.patch](shot-path-279-caster-origin.patch) | [diegoami/neo-angband-tracker#279](https://github.com/diegoami/neo-angband-tracker/issues/279), [C proposal281](https://github.com/diegoami/neo-angband-tracker/pull/281), 1bce07d8080b520589c292c793cc0b95ef9df182 |
| [M2 / 0006](https://github.com/diegoami/better-borg-c/blob/2675d198e4c3fcb1c69ee63ef25a2b6ac27ab96f/patches/0006-healing-potion-timing.patch#L1), [native31](https://github.com/diegoami/better-borg-c/issues/31) (existing TS CCW leaf; not a whole native timing-family adoption claim) | [a3a72f088d1d17f08758389da6384433b4e95e4f](https://github.com/diegoami/mandos/commit/a3a72f088d1d17f08758389da6384433b4e95e4f), explicit prior-request existence and elapsed 1..4 conservation boundary; [TS regression](https://github.com/diegoami/mandos/blob/87836f0841daf701258fd01c259cc8a6f30ff07e/src/item/ccw-timing.test.ts#L1); [legacy168](https://github.com/diegoami/mandos/issues/168) | [CBUG-0061-ccw-timing.patch](CBUG-0061-ccw-timing.patch) | [diegoami/neo-angband-tracker#77](https://github.com/diegoami/neo-angband-tracker/issues/77), [C proposal271](https://github.com/diegoami/neo-angband-tracker/pull/271), cedf25eb790f2ff7c7c161cd1612b18ed99fb35e |
| [M3 / 0013](https://github.com/diegoami/better-borg-c/blob/8a8d66fea70d853102104d9013bc177a80099e43/patches/0013-dispel-life-filter.patch#L1), [native57](https://github.com/diegoami/better-borg-c/issues/57) | [4eb72dca1707af4d18cecb198bbd3ea7e4466801](https://github.com/diegoami/mandos/commit/4eb72dca1707af4d18cecb198bbd3ea7e4466801), Dispel Life living-target filter; [TS regression](https://github.com/diegoami/mandos/blob/87836f0841daf701258fd01c259cc8a6f30ff07e/src/fight/c-spell-carry.test.ts#L1); [legacy175](https://github.com/diegoami/mandos/issues/175) | [source248-dispel-living.patch](source248-dispel-living.patch) | [diegoami/neo-angband-tracker#248](https://github.com/diegoami/neo-angband-tracker/issues/248), [C proposal291](https://github.com/diegoami/neo-angband-tracker/pull/291), 6912b85cb7b902616ad786dfc20afe3b4cf28b10 |
| [M3 / 0016](https://github.com/diegoami/better-borg-c/blob/8a8d66fea70d853102104d9013bc177a80099e43/patches/0016-vampire-strike-distance.patch#L1), [native66](https://github.com/diegoami/better-borg-c/issues/66) | [fca27df4de0d2036c3c0ab8111c0ac273ae589ad](https://github.com/diegoami/mandos/commit/fca27df4de0d2036c3c0ab8111c0ac273ae589ad), chosen Vampire Strike distance; [TS regression](https://github.com/diegoami/mandos/blob/87836f0841daf701258fd01c259cc8a6f30ff07e/src/fight/c-spell-carry.test.ts#L1); [legacy176](https://github.com/diegoami/mandos/issues/176) | [source257-vampire-selected-distance.patch](source257-vampire-selected-distance.patch) | [diegoami/neo-angband-tracker#257](https://github.com/diegoami/neo-angband-tracker/issues/257), [C proposal293](https://github.com/diegoami/neo-angband-tracker/pull/293), 0119d5daee9b8a07a8096331eea78dbbb6c26050 |
| [M3 / 0017](https://github.com/diegoami/better-borg-c/blob/8a8d66fea70d853102104d9013bc177a80099e43/patches/0017-slay-trait-accumulation.patch#L1), [native69](https://github.com/diegoami/better-borg-c/issues/69) | [1d4c1a7a49626a5df057f0806c3f378a3ad1b71f](https://github.com/diegoami/mandos/commit/1d4c1a7a49626a5df057f0806c3f378a3ad1b71f), strongest known numeric slays and greater-kill flags; [TS regression](https://github.com/diegoami/mandos/blob/87836f0841daf701258fd01c259cc8a6f30ff07e/src/trait/c-equipment-corrections.test.ts#L1); [legacy185](https://github.com/diegoami/mandos/issues/185) | [source239-equipment-slays.patch](source239-equipment-slays.patch) | [diegoami/neo-angband-tracker#239](https://github.com/diegoami/neo-angband-tracker/issues/239), [C proposal304](https://github.com/diegoami/neo-angband-tracker/pull/304), 9ab78ae605ca4463268a669121d69b216285c2f1 |
| [M3 / 0029](https://github.com/diegoami/better-borg-c/blob/8a8d66fea70d853102104d9013bc177a80099e43/patches/0029-light-modifier-once.patch#L1), [native105](https://github.com/diegoami/better-borg-c/issues/105) | [75ad79bf7c57145d1588264ec7ef7eba1ab9b409](https://github.com/diegoami/mandos/commit/75ad79bf7c57145d1588264ec7ef7eba1ab9b409), count each known light modifier once after the separate port41 prerequisite; [TS regression](https://github.com/diegoami/mandos/blob/87836f0841daf701258fd01c259cc8a6f30ff07e/src/trait/light-base.test.ts#L1); [legacy186](https://github.com/diegoami/mandos/issues/186) | [source238-light-modifier.patch](source238-light-modifier.patch) | [diegoami/neo-angband-tracker#238](https://github.com/diegoami/neo-angband-tracker/issues/238), [C proposal349](https://github.com/diegoami/neo-angband-tracker/pull/349), 66b183340a567811051a5745c8d3a53792963860 |

Eight existing units overlap reviewed native patches. Enlightenment's already
proved TS correction is retained. Native157 has now adopted it after reviewed
M3; that is not M3 review inclusion, a new patch-number claim here or new Mandos
code. Reconcile the later producer in a future reviewed milestone without
rolling back code or blocking other applicable coverage. Full M3 applicability reconciliation still belongs
to203 after the port gate, including fixes already equivalent through port work,
C-only non-counterparts and genuine named dependencies. Do not reapply equivalents.

## Adoption and retirement are separate

One selected reviewed milestone has one Mandos adoption issue. Close ADOPTED
once all applicable coverage is verified; this is not source fixed and does not
wait for native per-bug upstream closure. The21 old mirrors are retired tracking,
not rejected fixes or a declaration that pending translations are implemented.
Source/engine/port and Mandos-owned bug routes retain their existing contracts.

Keep every TS unit independent. Native patch removal or C upstream acceptance
alone does not prove the faithful Neo/TS baseline supplies that correction.
Inspect the actual TS replacement/caller and verify the corresponding legal
regression/negative controls, plugin and relevant gate before retiring a local
unit. Local unit maintenance can outlive the adopted/closed milestone record.
Never silently remove an unrelated hunk or infer a replacement from a filename.

Historical code comments, prior per-fix issue proofs and archived docs/runs keep
their original source IDs and labels. They are provenance, not competing current
queues. Discovery attribution remains source-specific in the native/source
records; this migration neither adopts native memory/strategy/recording/death
infrastructure nor authorizes Rust polling. Package backports remain separately
indexed in [the parent ledger](../README.md), and [old C copies](../upstream-c/)
stay frozen for old links.

The cold topic's original patch path is unchanged. The unseen-name topic's old
patch directory was renamed100% in3499555 without rewriting source81600 or its
published history. Named original evidence/fixture hashes remain historical;
this tracking-only migration changes no code, .patch file, test or prior receipt.
