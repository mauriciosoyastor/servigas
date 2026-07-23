import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canCreateOrder,
  filterOrderCreateValues,
  getOrderCreateDef,
} from "../src/lib/shell/order-creates.ts";

describe("order-creates allowlist", () => {
  it("defines sales quotations create", () => {
    const def = getOrderCreateDef("sales/quotations");
    assert.ok(def);
    assert.equal(def.model, "sale.order");
    assert.equal(def.lineQtyField, "product_uom_qty");
    assert.equal(canCreateOrder("sales/quotations"), true);
  });

  it("defines purchase RFQ create", () => {
    const def = getOrderCreateDef("purchase/rfq");
    assert.ok(def);
    assert.equal(def.model, "purchase.order");
    assert.equal(def.lineQtyField, "product_qty");
    assert.equal(canCreateOrder("purchase/rfq"), true);
  });

  it("filters partner, product and qty", () => {
    assert.deepEqual(
      filterOrderCreateValues("sales/quotations", {
        partnerId: "6",
        productId: 42,
        qty: "2.5",
      }),
      { partnerId: 6, productId: 42, qty: 2.5 }
    );
  });

  it("rejects missing partner or product", () => {
    assert.equal(
      filterOrderCreateValues("sales/quotations", { productId: 1, qty: 1 }),
      null
    );
    assert.equal(
      filterOrderCreateValues("sales/quotations", { partnerId: 1, qty: 0 }),
      null
    );
  });
});
