import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canConfirmRecord,
  getRecordActionDef,
  isConfirmableState,
} from "../src/lib/shell/record-actions.ts";

describe("record-actions allowlist", () => {
  it("allows confirming quotations and RFQ", () => {
    const quote = getRecordActionDef("sales/quotations");
    assert.ok(quote);
    assert.equal(quote.model, "sale.order");
    assert.equal(quote.method, "action_confirm");
    assert.equal(canConfirmRecord("sales/quotations"), true);
    assert.equal(canConfirmRecord("purchase/rfq"), true);
  });

  it("rejects products and confirmed sales orders lists", () => {
    assert.equal(getRecordActionDef("inventory/products"), null);
    assert.equal(canConfirmRecord("sales/orders"), false);
  });

  it("gates confirm by state", () => {
    assert.equal(isConfirmableState("sales/quotations", "draft"), true);
    assert.equal(isConfirmableState("sales/quotations", "sent"), true);
    assert.equal(isConfirmableState("sales/quotations", "sale"), false);
    assert.equal(isConfirmableState("purchase/rfq-draft", "sent"), false);
  });
});
