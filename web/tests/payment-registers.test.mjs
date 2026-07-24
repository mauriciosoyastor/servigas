import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canRegisterPayment,
  filterPaymentRegisterValues,
  getPaymentRegisterDef,
  isPaymentRegisterableState,
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

  it("filters optional amount", () => {
    assert.deepEqual(
      filterPaymentRegisterValues("accounting/customer-invoices", {}),
      {}
    );
    assert.deepEqual(
      filterPaymentRegisterValues("accounting/customer-invoices", {
        amount: "150.5",
      }),
      { amount: 150.5 }
    );
    assert.equal(
      filterPaymentRegisterValues("accounting/customer-invoices", {
        amount: 0,
      }),
      null
    );
    assert.equal(
      filterPaymentRegisterValues("accounting/drafts", { amount: 10 }),
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
});
