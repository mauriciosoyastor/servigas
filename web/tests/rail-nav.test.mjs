import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  RAIL_ITEMS,
  isRailApp,
} from "../src/lib/shell/rail-nav.ts";

describe("rail-nav (trabajo del día)", () => {
  it("lists Inicio, Mostrador, Caja, Stock, Compras, Clientes, Cobros, Taller in order", () => {
    assert.deepEqual(
      RAIL_ITEMS.map((item) => ({ app: item.app, label: item.label, href: item.href })),
      [
        { app: "home", label: "Inicio", href: "/" },
        { app: "pos", label: "Mostrador", href: "/pos" },
        { app: "caja", label: "Caja", href: "/caja" },
        { app: "inventory", label: "Stock", href: "/hubs/inventory" },
        { app: "purchase", label: "Compras", href: "/hubs/purchase" },
        { app: "customers", label: "Clientes", href: "/lists/sales/customers" },
        { app: "accounting", label: "Cobros", href: "/hubs/accounting" },
        { app: "workshop", label: "Taller", href: "/hubs/workshop" },
      ]
    );
  });

  it("does not put Ventas on the rail", () => {
    assert.equal(
      RAIL_ITEMS.some((item) => item.app === "sales" || item.label === "Ventas"),
      false
    );
  });

  it("accepts rail apps including customers, pos, caja and workshop", () => {
    for (const app of [
      "home",
      "pos",
      "caja",
      "inventory",
      "purchase",
      "customers",
      "workshop",
      "accounting",
    ]) {
      assert.equal(isRailApp(app), true, app);
    }
    assert.equal(isRailApp("sales"), false);
  });
});

