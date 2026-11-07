# Edge.218 developer GUI qualification — functional control, save issue retained

This is consumer evidence for Mandos199, not a new engine patch or a stock
application certificate. Official source06a2321ce30a414df20d1b20d486446e7688171c
was exported fresh, stamped by upstream's exact `version.mjs edge 218` command,
and built with the documented NEO_ANGBAND_LAB_BUILD=1 Web/Desktop flags. Tracked
source contents match the non-Lab stamped source; only compilation defines differ
([source footprint](engine-source-footprint.json)). No Mandos entry was added to
the host's first-party table, and --lab-trust was never used.

Payload: unchanged latest94d/C9/198 plugin SHA256
05ec00ece395dd341088ffffc1ed62afe92b6e3269fe463faacd9114cb72b9db, source
a4f88c5d179d58d56f2177b67ab8f5e1c3793787. The derived own-ID `mandos` manifest
is exactly edge.218, runtime in-process, with the existing requested capabilities
plus input:controller and engine:access; SHA256e02869b2a8e89a29c8750f04c7f9697f13faa1f943a7fc15814933a3dcc2765f.
No input:observe or code instrumentation was added. The default product manifest
and published-beta.3 profile are separate and unchanged by this probe.

## What actually passed

The explicit existing Electron43.2 binary ran the newly built Lab desktop shell
under Xvfb with fresh NEO_ANGBAND_DATA and a real mods/mandos folder. No browser
profile or raw storage is included here. The prelaunch pure official data-dir
check made zero probes of other directories; all four Chromium paths and recovery
roots point inside the fresh portable base. The application child environment
removed inherited credential/token and old lab/dev overrides, without printing
values or changing HOME. See [audit](prelaunch-audit.json).

All activation was ordinary UI: enable the folder mod, review its unreviewed-code
warning, grant declared controller/Core/intents/answer/known-state permissions,
and choose its default features. This deliberately manual-character smoke left
optional title/birth/save-management permissions unselected; it does not certify
those features. Profiles/session management remains first-party restricted.

A Human Warrior was then created through native point buy with its normal
20-point defaults, named MandosLab218, and accepted normally. Ctrl-Z displayed
[the native controller warning](native-controller-consent.png), including the
unscorable/nondeterministic marking. The real Start playing button caused the
host's legitimate handoff and reload; no consent record, armed flag, noscore
field or Core state was injected.

After that reload, the documented read-only Lab input snapshot supplied:

| Observation | Driver | Game turn | Known grid/depth | HP |
| --- | --- | ---: | --- | ---: |
| First observed handoff baseline | controller, owner mandos | 0 | (41,4), town | 20 |
| No-input observation | controller, owner mandos | 30 | (125,41), depth1 | 13 |
| After Escape and settling | player | 30 then30 | (125,41), depth1 | 13 |

The [public samples](autoplay.json) show the actual descent and movement between
those states, with no human key during the measured interval. Escape returned
the keyboard and time remained stable at both follow-up checks. Total observation
was about1.55 seconds, below the30-second ceiling. **Game turns and public input
token revisions are not Borg decisions. No decision count, extra independent
life, survival improvement or completed game is claimed.** The character remained
alive. The initial requested URL seed3 was consumed before a normal mod-enabling
reload; the actual native character's retained seed was1471779398, as recorded.
This is not a claim of matching a headless seed3 trajectory.

A startup log saying the Borg "has the keyboard" describes bridge capabilities;
it is not used as activation evidence. Actual ownership plus game progress after
the native handoff is the evidence here.

## Limits and failed attempts remain visible

- The game emitted **Saving failed.** during this run. The cause is not yet
  attributed. This is a functional-controller pass, **not a save, management,
  restart or whole-host compatibility pass**. Native persistSave can reject the
  mod/save guard, encoding or storage; it does not directly check the mod's
  profiles/session grants. Further native save controls are separate work.
- Initial automation navigated to the documented labprocess URL before the
  desktop's first loadURL completed, producing ERR_ABORTED. That is a recorded
  harness navigation race, not silently counted as a clean startup. Unpackaged
  Electron CSP/GPU warnings are also retained. No source workaround was applied.
- An earlier Lab Web ZIP import used the native pointer/file chooser successfully,
  but the installed ZIP was coerced to Worker and refused Core. The actual
  developer exception applies only to real folder sources (mod-code.ts587–590).
  That [negative result](web-zip-refusal.json) and [screen](web-zip-worker-refusal.png)
  are preserved; it is not a generic picker failure or a new477 regression.
- Earlier keyboard-picker attempts produced no chooser event. The later real
  pointer route worked; those setup attempts are [retained](keyboard-picker-attempt.json).
- The downloaded official Linux edge archive was hash-verified only and **never
  launched**. This separately built, documented Lab developer configuration does
  not establish ordinary stock-release own-ID Mandos compatibility or Worker
  support for raw Core.

The UI snapshot sequence, selected screenshots and actual logs are included.
No private live-state/wizard call, observer mod, first-party identity spoof,
engine code patch, owner profile/save/data or unattended monitoring is involved.
