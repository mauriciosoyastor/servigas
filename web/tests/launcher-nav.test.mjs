import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  displayLauncherLabel,
  partitionLauncherTiles,
} from "../src/lib/shell/launcher-nav.ts";

function tile(partial) {
  return {
    id: 1,
    label: "X",
    hint: "",
    icon: "",
    enter_label: "",
    target_type: "hub",
    client_tag: "",
    accent_key: "",
    value: "",
    action: false,
    ...partial,
  };
}

describe("launcher-nav", () => {
  it("renames Inventario→Stock and Facturación→Cobros on hub tiles", () => {
    assert.equal(
      displayLauncherLabel(
        tile({ label: "Inventario", client_tag: "servigas_inventory_hub" })
      ),
      "Stock"
    );
    assert.equal(
      displayLauncherLabel(
        tile({ label: "Facturación", client_tag: "servigas_accounting_hub" })
      ),
      "Cobros"
    );
  });

  it("renames Punto de venta→Mostrador on action tiles", () => {
    assert.equal(
      displayLauncherLabel(
        tile({
          label: "Punto de venta",
          target_type: "action",
          client_tag: "",
          action: { type: "ir.actions.act_window", res_model: "pos.config" },
        })
      ),
      "Mostrador"
    );
  });

  it("puts hub tiles in areas and action tiles in more", () => {
    const { areas, more } = partitionLauncherTiles([
      tile({
        id: 1,
        label: "Ventas",
        target_type: "hub",
        client_tag: "servigas_sales_hub",
      }),
      tile({
        id: 2,
        label: "Punto de venta",
        target_type: "action",
        client_tag: "pos",
        action: { type: "ir.actions.act_window", res_model: "pos.config" },
      }),
      tile({
        id: 3,
        label: "Ajustes",
        target_type: "action",
        client_tag: "settings",
        action: {
          type: "ir.actions.act_window",
          res_model: "res.config.settings",
        },
      }),
    ]);
    assert.equal(areas.length, 1);
    assert.equal(areas[0].label, "Ventas");
    assert.deepEqual(
      more.map((t) => t.label),
      ["Mostrador", "Ajustes"]
    );
  });

  it("puts Clientes action tile in areas (not Más accesos)", () => {
    const { areas, more } = partitionLauncherTiles([
      tile({
        id: 1,
        label: "Ventas",
        target_type: "hub",
        client_tag: "servigas_sales_hub",
      }),
      tile({
        id: 2,
        label: "Clientes",
        target_type: "action",
        client_tag: "customers",
        action: {
          type: "ir.actions.act_window",
          res_model: "res.partner",
          domain: [["customer_rank", ">", 0]],
        },
      }),
      tile({
        id: 3,
        label: "Mostrador",
        target_type: "action",
        client_tag: "pos",
        action: { type: "ir.actions.act_window", res_model: "pos.config" },
      }),
    ]);
    assert.deepEqual(
      areas.map((t) => t.label),
      ["Ventas", "Clientes"]
    );
    assert.deepEqual(
      more.map((t) => t.label),
      ["Mostrador"]
    );
  });
});

