import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) =>
  readFile(new URL(`../src/${path}`, import.meta.url), "utf8");

describe("shell UI contracts", () => {
  it("loads shared tokens and shell styles globally", async () => {
    const css = await source("styles/global.css");

    assert.match(css, /@import "\.\/tokens\.css"/);
    assert.match(css, /@import "\.\/shell\.css"/);
  });

  it("provides the requested shell components", async () => {
    const [layout, rail, tile, note] = await Promise.all([
      source("layouts/ShellLayout.astro"),
      source("components/RailNav.astro"),
      source("components/TileCard.astro"),
      source("components/ComingSoonNote.astro"),
    ]);

    assert.match(layout, /<RailNav active=/);
    assert.match(rail, /\/hubs\/inventory/);
    assert.match(rail, /\/hubs\/sales/);
    assert.match(tile, /data-tile/);
    assert.match(note, /Próximamente/);
  });

  it("posts login credentials to the BFF before navigating home", async () => {
    const login = await source("pages/login.astro");

    assert.match(login, /fetch\(["']\/api\/auth\/login["']/);
    assert.match(login, /location\.(?:assign|href)/);
  });

  it("protects and renders the launcher using tile navigation", async () => {
    const index = await source("pages/index.astro");

    assert.match(index, /requireOdooSession\(Astro\.cookies\)/);
    assert.match(index, /getLauncher\(odooSessionId\)/);
    assert.match(index, /Astro\.redirect\(["']\/login["']\)/);
    assert.match(index, /resolveTileNavigation/);
  });
});
