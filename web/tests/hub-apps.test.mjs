import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isHubApp, clientTagToApp } from "../src/lib/shell/hub-apps.ts";

describe("hub-apps", () => {
  it("accepts inventory", () => {
    assert.equal(isHubApp("inventory"), true);
  });
  it("rejects unknown", () => {
    assert.equal(isHubApp("pos"), false);
  });
  it("maps inventory client tag", () => {
    assert.equal(clientTagToApp("servigas_inventory_hub"), "inventory");
  });
});
