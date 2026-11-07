/** Frozen selected-backup globals: C4.2.6 f3082213/current e473720 borg-trait-swap.c; no hidden object reads. */
import type { ItemView } from "@rpgm-tools/neo-angband-core";
import type { BorgContext } from "../context.js";
import type { BorgDerived } from "./state.js";
import type { BorgSpellSeam } from "./config.js";
import { BI } from "./trait-index.js";
import { hasFlag, resLevel } from "./item-util.js";
import { Spell, borgSpellLegalFail } from "../item/magic.js";
export type BackupCaps = Readonly<Partial<Record<BI, boolean>>>;
export const noBackupCaps = (): BackupCaps => Object.freeze({});
export function backupCaps(item: ItemView | undefined, weapon: boolean): BackupCaps {
  if (!item) return noBackupCaps();
  const caps: Partial<Record<BI, boolean>> = {};
  for (const [sr, element] of [[BI.SRACID, weapon ? "ELEC" : "ACID"], [BI.SRELEC,"ELEC"], [BI.SRFIRE,"FIRE"], [BI.SRCOLD,"COLD"],
    [BI.SRPOIS,"POIS"], [BI.SRLITE,"LIGHT"], [BI.SRDARK,"DARK"], [BI.SRSND,"SOUND"], [BI.SRSHRD,"SHARD"],
    [BI.SRNXUS,"NEXUS"], [BI.SRNTHR,"NETHER"], [BI.SRKAOS,"CHAOS"], [BI.SRDIS,"DISEN"]] as const) caps[sr] = resLevel(item,element)>0;
  // Preserve the C weapon acid-tail ELEC lookup. Both backup fear flags are never populated.
  for (const [sr,flag] of [[BI.SRBLIND,"PROT_BLIND"], [BI.SRCONF,"PROT_CONF"], [BI.SHLIFE,"HOLD_LIFE"], [BI.SFRACT,"FREE_ACT"]] as const)
    caps[sr]=hasFlag(item,flag);
  return Object.freeze(caps);
}
/** C folds after both full selectors, or their FALSE-retained globals. */
export function foldBackupCaps(ctx: BorgContext, d: BorgDerived, spells?: BorgSpellSeam): void {
  const t=ctx.world.self.trait;
  const legal=(name:"RESISTANCE"|"RESIST_POISON") => spells ? spells.spellLegalFail(name,15) : borgSpellLegalFail(ctx,Spell[name],15);
  const resist=legal("RESISTANCE"), poison=legal("RESIST_POISON");
  const available=(sr:BI,base:BI,spell=false):number =>
    t[base] || d.weaponSwapCaps[sr] || d.armourSwapCaps[sr] || spell ? 1 : 0;
  // Keep explicit C-order writers visible to the existing unwritten-trait guard.
  t[BI.SRACID]=available(BI.SRACID,BI.RACID,resist);
  t[BI.SRELEC]=available(BI.SRELEC,BI.RELEC,resist);
  t[BI.SRFIRE]=available(BI.SRFIRE,BI.RFIRE,resist);
  t[BI.SRCOLD]=available(BI.SRCOLD,BI.RCOLD,resist);
  t[BI.SRPOIS]=available(BI.SRPOIS,BI.RPOIS,poison);
  t[BI.SRFEAR]=available(BI.SRFEAR,BI.RFEAR);
  t[BI.SRLITE]=available(BI.SRLITE,BI.RLITE);
  t[BI.SRDARK]=available(BI.SRDARK,BI.RDARK);
  t[BI.SRBLIND]=available(BI.SRBLIND,BI.RBLIND);
  t[BI.SRCONF]=available(BI.SRCONF,BI.RCONF);
  t[BI.SRSND]=available(BI.SRSND,BI.RSND);
  t[BI.SRSHRD]=available(BI.SRSHRD,BI.RSHRD);
  t[BI.SRNXUS]=available(BI.SRNXUS,BI.RNXUS);
  t[BI.SRNTHR]=available(BI.SRNTHR,BI.RNTHR);
  t[BI.SRKAOS]=available(BI.SRKAOS,BI.RKAOS);
  t[BI.SRDIS]=available(BI.SRDIS,BI.RDIS);
  t[BI.SHLIFE]=available(BI.SHLIFE,BI.HLIFE);
  t[BI.SFRACT]=available(BI.SFRACT,BI.FRACT);
}
