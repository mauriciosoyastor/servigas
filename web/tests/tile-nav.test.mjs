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

  it("marks action without payload as coming_soon", () => {
    const nav = resolveTileNavigation({
      target_type: "action",
      client_tag: "",
    });
    assert.deepEqual(nav, { kind: "coming_soon" });
  });

  it("routes product.template act_window to Astro products list", () => {
    const nav = resolveTileNavigation({
      target_type: "action",
      client_tag: "",
      label: "Productos",
      action: {
        type: "ir.actions.act_window",
        res_model: "product.template",
        view_mode: "list,form",
      },
    });
    assert.deepEqual(nav, {
      kind: "list",
      path: "/lists/inventory/products",
    });
  });

  it("routes no-stock product.product actions to Astro list", () => {
    const nav = resolveTileNavigation({
      target_type: "action",
      client_tag: "",
      action: {
        type: "ir.actions.act_window",
        res_model: "product.product",
        domain: [["qty_available", "<=", 0]],
      },
    });
    assert.deepEqual(nav, {
      kind: "list",
      path: "/lists/inventory/no-stock",
    });
  });

  it("routes Stock almacenable card with empty domain via label", () => {
    const nav = resolveTileNavigation({
      target_type: "action",
      client_tag: "",
      label: "Stock almacenable",
      action: {
        type: "ir.actions.act_window",
        res_model: "product.product",
        domain: [],
      },
    });
    assert.deepEqual(nav, {
      kind: "list",
      path: "/lists/inventory/stockables",
    });
  });

  it("routes Por facturar card with empty domain via label", () => {
    const nav = resolveTileNavigation({
      target_type: "action",
      client_tag: "",
      label: "Por facturar",
      action: {
        type: "ir.actions.act_window",
        res_model: "sale.order",
        domain: [],
      },
    });
    assert.deepEqual(nav, {
      kind: "list",
      path: "/lists/sales/to-invoice",
    });
  });

  it("routes Proveedores card with empty domain via label", () => {
    const nav = resolveTileNavigation({
      target_type: "action",
      client_tag: "",
      label: "Proveedores",
      action: {
        type: "ir.actions.act_window",
        res_model: "res.partner",
        domain: [],
      },
    });
    assert.deepEqual(nav, {
      kind: "list",
      path: "/lists/purchase/vendors",
    });
  });

  it("marks unknown act_window models as coming_soon", () => {
    const nav = resolveTileNavigation({
      target_type: "action",
      client_tag: "",
      action: {
        type: "ir.actions.act_window",
        res_model: "res.users",
      },
    });
    assert.deepEqual(nav, { kind: "coming_soon" });
  });

  it("routes Análisis de ventas hub card to Astro report list", () => {
    const nav = resolveTileNavigation({
      target_type: "action",
      client_tag: "",
      label: "Análisis de ventas",
      action: {
        type: "ir.actions.act_window",
        res_model: "sale.report",
        domain: [],
      },
    });
    assert.deepEqual(nav, { kind: "list", path: "/lists/sales/analysis" });
  });

  it("routes Punto de venta launcher tile to POS landing", () => {
    const nav = resolveTileNavigation({
      target_type: "action",
      client_tag: "",
      label: "Punto de venta",
      action: {
        type: "ir.actions.act_window",
        res_model: "pos.config",
      },
    });
    assert.deepEqual(nav, { kind: "route", path: "/pos" });
  });

  it("routes Apps and Ajustes launcher tiles to landings", () => {
    assert.deepEqual(
      resolveTileNavigation({
        target_type: "action",
        client_tag: "",
        label: "Aplicaciones",
        action: {
          type: "ir.actions.act_window",
          res_model: "ir.module.module",
        },
      }),
      { kind: "route", path: "/apps" }
    );
    assert.deepEqual(
      resolveTileNavigation({
        target_type: "action",
        client_tag: "",
        label: "Ajustes",
        action: {
          type: "ir.actions.act_window",
          res_model: "res.config.settings",
        },
      }),
      { kind: "route", path: "/settings" }
    );
  });
});
