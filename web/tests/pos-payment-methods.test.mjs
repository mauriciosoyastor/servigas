import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { localizePaymentMethodName } from "../src/lib/pos/payment-methods.ts";

describe("pos payment method labels", () => {
  it("translates common Odoo English names to Spanish", () => {
    assert.equal(localizePaymentMethodName("Cash"), "Efectivo");
    assert.equal(localizePaymentMethodName("Card"), "Transferencia");
    assert.equal(localizePaymentMethodName("Customer Account"), "Crédito");
  });

  it("keeps unknown or already-local names", () => {
    assert.equal(localizePaymentMethodName("Efectivo"), "Efectivo");
    assert.equal(localizePaymentMethodName("Visa Débito"), "Visa Débito");
    assert.equal(localizePaymentMethodName("  cash  "), "Efectivo");
  });
});
