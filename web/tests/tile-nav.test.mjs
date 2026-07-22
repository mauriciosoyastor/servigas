import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveTileNavigation } from "../src/lib/shell/tile-nav.ts";

describe("resolveTileNavigation", () => {
  it("routes hub tiles to /hubs/:app", () => {
    const nav = resolveTileNavigation({
      target_type: "hub",
      client_tag: "servigas_inventory_hub",
    });
    assert.deepEqual(nav, { kind: "hub", path: "/hubs/inventory" });
  });
  it("marks non-hub as coming_soon", () => {
    const nav = resolveTileNavigation({
      target_type: "action",
      client_tag: "",
    });
    assert.deepEqual(nav, { kind: "coming_soon" });
  });
});
