# Mandos quick reference

Mandos consumes validated Neo Borg bug fixes, keeps their provenance and
consumer regressions, and records basic run/death/stall facts. Existing control
and class/race choices remain. [Current scope](MANDOS-SCOPE.md) parks strategy
research, cohorts, stage/save-ladder work and advanced death/replay analysis.
For C work, [reviewed native milestones](C-MILESTONE-ADOPTION.md) and203 replace
per-source mirrors; the port-first gate applies before new implementation.
The optional compatibility settings below do not define Mandos's active purpose.
Start with the [repository README](../README.md) for the purpose, evidence
and desktop lab setup.

## Interactive host requirement

The unpatched beta.3 Core/harness profile passes its focused checks. Official
stock beta.3 desktop/web, however, does **not register the Mandos controller**
under its own ID: its first-party-only registration policy excludes Mandos.
No supported configuration route exists in the inspected release; `engine:access`
alone and Ctrl-Z do not bypass that restriction. See
[the source/audit boundary](MANDOS-SCOPE.md#interactive-host-boundary).

The following controls describe the retained **authorized first-party host/lab**,
not a stock-desktop install recipe. That host code remains unchanged, and this
upgrade does not deploy or refresh the existing lab.

## Controls in the authorized host

| Action | Where |
| --- | --- |
| Start a new lineage | **New Mandos character** on the title screen. |
| Hand over or take back an existing character | Ctrl-Z in play; the game asks for confirmation when handing over. |
| Choose classes and races | Enable the desired `Class:` and `Race:` toggles in the Mods screen. One of each pins a combination; all off in a pool means all on. |
| Optional retained stage thresholds | `borg.stageClvl` and `borg.stageDepth`; experimental retirement requires explicit opt-in, not default play. |
| Check a watched lab session | `node tools/lab.mjs check` reports births, deaths, kept saves and missing consent. |

Enabling the mod alone does not give it your character. A character handed
to an autoplayer gets the game's permanent `NOSCORE_BORG` mark.

## Settings

The [settings reference](../SETTINGS.md) gives defaults, reload behavior and
recipes. The Mods screen carries the full descriptions.

| Group | Identifiers | Defaults |
| --- | --- | --- |
| Class pool | `borg.classWarrior` through `borg.classBlackguard` | All nine classes on. |
| Race pool | `borg.raceHuman` through `borg.raceKobold` | All eleven races on. |
| Optional stage retirement | `mandos.stageRetirement` | Off; reload required. |
| Retained stage thresholds | `borg.stageClvl`, `borg.stageDepth` | 2 and 1; inactive unless retirement is explicitly enabled. |
| Risk | `borg.playsRisky` | Off. |
| Gear valuation | `borg.worshipsDamage`, `borg.worshipsSpeed`, `borg.worshipsHp`, `borg.worshipsMana`, `borg.worshipsAc`, `borg.worshipsGold` | All off. |
| Town saving and early stockpiles | `borg.selfScum`, `borg.munchkinStart` | Self-scum on, munchkin start off. |
| Replay handoff | `borg.replayReleaseTurn`, `borg.replayDeathTurn` | 0 (release mode off, death turn unnamed). |

### Toggle reference

The names and defaults below match the Mods screen. The overview above
explains the pools; each switch remains individually listed here.

| Setting | Identifier | Default | What it does |
| --- | --- | --- | --- |
| Play risky | `borg.playsRisky` | off | Skip the early hit-point and character-level gates that hold Mandos above a depth, wait longer before drinking a cure, and back away later in a losing fight. |
| Value melee and missile damage | `borg.worshipsDamage` | off | Add weight to weapon and bow damage when Mandos scores a set of gear, so a trade that costs armour for damage looks better than it otherwise would. |
| Value speed | `borg.worshipsSpeed` | off | Add weight to a speed bonus when scoring gear. |
| Value hit points | `borg.worshipsHp` | off | Add weight to constitution and hit points when scoring gear. |
| Value spell points | `borg.worshipsMana` | off | Add weight to spell points when scoring gear. |
| Value armour class | `borg.worshipsAc` | off | Add weight to armour class when scoring gear. |
| Value gold | `borg.worshipsGold` | off | Sell harder, walk down rather than pay for a recall, and put off the first deep recall. |
| Save up for something it wants | `borg.selfScum` | on | Let Mandos set itself a gold target and work in town until it can afford one item it has decided it needs. |
| Skimp on stockpiles for an early munchkin run | `borg.munchkinStart` | off | Below character level borg_munchkin_level (12), value stockpiles of resist poison and speed potions, phase door, word of recall and the deeper cures less than it normally would, on the assumption that a young character is cashing out early. |
| Class: Warrior | `borg.classWarrior` | on | Allow this class in the next-birth draw pool. |
| Class: Mage | `borg.classMage` | on | Allow this class in the next-birth draw pool. |
| Class: Druid | `borg.classDruid` | on | Allow this class in the next-birth draw pool. |
| Class: Priest | `borg.classPriest` | on | Allow this class in the next-birth draw pool. |
| Class: Necromancer | `borg.classNecromancer` | on | Allow this class in the next-birth draw pool. |
| Class: Paladin | `borg.classPaladin` | on | Allow this class in the next-birth draw pool. |
| Class: Rogue | `borg.classRogue` | on | Allow this class in the next-birth draw pool. |
| Class: Ranger | `borg.classRanger` | on | Allow this class in the next-birth draw pool. |
| Class: Blackguard | `borg.classBlackguard` | on | Allow this class in the next-birth draw pool. |
| Race: Human | `borg.raceHuman` | on | Allow this race in the next-birth draw pool. |
| Race: Half-Elf | `borg.raceHalfElf` | on | Allow this race in the next-birth draw pool. |
| Race: Elf | `borg.raceElf` | on | Allow this race in the next-birth draw pool. |
| Race: Hobbit | `borg.raceHobbit` | on | Allow this race in the next-birth draw pool. |
| Race: Gnome | `borg.raceGnome` | on | Allow this race in the next-birth draw pool. |
| Race: Dwarf | `borg.raceDwarf` | on | Allow this race in the next-birth draw pool. |
| Race: Half-Orc | `borg.raceHalfOrc` | on | Allow this race in the next-birth draw pool. |
| Race: Half-Troll | `borg.raceHalfTroll` | on | Allow this race in the next-birth draw pool. |
| Race: Dunadan | `borg.raceDunadan` | on | Allow this race in the next-birth draw pool. |
| Race: High-Elf | `borg.raceHighElf` | on | Allow this race in the next-birth draw pool. |
| Race: Kobold | `borg.raceKobold` | on | Allow this race in the next-birth draw pool. |
| Enable optional benchmark retirement | `mandos.stageRetirement` | off | Explicitly opt in to legacy save/retire at the stage thresholds; off keeps normal play going. |

Stage retirement is an explicit optional opt-in; it is not the default grind
or active research queue. Advanced replay tests use `pnpm test:optional-replay`
with their matching profile, not the ordinary upgrade gate.

Birth pools and stage settings are fixed for a life and apply on the next
birth. Behavior-toggle changes need a reload. A Warrior uses its measured
point-buy plan; other classes use the game's suggested stats. Casters can
study and test spells, and eligible attack spells enter the combat chooser.

## Engine and permissions

The selected package default is unpatched published beta.3 Core/SDK/content;
[runtime180](https://github.com/diegoami/mandos/issues/180) records the focused
proof and final adoption checks. No engine patch is required by the tested
Mandos harness paths, and PR433 is not a default requirement. A generally valid
upstream bug is not declared fixed because a carry is unnecessary here.
The mod folder is named `mandos`, matching its manifest ID. This identity is
currently blocked by the official stock desktop/web controller policy described
above; package compatibility does not make those hosts supported. The authorized
host/lab profile remains separate and has not been deployed by this change.

The [manifest](../manifest.json) is the authority for the requested grants.
Use **Choose one by one** in the consent screen: the powerful
`state:monsters-actual.read` grant is off unless explicitly enabled. It
provides exact data about perceived monsters and their races; Mandos does
not ask for the real map. `session:control` is needed to keep successful
stage saves. The remaining grants cover known state, commands and prompts,
journal events, title/birth UI, profiles and saves.

`node tools/lab.mjs start` updates the lab's mod clone and rebuilds a changed
engine. A merge alone does not update the running desktop. Verify the
permissions and actual commits with the lab tools before comparing a watched
session with a harness record.

## Records and limits

Targeted legal/fixed-seed regression scenarios and basic run/death/stall
records support bug fixes. Reach-rate cohorts and c2d1 grids below are historical
experiments, not mandatory upgrade gates or current strategy-improvement work.
Committed records retain their original build/profile and are not rewritten.

Advanced replay is PARKED optional tooling. It needs the original executable,
content/configuration and accepted start inputs; the default engine does not
promise PR433 birth/seed capture. Missing provenance stays unavailable. A seed
or endpoint/census match alone is not full trajectory identity. Historical
harness replay tools compare recorded endpoint facts and label divergences.
The [#54 desktop death case](runs/2026-11-04-b54-desktop-death-replay/README.md)
reproduces all 113 commands and observed death facts with matching code,
engine/content and accepted-birth RNG/options/controller context. This
proves that case; a seed alone does not prove another run's exactness. The graveyard stores run
facts and journal data; it does not preserve a full fatal-state save.

## Bug fixes and integration

Mandos adopts verified source fixes from the two owner forks. Port defects
live in [our mod fork](https://github.com/diegoami/neo-angband-borg-mod-tracker/issues);
C/game/Neo engine defects and the [C catalogue](https://github.com/diegoami/neo-angband-tracker/blob/master/docs/C-BUGS.md)
live in our engine fork. Mandos issues track its own behavior and consumer
integration. Old upstream tracker URLs redirect after the recorded migration.

A source merge does not deploy the running lab. Named package/plugin/harness/
lab receipts distinguish proposal, applied backport and verified adoption.
See [the adoption workflow](UPSTREAM.md) and [component map](SESSION.md).

## Documentation map

| Read | For |
| --- | --- |
| [README](../README.md) | What Mandos adds, measured examples and getting started. |
| [Settings](../SETTINGS.md) | Birth-pool, stage and replay recipes. |
| [Plans](../PLANNED.md) and [roadmap](plans/getting-stronger.md) | Mandos's direction and design. |
| [Run records](runs/README.md) | Reproducible measurements and their format. |
| [Post-mortem workflow](postmortem.md) | Generate dossiers, verify replays and diagnose failures. |
| [API 2 bridge](API2-MIGRATION.md) | Reads, intents, caches and controller lifecycle. |
| [Process](process.md) and [upstream watch](UPSTREAM.md) | Development, lab validation and carrying fixes. |
| [Upstream history](history/README.md) | The original port's playability investigation. |
| [Changelog](../CHANGELOG.md) | Versioned changes and engine compatibility. |
