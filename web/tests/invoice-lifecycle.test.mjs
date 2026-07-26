import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canCancelInvoice,
  canResetInvoiceDraft,
  getInvoiceLifecycleMoveType,
  isInvoiceLifecycleReady,
} from "../src/lib/shell/invoice-lifecycle.ts";

describe("invoice-lifecycle", () => {
  it("allowlists FC NC FP vendor NC for reset and cancel", () => {
    for (const key of [
      "accounting/customer-invoices",
      "accounting/credit-notes",
      "accounting/vendor-bills",
      "accounting/vendor-refunds",
    ]) {
      assert.equal(canResetInvoiceDraft(key), true);
      assert.equal(canCancelInvoice(key), true);
    }
    assert.equal(canResetInvoiceDraft("accounting/drafts"), false);
    assert.equal(canCancelInvoice("sales/quotations"), false);
  });

  it("maps list keys to move_type", () => {
    assert.equal(
      getInvoiceLifecycleMoveType("accounting/customer-invoices"),
      "out_invoice"
    );
    assert.equal(
      getInvoiceLifecycleMoveType("accounting/credit-notes"),
      "out_refund"
    );
    assert.equal(
      getInvoiceLifecycleMoveType("accounting/vendor-bills"),
      "in_invoice"
    );
    assert.equal(
      getInvoiceLifecycleMoveType("accounting/vendor-refunds"),
      "in_refund"
    );
    assert.equal(getInvoiceLifecycleMoveType("accounting/drafts"), null);
  });

  it("gates lifecycle on posted + not_paid", () => {
    assert.equal(isInvoiceLifecycleReady("posted", "not_paid"), true);
    assert.equal(isInvoiceLifecycleReady("posted", "paid"), false);
    assert.equal(isInvoiceLifecycleReady("posted", "partial"), false);
    assert.equal(isInvoiceLifecycleReady("posted", "in_payment"), false);
    assert.equal(isInvoiceLifecycleReady("draft", "not_paid"), false);
    assert.equal(isInvoiceLifecycleReady("cancel", "not_paid"), false);
  });
});
