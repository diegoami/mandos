# Known armour curse-classification follow-up

[Source51](https://github.com/diegoami/neo-angband-borg-mod-tracker/issues/51),
[Mandos125](https://github.com/diegoami/mandos/issues/125), workspace31.
This is a concrete new follow-up to source48's armour data/value/HOME carry,
found during source50 review. It is not a reason to relabel the earlier verified
scope as never delivered. Tactical/SR50 is paused behind this correction.
Source owns the Neo485/mod78 proposal extension and actual upstream status;
this receipt claims no upstream acceptance or source/main consumer delivery.

Reviewed immutable source d9beead34594e52ab5a00b064f0aac395471945b changes only
armour-swap.ts: import existing isCursed, use it for the unknown/unremovable hard
gate and the5000 removable penalty. Native armour gates on the full known cursed
classification, including negative flags; weapon logic is deliberately asymmetric
and unchanged. The public analyzer already correctly marks Razorback's AGGRAVATE
as cursed even with an empty named-curse list. No new API/grant or hidden state
is needed. [Exact pins and retained-unit hashes](pins.json).

## Same six legal cases before and after

The unchanged source test constructs actual registered Razorback through the
existing registered-object helper and public KnownItem/itemAnalyzer path; it
asserts identity, AGGRAVATE, empty named curses and analyzer classification before
behavior. Consumer test-only1f7a528 on verified main6e03 gives
[3fail/3controls](curse-before.log), [exit1](curse-before.exit): unknown/false
removability wrongly select handle2, and a labelled explicit scorer-knowledge
model returns27159 instead of22159, missing the5000 penalty. That model is NOT
a claim that AGGRAVATE is removable in an actual game. Clean Dal-i-thalion,
named-curse rejection and the analyzer identity/classification controls pass.

After exact one-file source delta at consumer701b8bc, the same six cases pass
within [318tests/20files/zero skips](curse-focused.log),3.98s. The focus also
covers earlier armour/HOME/capacity, weapon/Deathwreaker, accepted76, trait/session,
C9, architecture and plugin29. No old assertion/seed/cap/timeout changes. This
proves eligibility/scoring behavior, not a naturally occurring life or survival gain.

## Gates, defaults and ordered removal

Local Node26.13.0 types/session/grants, [build](build.log),
[current748.7KiB](currency.log), and [CIcontrols7](ci-controls.log) pass.
CI=1 collection is1378tests/84files (six new cases); no duplicate local full,
optional advanced replay, GUI or new profile run. Required hosted default Node22
full remains pending for the final candidate. Own plugin SHA256:
`e8bf343bf67509d5cf4eb0ae1854c47ece13537b03d8ed04c6d2bd95988ac9f3`.

Default published beta.3 Core/SDK/content, package/lock/workspace/manifest,
session anchors, exact Edge helper, own198, C9/source41, weapon/Deathwreaker and
all earlier test/patch files remain byte-unchanged. The new two-path source51
unit reverses in a disposable image to [exact verified6e03 bytes](reverse-image.json),
with the new test absent. Then source48's original reverse text check applies.
Preserve the order51→48→accepted76; earlier proofs remain immutable snapshots,
not permission to reverse a prerequisite under dependent code. Text application
alone is not retirement approval, and runtime removal requires normal plugin
rebuild/current and relevant actual replacement controls.

125 remains partial for tactical/SR work;203's new-C gate stays blocked. Parent
owns required source/consumer gates, merge, actual-main state and pins. No C
milestone/strategy/weapon change, engine patch, native/Rust, owner lab/profile/
save/data or advanced replay work occurs. Publication log copies trim terminal
blank lines only; raw outputs remain under artifacts. No failure text is removed.
