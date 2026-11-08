/** Type-only seam for the unmodified pinned engine intent gate. */
import type { InputSnapshot } from "@rpgm-tools/neo-angband-core";
export interface InputSnapshotSource {
  phase(): InputSnapshot["phase"];
  prompt(): InputSnapshot["prompt"];
}
