import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildOrderPickerSearchUrl,
  labelOrderPartnerRow,
  labelOrderProductRow,
  mapRowsToPickerOptions,
} from "../src/lib/shell/order-create-pickers.ts";

describe("order-create-pickers", () => {
  it("builds allowlisted list search URLs", () => {
    assert.equal(
      buildOrderPickerSearchUrl("sales/customers", "matasini"),
      "/api/lists/sales/customers?q=matasini&page=1"
    );
    assert.equal(
      buildOrderPickerSearchUrl("inventory/variants", "FER-12"),
      "/api/lists/inventory/variants?q=FER-12&page=1"
    );
    assert.equal(
      buildOrderPickerSearchUrl("purchase/vendors", "  orbis "),
      "/api/lists/purchase/vendors?q=orbis&page=1"
    );
  });

  it("rejects unknown list keys for picker search", () => {
    assert.equal(buildOrderPickerSearchUrl("accounting/drafts", "x"), null);
    assert.equal(buildOrderPickerSearchUrl("", "x"), null);
  });

  it("labels partners and products for picker options", () => {
    assert.equal(
      labelOrderPartnerRow({ id: 3, name: "Cliente Demo" }),
      "Cliente Demo"
    );
    assert.equal(
      labelOrderProductRow({
        id: 9,
        display_name: "[FER-1] Calefactor",
        default_code: "FER-1",
      }),
      "[FER-1] Calefactor"
    );
    assert.equal(
      labelOrderProductRow({ id: 9, default_code: "FER-1", name: false }),
      "FER-1"
    );
  });

  it("maps list rows to picker options with the right labeler", () => {
    const partners = mapRowsToPickerOptions(
      [{ id: 1, name: "Ana" }, { id: 2, name: "Bob" }],
      "partner"
    );
    const products = mapRowsToPickerOptions(
      [
        { id: 10, display_name: "Prod A", default_code: "A" },
        { id: "bad", name: "skip" },
      ],
      "product"
    );
    assert.deepEqual(partners, [
      { id: 1, label: "Ana" },
      { id: 2, label: "Bob" },
    ]);
    assert.deepEqual(products, [{ id: 10, label: "Prod A" }]);
  });
});
