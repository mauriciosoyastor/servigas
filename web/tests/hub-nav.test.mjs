import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  HUB_LABELS,
  HUB_SUMMARY_CARD_LIMIT,
  labelHubSections,
  limitHubCards,
  splitHubSections,
  thinHubPayload,
} from "../src/lib/shell/hub-nav.ts";

function card(label, id = 0) {
  return {
    id,
    label,
    hint: "",
    icon: "",
    variant: "default",
    accent_key: "",
    enter_label: "",
    value: "",
    action: {},
  };
}

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

  it("labels accounting primary pills as Por cobrar / Por pagar and keeps Más", () => {
    const labeled = labelHubSections("accounting", [
      { code: "summary", name: "Resumen", icon: "a" },
      { code: "receivables", name: "Clientes", icon: "b" },
      { code: "payables", name: "Proveedores", icon: "c" },
      { code: "reporting", name: "Informes", icon: "d" },
      { code: "config", name: "Configuración", icon: "e" },
    ]);
    assert.equal(
      labeled.find((s) => s.code === "receivables")?.name,
      "Por cobrar"
    );
    assert.equal(
      labeled.find((s) => s.code === "payables")?.name,
      "Por pagar"
    );
    const split = splitHubSections("accounting", labeled);
    assert.deepEqual(
      split.primary.map((s) => s.name),
      ["Resumen", "Por cobrar", "Por pagar"]
    );
    assert.deepEqual(
      split.more.map((s) => s.code),
      ["reporting", "config"]
    );
  });

  it("limits summary cards to five", () => {
    const cards = Array.from({ length: 8 }, (_, i) => card(`c${i}`, i));
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

  it("keeps Por cobrar / Por pagar on accounting summary and demotes back-office cards", () => {
    const cards = [
      card("Por cobrar", 1),
      card("Por pagar", 2),
      card("Borradores", 3),
      card("Pagos registrados", 4),
      card("Pendientes Factura Web", 5),
      card("Facturado hoy", 6),
      card("Tablero contable", 7),
    ];
    const thinned = thinHubPayload({
      app: "accounting",
      section: "summary",
      cards,
      groups: [],
    });
    const labels = thinned.cards.map((c) => c.label);
    assert.ok(labels.includes("Por cobrar"));
    assert.ok(labels.includes("Por pagar"));
    assert.equal(labels.includes("Pendientes Factura Web"), false);
    assert.equal(labels.includes("Tablero contable"), false);
    assert.ok(thinned.cards.length <= HUB_SUMMARY_CARD_LIMIT);
  });
});
