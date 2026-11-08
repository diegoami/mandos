/** Runtime bundle, compiled once by zoo-build; never imported by plugin.ts. */
import * as Core from "@rpgm-tools/neo-angband-core";
import { loadPack } from "../src/play-session.js";
import { canonicalJson, runZooSession, type ZooSessionOptions } from "../src/zoo-session.js";
export { canonicalJson };
export function measure(packDir: string, options: ZooSessionOptions) {
  return runZooSession(Core, loadPack(packDir), options);
}
