/**
 * Weapon-backup value/selection: borg-trait-swap.c:158-612 (4.2.6 f3082213,
 * current e473720). This leaf produces the carried handle and value only;
 * armour, tactical swapping and enchant/decurse actions remain separate.
 */
import type { ItemView } from "@rpgm-tools/neo-angband-core";
import type { BorgContext } from "../context.js";
import { BI } from "./trait-index.js";
import { resolveOpts, type BorgTraitOpts } from "./config.js";
import { hasBrand3, hasFlag, present, resLevel, slayMult } from "./item-util.js";
import { isCursed, perItemValue } from "../item/deps.js";
import { Spell, borgSpellLegalFail } from "../item/magic.js";
import { TV } from "../item/svals.js";

export interface WeaponSwap {
  /** Gear handle, not the C pack-index-plus-one sentinel. */
  handle: number | null;
  /** C uses -1 for no useful weapon backup. */
  value: number;
}

/** Public knowledge inputs, never engine objects or hidden state. */
export interface WeaponSwapKnowledge {
  /** Per-instance removable curse known (<100); absent means unknown. */
  uncursable?: (item: ItemView) => boolean;
  /** A known Tarrasque death; absent retains C's initial not-known-dead state. */
  tarrasqueDead?: boolean;
}

const NONE = (): WeaponSwap => ({ handle: null, value: -1 });
const BAD_CURSES = new Set(["teleportation", "poison", "siren", "hallucination",
  "paralysis", "demon summon", "dragon summon", "undead summon", "stone",
  "anti-teleportation", "treacherous weapon", "unknown"]);
const OTHER_CURSES = new Set(["vulnerability", "dullness", "sickliness", "enveloping",
  "irritation", "weakness", "clumsiness", "slowness", "annoyance",
  "impair mana recovery", "impair hitpoint recovery", "cowardice", "burning up",
  "chilled to the bone", "steelskin", "air swing"]);

/** Pure carried-pack evaluation; HOME can replace one slot without live writes. */
export function borgWeaponSwap(
  ctx: BorgContext,
  opts: BorgTraitOpts = {},
  inventory: readonly ItemView[] = ctx.view.inventory(),
): WeaponSwap {
  // TV is a live host binding; never read it until the controller is bound.
  const weapons: readonly number[] = [TV.HAFTED, TV.POLEARM, TV.SWORD, TV.DIGGING];
  const wearable: readonly number[] = [...weapons, TV.BOW, TV.RING, TV.AMULET,
    TV.LIGHT, TV.SOFT_ARMOR, TV.HARD_ARMOR, TV.DRAG_ARMOR, TV.CLOAK,
    TV.SHIELD, TV.HELM, TV.CROWN, TV.GLOVES, TV.BOOTS];
  const R = resolveOpts(opts), t = ctx.world.self.trait;
  const trait = (bi: BI): number => t[bi] ?? 0;
  const quiver = new Set(ctx.view.quiver?.().map(item => item.handle) ?? []);
  let best = NONE();
  for (const item of inventory) {
    if (quiver.has(item.handle) || !present(item) || !item.aware || !wearable.includes(item.tval)) continue;
    if (trait(BI.MAXDEPTH) < 50 && item.tval !== TV.DIGGING) continue;
    // Keep the C's ordered early return, including its digger exception.
    if ((!R.cfg.usesSwaps || trait(BI.MAXDEPTH) >= 90) && item.tval !== TV.DIGGING)
      return NONE();
    if (!weapons.includes(item.tval)) continue;
    // FORK: public ItemView has curse names, not per-instance power. Do not
    // invent removability. Production excludes this unknown case; an explicit
    // public knowledge producer may supply it. No such producer is claimed.
    if (item.curses.length && !opts.weaponSwap?.uncursable) continue;
    let digger = 0;
    if (["DIG_1", "DIG_2", "DIG_3"].some(flag => hasFlag(item, flag))) {
      if (perItemValue(item) <= 0 || isCursed(item)) continue;
      const wielded = ctx.view.equipment()[0];
      const stoneToMud = opts.spells
        ? R.spells.spellLegalFail("TURN_STONE_TO_MUD", 40)
        : borgSpellLegalFail(ctx, Spell.TURN_STONE_TO_MUD, 40);
      if (!stoneToMud &&
          !(wielded && ["DIG_1", "DIG_2", "DIG_3"].some(flag => hasFlag(wielded, flag))))
        digger = item.pval;
    }
    const damage = item.dd * item.ds * 25;
    let value = -1 + damage * (trait(BI.BLOWS) + 1)
      + (trait(BI.TOHIT) + item.toH) * 100
      + (trait(BI.TODAM) + item.toD) * 75;
    const slay = (name: string): number => slayMult(item, name);
    let dam = damage * 2 * trait(BI.BLOWS);
    if (!trait(BI.WS_ANIMAL) && !trait(BI.WB_ELEC) && slay("ANIMAL"))
      value += Math.trunc(dam * slay("ANIMAL") / 2);
    if (!trait(BI.WS_EVIL) && slay("EVIL")) value += Math.trunc(dam * slay("EVIL") / 2);
    dam = damage * 3 * trait(BI.BLOWS);
    for (const [name, bi] of [["ORC", BI.WS_ORC], ["UNDEAD", BI.WS_UNDEAD],
      ["DEMON", BI.WS_DEMON], ["GIANT", BI.WS_GIANT], ["DRAGON", BI.WS_DRAGON]] as const) {
      if (!trait(bi) && !(name === "DRAGON" && trait(BI.WK_DRAGON)) && slay(name))
        value += Math.trunc(dam * slay(name) / 2);
    }
    if (!trait(BI.WS_TROLL) && slay("TROLL")) value += dam;
    for (const [name, bi, factor] of [["ACID", BI.WB_ACID, 4], ["ELEC", BI.WB_ELEC, 5],
      ["FIRE", BI.WB_FIRE, 3], ["COLD", BI.WB_COLD, 3], ["POIS", BI.WB_POIS, 3]] as const)
      if (!trait(bi) && hasBrand3(item, name)) value += Math.trunc(dam * factor / 2);
    for (const [name, bi] of [["ORC", BI.WS_ORC], ["TROLL", BI.WS_TROLL]] as const)
      if (!trait(bi) && !trait(BI.WS_EVIL) && slay(name)) value += Math.trunc(dam * slay(name) / 2);
    if (trait(BI.MAXDEPTH) >= 25 && trait(BI.MAXDEPTH) <= 40 && trait(BI.GOLD) < 100000 && digger)
      value += digger * 3500 + 1000;
    if (hasFlag(item, "AGGRAVATE")) value -= 8000;
    if (item.curses.some(name => BAD_CURSES.has(name) || !OTHER_CURSES.has(name))) value -= 100000;
    if (item.curses.length && opts.weaponSwap?.uncursable?.(item)) value -= 5000;
    for (const [flag, bi, weight] of [["SLOW_DIGEST", BI.SDIG, 10], ["REGEN", BI.REG, 2000],
      ["TELEPATHY", BI.ESP, 5000], ["SEE_INVIS", BI.SINV, 50000], ["FEATHER", BI.FEATH, 10],
      ["FREE_ACT", BI.FRACT, 10000], ["PROT_CONF", BI.RCONF, 5000], ["PROT_BLIND", BI.RBLIND, 5000]] as const)
      if (!trait(bi) && hasFlag(item, flag)) value += weight;
    if (!trait(BI.LIGHT) && (hasFlag(item, "LIGHT_2") || hasFlag(item, "LIGHT_3"))) value += 2000;
    if (!trait(BI.HLIFE) && trait(BI.MAXCLEVEL) < 50 && hasFlag(item, "HOLD_LIFE")) value += 2000;
    for (const [element, bi, weight] of [["FIRE", BI.IFIRE, 70000], ["ACID", BI.IACID, 30000],
      ["COLD", BI.ICOLD, 50000], ["ELEC", BI.IELEC, 25000]] as const)
      if (!trait(bi) && resLevel(item, element) === 3) value += weight;
    for (const [element, bi, weight] of [["FIRE", BI.RFIRE, 8000], ["ACID", BI.RACID, 6000],
      ["COLD", BI.RCOLD, 4000], ["ELEC", BI.RELEC, 3000], ["POIS", BI.RPOIS, 20000],
      ["SOUND", BI.RSND, 2000], ["LIGHT", BI.RLITE, 800], ["DARK", BI.RDARK, 800],
      ["CHAOS", BI.RKAOS, 8000], ["DISEN", BI.RDIS, 5000], ["SHARD", BI.RSHRD, 100],
      ["NEXUS", BI.RNXUS, 100], ["NETHER", BI.RNTHR, 5500]] as const)
      if (!trait(bi) && resLevel(item, element) > 0) value += weight;
    if (["FIRE", "ACID", "ELEC", "COLD"].every(element => resLevel(item, element) > 0)) value += 10000;
    // C declares weapon_swap_resist_fear but never populates it: no new fear reward.
    if (trait(BI.MAXDEPTH) >= 75 && !opts.weaponSwap?.tarrasqueDead)
      for (const [element, bi] of [["COLD", BI.ICOLD], ["FIRE", BI.IFIRE]] as const)
        if (!trait(bi) && resLevel(item, element) === 3) value += 90000;
    for (const [element, bi, depth] of [["NETHER", BI.RNTHR, 55], ["CHAOS", BI.RKAOS, 60],
      ["DISEN", BI.RDIS, 60]] as const)
      if (!trait(bi) && trait(BI.MAXDEPTH) + 1 >= depth && resLevel(item, element) > 0) value += 100000;
    if (value <= 1000 || value < best.value) continue;
    best = { handle: item.handle, value };
  }
  return best;
}
