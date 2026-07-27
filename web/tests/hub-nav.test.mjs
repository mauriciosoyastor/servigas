import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  HUB_LABELS,
  HUB_SUMMARY_CARD_LIMIT,
  limitHubCards,
  splitHubSections,
  thinHubPayload,
} from "../src/lib/shell/hub-nav.ts";

describe("hub-nav (hubs flacos)", () => {
  it("uses work labels Stock / Cobros", () => {
    assert.equal(HUB_LABELS.inventory, "Stock");
    assert.equal(HUB_LABELS.accounting, "Cobros");
    assert.equal(HUB_LABELS.sales, "Ventas");
    assert.equal(HUB_LABELS.purchase, "Compras");
  });

  it("puts reporting and config under Más for inventory", () => {
    const split = splitHubSections("inventory", [
      { code: "summary", name: "Resumen", icon: "a" },
      { code: "products", name: "Productos", icon: "b" },
      { code: "operations", name: "Operaciones", icon: "c" },
      { code: "reporting", name: "Informes", icon: "d" },
      { code: "config", name: "Configuración", icon: "e" },
    ]);
    assert.deepEqual(
      split.primary.map((s) => s.code),
      ["summary", "products", "operations"]
    );
    assert.deepEqual(
      split.more.map((s) => s.code),
      ["reporting", "config"]
    );
  });

  it("limits summary cards to five", () => {
    const cards = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      label: `c${i}`,
      hint: "",
      icon: "",
      variant: "default",
      accent_key: "",
      enter_label: "",
      value: "",
      action: {},
    }));
    assert.equal(limitHubCards(cards).length, HUB_SUMMARY_CARD_LIMIT);
    const thinned = thinHubPayload({
      app: "sales",
      section: "summary",
      cards,
      groups: [],
    });
    assert.equal(thinned.cards.length, 5);
    const full = thinHubPayload({
      app: "sales",
      section: "orders",
      cards,
      groups: [],
    });
    assert.equal(full.cards.length, 8);
  });
});
