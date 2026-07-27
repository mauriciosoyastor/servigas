import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  invoiceDraftEditPath,
  invoiceDraftEditPathFromMoveType,
  linesFromInvoiceDetail,
  partnerFromInvoiceDetail,
} from "../src/lib/shell/invoice-draft-edit.ts";

describe("invoice-draft-edit helpers", () => {
  it("builds edit paths", () => {
    assert.equal(
      invoiceDraftEditPath("accounting/customer-invoices", 55),
      "/lists/accounting/customer-invoices/55/edit"
    );
    assert.equal(
      invoiceDraftEditPathFromMoveType("out_invoice", 55),
      "/lists/accounting/customer-invoices/55/edit"
    );
    assert.equal(
      invoiceDraftEditPathFromMoveType("in_refund", 9),
      "/lists/accounting/vendor-refunds/9/edit"
    );
  });

  it("extracts partner and product lines from detail payload", () => {
    const detail = {
      key: "accounting/customer-invoices",
      title: "FC",
      model: "account.move",
      hubBack: "/hubs/accounting",
      listPath: "/lists/accounting/customer-invoices",
      imageUrl: null,
      fields: [
        { key: "partner_id", label: "Cliente", value: "Pérez" },
        { key: "partner_ref_id", label: "Ref. contacto", value: 6 },
        { key: "state", label: "Estado", value: "draft" },
      ],
      lines: {
        title: "Líneas",
        columns: [],
        rows: [
          {
            id: 1,
            product_id: "Anafe",
            product_variant_id: 42,
            quantity: 2,
            price_unit: 100,
            discount: 10,
          },
          {
            id: 2,
            product_id: "Sin producto",
            quantity: 1,
            price_unit: 1,
          },
        ],
      },
    };
    assert.deepEqual(partnerFromInvoiceDetail(detail), {
      id: 6,
      label: "Pérez",
    });
    assert.deepEqual(linesFromInvoiceDetail(detail), [
      {
        productId: 42,
        label: "Anafe",
        qty: 2,
        price: 100,
        discount: 10,
      },
    ]);
  });
});
