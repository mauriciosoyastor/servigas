import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PAYMENT_METHOD_OPTIONS,
  canRegisterPayment,
  filterPaymentRegisterValues,
  getPaymentRegisterDef,
  isPaymentRegisterableState,
  pickJournalId,
} from "../src/lib/shell/payment-registers.ts";

describe("payment-registers allowlist", () => {
  it("allows FC and FP payment lists", () => {
    for (const key of [
      "accounting/customer-invoices",
      "accounting/receivable",
      "accounting/vendor-bills",
      "accounting/payable",
    ]) {
      assert.equal(canRegisterPayment(key), true);
      assert.ok(getPaymentRegisterDef(key));
    }
    assert.equal(canRegisterPayment("accounting/credit-notes"), false);
    assert.equal(canRegisterPayment("accounting/drafts"), false);
  });

  it("lists the same payment media as Mostrador", () => {
    assert.deepEqual(
      PAYMENT_METHOD_OPTIONS.map((option) => option.label),
      [
        "Efectivo",
        "Transferencia / depósito al banco",
        "Cuenta corriente",
        "Débito",
        "Mercado Pago",
      ]
    );
    assert.deepEqual(
      PAYMENT_METHOD_OPTIONS.map((option) => option.value),
      ["cash", "transfer", "account", "debit", "mercadopago"]
    );
  });

  it("requires payment method and filters optional amount", () => {
    assert.equal(
      filterPaymentRegisterValues("accounting/customer-invoices", {}),
      null
    );
    assert.deepEqual(
      filterPaymentRegisterValues("accounting/customer-invoices", {
        paymentMethod: "cash",
      }),
      { paymentMethod: "cash" }
    );
    assert.deepEqual(
      filterPaymentRegisterValues("accounting/customer-invoices", {
        paymentMethod: "transfer",
        amount: "150.5",
      }),
      { paymentMethod: "transfer", amount: 150.5 }
    );
    assert.deepEqual(
      filterPaymentRegisterValues("accounting/customer-invoices", {
        paymentMethod: "mercadopago",
      }),
      { paymentMethod: "mercadopago" }
    );
    assert.deepEqual(
      filterPaymentRegisterValues("accounting/customer-invoices", {
        paymentMethod: "card",
      }),
      { paymentMethod: "debit" }
    );
    assert.equal(
      filterPaymentRegisterValues("accounting/customer-invoices", {
        paymentMethod: "cash",
        amount: 0,
      }),
      null
    );
    assert.equal(
      filterPaymentRegisterValues("accounting/drafts", {
        paymentMethod: "cash",
        amount: 10,
      }),
      null
    );
  });

  it("gates by posted + unpaid payment states", () => {
    assert.equal(isPaymentRegisterableState("posted", "not_paid"), true);
    assert.equal(isPaymentRegisterableState("posted", "partial"), true);
    assert.equal(isPaymentRegisterableState("posted", "in_payment"), true);
    assert.equal(isPaymentRegisterableState("posted", "paid"), false);
    assert.equal(isPaymentRegisterableState("draft", "not_paid"), false);
  });

  it("picks journals by method hints", () => {
    const journals = [
      { id: 1, name: "Caja", type: "cash" },
      { id: 2, name: "Banco Galicia", type: "bank" },
      { id: 3, name: "Tarjeta Mercado Pago", type: "bank" },
      { id: 4, name: "Transferencias", type: "bank" },
      { id: 5, name: "Débito", type: "bank" },
      { id: 6, name: "Cuenta corriente clientes", type: "bank" },
    ];
    assert.equal(pickJournalId("cash", journals), 1);
    assert.equal(pickJournalId("transfer", journals), 4);
    assert.equal(pickJournalId("mercadopago", journals), 3);
    assert.equal(pickJournalId("debit", journals), 5);
    assert.equal(pickJournalId("account", journals), 6);
    assert.equal(pickJournalId("cash", [{ id: 9, name: "Bank", type: "bank" }]), null);
  });
});
