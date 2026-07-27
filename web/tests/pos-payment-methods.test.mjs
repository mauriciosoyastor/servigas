import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatPosOrderPaymentLabel,
  localizePaymentMethodName,
} from "../src/lib/pos/payment-methods.ts";

describe("pos payment method labels", () => {
  it("maps common Odoo English names to Spanish", () => {
    assert.equal(localizePaymentMethodName("Cash"), "Efectivo");
    assert.equal(
      localizePaymentMethodName("Card"),
      "Transferencia / depósito al banco"
    );
    assert.equal(
      localizePaymentMethodName("Customer Account"),
      "Cuenta corriente"
    );
    assert.equal(localizePaymentMethodName("Crédito"), "Cuenta corriente");
    assert.equal(localizePaymentMethodName("Débito"), "Débito");
    assert.equal(localizePaymentMethodName("Mercado Pago"), "Mercado Pago");
  });

  it("keeps unknown or already-local names", () => {
    assert.equal(localizePaymentMethodName("Efectivo"), "Efectivo");
    assert.equal(localizePaymentMethodName("Visa Débito"), "Visa Débito");
    assert.equal(localizePaymentMethodName("  cash  "), "Efectivo");
    assert.equal(
      localizePaymentMethodName("Transferencia"),
      "Transferencia / depósito al banco"
    );
  });

  it("formats order payment methods as a localized unique label", () => {
    assert.equal(formatPosOrderPaymentLabel([]), "");
    assert.equal(
      formatPosOrderPaymentLabel(["Customer Account"]),
      "Cuenta corriente"
    );
    assert.equal(
      formatPosOrderPaymentLabel(["Cash", "Cash", "Card"]),
      "Efectivo · Transferencia / depósito al banco"
    );
  });
});
