import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveAccountingMoveDetailPath } from "../src/lib/shell/accounting-move-detail.ts";

describe("resolveAccountingMoveDetailPath", () => {
  it("routes invoice move types to specialized fichas", () => {
    assert.equal(
      resolveAccountingMoveDetailPath("out_invoice", 55),
      "/lists/accounting/customer-invoices/55"
    );
    assert.equal(
      resolveAccountingMoveDetailPath("in_invoice", 66),
      "/lists/accounting/vendor-bills/66"
    );
    assert.equal(
      resolveAccountingMoveDetailPath("out_refund", 77),
      "/lists/accounting/credit-notes/77"
    );
    assert.equal(
      resolveAccountingMoveDetailPath("in_refund", 88),
      "/lists/accounting/vendor-refunds/88"
    );
  });

  it("returns null for unknown types or bad ids", () => {
    assert.equal(resolveAccountingMoveDetailPath("entry", 1), null);
    assert.equal(resolveAccountingMoveDetailPath("out_invoice", 0), null);
    assert.equal(resolveAccountingMoveDetailPath("out_invoice", NaN), null);
    assert.equal(resolveAccountingMoveDetailPath(null, 10), null);
  });
});
