import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canCreateInvoiceFromOrder,
  isOrderReadyToInvoice,
  TO_INVOICE_STATUS,
} from "../src/lib/shell/order-invoice.ts";

describe("order-invoice allowlist", () => {
  it("allows sales orders and to-invoice lists", () => {
    assert.equal(canCreateInvoiceFromOrder("sales/orders"), true);
    assert.equal(canCreateInvoiceFromOrder("sales/to-invoice"), true);
    assert.equal(canCreateInvoiceFromOrder("sales/quotations"), false);
    assert.equal(canCreateInvoiceFromOrder("accounting/customer-invoices"), false);
  });

  it("detects to invoice status", () => {
    assert.equal(isOrderReadyToInvoice(TO_INVOICE_STATUS), true);
    assert.equal(isOrderReadyToInvoice("invoiced"), false);
    assert.equal(isOrderReadyToInvoice(""), false);
  });
});
