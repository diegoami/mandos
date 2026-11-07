#!/usr/bin/env node
/**
 * Run the plugin builder, from wherever it can be found.
 *
 * The transform that turns `plugin.ts` into the `plugin.js` this repository ships
 * belongs to the game, not to this mod: the rules it enforces are the plugin ABI. It
 * lives at `packages/mod-sdk/bin/neo-angband-mod-build.mjs` in the game's repository and
 * ships inside `@rpgm-tools/neo-angband-mod-sdk`.
 *
 * THREE SOURCES, IN ORDER, and the order is not arbitrary:
 *
 *   1. NEO_ANGBAND_REPO, when it is set. Setting it is a deliberate act, so it wins
 *      outright rather than being weighed against anything else.
 *   2. The published SDK in node_modules. This is the default, because plugin.js is a
 *      shipped artefact and building it against a pinned copy is what makes the result
 *      reproducible by somebody who does not have a checkout of the game. It is also
 *      the path a third-party mod author takes, and the reason the tool is published.
 *   3. A sibling checkout at ../neo-angband. Available for developing against an engine
 *      change that has not reached the registry yet, and below the published copy so
 *      that a neighbouring working tree cannot quietly decide what gets published.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { join, resolve, dirname } from "node:path";

const REL = join("packages", "mod-sdk", "bin", "neo-angband-mod-build.mjs");

/* Order matters, and it used to be the other way round.
 *
 * The INSTALLED SDK is the default: it is the version this repository pins, the
 * one CI installs, and the one a third-party author would get. A sibling checkout
 * of the game is whatever is in that working tree right now - possibly mid-edit,
 * possibly a different branch - and plugin.js is a SHIPPED artefact whose SHA-256
 * goes in the catalogue, so building it against an unpinned tree is a way to
 * publish something nobody else can reproduce. The sibling stays available, below
 * the pinned copy, for working on the SDK and a mod together.
 *
 * NEO_ANGBAND_REPO still wins outright, because setting it is a deliberate act. */
const candidates = [];
const explicit = process.env["NEO_ANGBAND_REPO"];
if (explicit !== undefined && explicit !== "") candidates.push(join(explicit, REL));
candidates.push(
  fileURLToPath(
    new URL("../node_modules/@rpgm-tools/neo-angband-mod-sdk/bin/neo-angband-mod-build.mjs", import.meta.url),
  ),
);
candidates.push(fileURLToPath(new URL(`../../neo-angband/${REL.replace(/\\/g, "/")}`, import.meta.url)));

const bin = candidates.find((p) => existsSync(p));
if (bin === undefined) {
  console.error(
    "Cannot find neo-angband-mod-build, the tool that builds plugin.js from src/.\n" +
      "It ships with the game's mod SDK, so `pnpm install --frozen-lockfile` in this\n" +
      "repository is normally all it takes. If node_modules is missing or its SDK is\n" +
      "too old to carry the bin, install a newer @rpgm-tools/neo-angband-mod-sdk, check out\n" +
      "https://github.com/neostryder/neo-angband as a sibling of this repository, or set\n" +
      "NEO_ANGBAND_REPO to where that checkout already is.\n" +
      `Looked for:\n${candidates.map((c) => `  ${c}`).join("\n")}`,
  );
  process.exit(1);
}

/* --root is this repository, which IS the mod folder: plugin.ts, manifest.json and the
 * built plugin.js all sit here, because that pair is what the game fetches and hashes.
 * The builder writes beside the manifest by default, so there is nothing else to say. */
try {
  const root = fileURLToPath(new URL("../", import.meta.url));
  const args = process.argv.slice(2);
  const profileAt = args.indexOf("--profile");
  let output;
  if (profileAt !== -1) {
    const outAt = args.indexOf("--out");
    if (args[profileAt + 1] !== "edge218" || !args[outAt + 1] || args[outAt + 1].startsWith("--") ||
      args.length !== 4 || [profileAt, outAt].sort((a, b) => a - b).join(",") !== "0,2") {
      throw new Error("Profile usage: node tools/build.mjs --profile edge218 --out <fresh directory>");
    }
    output = resolve(args[outAt + 1]);
    if (existsSync(output)) throw new Error("The profile output already exists; nothing was overwritten.");
    if (!existsSync(dirname(output))) throw new Error("Create the profile output's parent directory first.");
  }
  // The optional developer profile copies the checked artifact; it is not another code fork.
  execFileSync(process.execPath, [bin, "--root", root, ...(output ? ["--check"] : args)], { stdio: "inherit" });
  if (output) {
    const source = readFileSync(join(root, "manifest.json"));
    const manifest = JSON.parse(source);
    if (manifest.data?.id !== "mandos" || manifest.data?.runtime !== "in-process" || !Array.isArray(manifest.data.capabilities)) {
      throw new Error("The edge profile requires the canonical in-process Mandos manifest.");
    }
    manifest.data.engine.range = "1.23.0-edge.218";
    manifest.data.engine.because = "Disposable qualification against the verified official edge218 build; this is not the published default profile.";
    for (const capability of ["input:controller", "engine:access"]) {
      if (!manifest.data.capabilities.includes(capability)) manifest.data.capabilities.push(capability);
    }
    const encoded = JSON.stringify(manifest, null, 2) + "\n";
    const plugin = readFileSync(join(root, "plugin.js"));
    mkdirSync(output); // Atomic refusal if another process created it during the check.
    writeFileSync(join(output, "manifest.json"), encoded, { flag: "wx" });
    writeFileSync(join(output, "plugin.js"), plugin, { flag: "wx" });
    const sha = (value) => createHash("sha256").update(value).digest("hex");
    console.log(JSON.stringify({ profile: "edge218-developer", output, engine: manifest.data.engine.range,
      sourceManifestSha256: sha(source), manifestSha256: sha(encoded), pluginSha256: sha(plugin) }));
  }
} catch (e) {
  if (typeof e.status !== "number") console.error(e.message);
  process.exit(typeof e.status === "number" ? e.status : 1);
}
