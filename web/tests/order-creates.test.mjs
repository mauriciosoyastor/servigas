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

  it("filters multi-line payload with price and discount", () => {
    assert.deepEqual(
      filterOrderCreateValues("sales/quotations", {
        partnerId: "6",
        lines: [
          { productId: 42, qty: "2", price: "100", discount: "10" },
          { productId: 7, qty: 1 },
        ],
      }),
      {
        partnerId: 6,
        lines: [
          { productId: 42, qty: 2, price: 100, discount: 10 },
          { productId: 7, qty: 1 },
        ],
      }
    );
  });

  it("normalizes legacy single-product payload to one line", () => {
    assert.deepEqual(
      filterOrderCreateValues("sales/quotations", {
        partnerId: "6",
        productId: 42,
        qty: "2.5",
      }),
      {
        partnerId: 6,
        lines: [{ productId: 42, qty: 2.5 }],
      }
    );
  });

  it("rejects missing partner, empty lines, or invalid discount", () => {
    assert.equal(
      filterOrderCreateValues("sales/quotations", {
        lines: [{ productId: 1, qty: 1 }],
      }),
      null
    );
    assert.equal(
      filterOrderCreateValues("sales/quotations", {
        partnerId: 1,
        lines: [],
      }),
      null
    );
    assert.equal(
      filterOrderCreateValues("sales/quotations", {
        partnerId: 1,
        lines: [{ productId: 1, qty: 1, discount: 150 }],
      }),
      null
    );
  });
});
