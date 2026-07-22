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
    assert.match(index, /invalidateBffSession\(Astro\.cookies\)/);
    assert.match(index, /Astro\.redirect\(["']\/login["']\)/);
    assert.match(index, /resolveTileNavigation/);
  });

  it("validates Odoo before redirecting an existing session from login", async () => {
    const login = await source("pages/login.astro");

    assert.match(login, /validateSession\(odooSessionId\)/);
    assert.match(login, /invalidateBffSession\(Astro\.cookies\)/);
  });

  it("renders known hubs from their summary payload and keeps cards local", async () => {
    const hub = await source("pages/hubs/[app].astro");

    assert.match(hub, /isHubApp\(app\)/);
    assert.match(hub, /Astro\.response\.status = 404/);
    assert.match(hub, /requireOdooSession\(Astro\.cookies\)/);
    assert.match(hub, /getBackend\(\)\.getHub\(odooSessionId,\s*app,\s*['"]summary['"]\)/);
    assert.match(hub, /payload\.cards/);
    assert.match(hub, /<TileCard/);
    assert.match(hub, /<ComingSoonNote/);
    assert.match(hub, /cause instanceof BffError && cause\.code === ['"]unauthorized['"]/);
    assert.match(hub, /invalidateBffSession\(Astro\.cookies\)/);
    assert.match(hub, /<ShellLayout/);
    assert.match(hub, /Sin tarjetas en este resumen/);
    assert.doesNotMatch(hub, /window\.location\.(?:href|assign)/);
  });
});
