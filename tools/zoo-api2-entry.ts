/** The clean-lane entry imports the exact target plugin, never Mandos play-session. */
import * as Core from "@rpgm-tools/neo-angband-core";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import definition from "../plugin.ts";
import { loadPack } from "./zoo-pack.js";
import { runApi2Session, type Api2MeasurementOptions } from "./zoo-api2-session.js";
export { canonicalJson } from "./zoo-format.js";
export async function measure(packDir: string, options: Api2MeasurementOptions) {
  const records = (file: string) => {
    if (!/^[a-z_]+$/u.test(file)) throw new Error("Invalid content record name");
    return (JSON.parse(readFileSync(join(packDir, file + ".json"), "utf8")) as { records: import("@rpgm-tools/neo-angband-mod-sdk").JsonRecord[] }).records;
  };
  // Exactly the read/act capabilities in the frozen target manifest.
  const manifest = TARGET_MANIFEST;
  return runApi2Session(Core, loadPack(packDir), options, definition, records, manifest.data.capabilities);
}
// Bound by zoo-build's define; avoids runtime paths in the compiled bundle.
declare const TARGET_MANIFEST: { readonly data: { readonly capabilities: readonly string[] } };
