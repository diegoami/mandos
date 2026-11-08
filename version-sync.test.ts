import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { validateManifest } from "@rpgm-tools/neo-angband-mod-sdk";

/**
 * `package.json` and `manifest.json` must carry the same version.
 *
 * The game reads `manifest.json`, so that is the version a player installs and
 * the one a release tag matches. `package.json` is only what the build and the
 * toolchain see, which is exactly why it can drift without anything noticing:
 * in the qol mod it sat at 1.1.1 through the 1.2.0, 1.3.0 and 1.4.0 releases,
 * three tags out of date, and nothing failed.
 *
 * The changelog is the third site, and the one with the longest reach. A
 * version whose section is undated is a release nobody can read the notes for,
 * and The Ledger builds every entry from that section, so a missing one is a
 * version that reaches the site as nothing at all.
 */
describe("the two version sites", () => {
  const read = (f: string): string => {
    const value = JSON.parse(readFileSync(new URL(f, import.meta.url), "utf8"));
    return f === "./manifest.json" ? validateManifest(value).version : (value as { version: string }).version;
  };

  it("agree", () => {
    expect(read("./package.json")).toBe(read("./manifest.json"));
  });

  it("normalizes schema 2 fields for manifest consumers", () => {
    const document = JSON.parse(readFileSync(new URL("./manifest.json", import.meta.url), "utf8"));
    expect(document.schemaVersion).toBe(2);
    const normalized = validateManifest(document);
    expect(normalized.version).toBe(document.data.version);
    expect(normalized.version).toBe("0.1.0");
    expect(normalized.capabilities).toEqual(document.data.capabilities);
    /* The restart loop's event:run-end, the journal's event:dungeonlevel and
     * the birth presenter's ui:birth.replace (the M2 unification, #15, ported
     * from the archived fork's T04/T06/T03), plus the retire path's
     * session:control (#25) and the replay demonstration log's
     * event:player-command (#29), and the autoplayer's input:controller, which
     * API 2.1.0 lets any host grant, over upstream's 17. */
    expect(normalized.capabilities).toHaveLength(23);
    expect(normalized.rules).toEqual(document.data.rules);
    expect(normalized.rules!.length).toBeGreaterThan(0);
  });

  it("are the version the changelog's newest released section names", () => {
    const changelog = readFileSync(new URL("./CHANGELOG.md", import.meta.url), "utf8");
    const newest = /^## (\d+\.\d+\.\d+(?:-[0-9A-Za-z.]+)?) - /mu.exec(changelog);
    expect(newest?.[1]).toBe(read("./manifest.json"));
  });
});
