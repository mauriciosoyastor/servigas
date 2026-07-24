import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canCreateInvoice,
  filterInvoiceCreateValues,
  getInvoiceCreateDef,
} from "../src/lib/shell/invoice-creates.ts";
import { canCreateRecord } from "../src/lib/shell/record-writes.ts";
import {
  PUBLISH_CUIT_ADDRESS_MSG,
  PUBLISH_CUIT_VAT_MSG,
  publishInvoiceDestError,
} from "../src/lib/shell/invoice-dest.ts";

describe("invoice-creates allowlist", () => {
  it("defines customer invoice create", () => {
    const def = getInvoiceCreateDef("accounting/customer-invoices");
    assert.ok(def);
    assert.equal(def.model, "account.move");
    assert.equal(def.moveType, "out_invoice");
    assert.equal(canCreateInvoice("accounting/customer-invoices"), true);
    assert.equal(canCreateRecord("accounting/customer-invoices"), true);
  });

  it("filters partner + multi-line payload", () => {
    assert.deepEqual(
      filterInvoiceCreateValues("accounting/customer-invoices", {
        partnerId: "6",
        lines: [
          { productId: 42, qty: "2", price: "100" },
          { productId: 7, qty: 1 },
        ],
      }),
      {
        partnerId: 6,
        lines: [
          { productId: 42, qty: 2, price: 100 },
          { productId: 7, qty: 1 },
        ],
      }
    );
  });

  it("rejects missing partner or lines", () => {
    assert.equal(
      filterInvoiceCreateValues("accounting/customer-invoices", {
        lines: [{ productId: 1, qty: 1 }],
      }),
      null
    );
    assert.equal(
      filterInvoiceCreateValues("sales/quotations", {
        partnerId: 1,
        lines: [{ productId: 1, qty: 1 }],
      }),
      null
    );
  });
});

describe("publishInvoiceDestError", () => {
  it("allows CF without vat", () => {
    assert.equal(
      publishInvoiceDestError({ sg_invoice_dest: "cf", vat: "" }),
      null
    );
  });

  it("requires vat then address for CUIT", () => {
    assert.equal(
      publishInvoiceDestError({ sg_invoice_dest: "cuit", vat: "" }),
      PUBLISH_CUIT_VAT_MSG
    );
    assert.equal(
      publishInvoiceDestError({
        sg_invoice_dest: "cuit",
        vat: "20123456789",
        street: "",
        city: "",
      }),
      PUBLISH_CUIT_ADDRESS_MSG
    );
    assert.equal(
      publishInvoiceDestError({
        sg_invoice_dest: "cuit",
        vat: "20123456789",
        street: "Calle 1",
        city: "CABA",
      }),
      null
    );
  });
});
