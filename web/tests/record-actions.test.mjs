import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canConfirmRecord,
  getRecordActionDef,
  isConfirmableState,
} from "../src/lib/shell/record-actions.ts";

describe("record-actions allowlist", () => {
  it("allows confirming quotations and solicitudes", () => {
    const quote = getRecordActionDef("sales/quotations");
    assert.ok(quote);
    assert.equal(quote.model, "sale.order");
    assert.equal(quote.method, "action_confirm");
    assert.equal(canConfirmRecord("sales/quotations"), true);
    const rfq = getRecordActionDef("purchase/solicitudes");
    assert.ok(rfq);
    assert.equal(rfq.method, "button_confirm");
    assert.equal(canConfirmRecord("purchase/solicitudes"), true);
  });

  it("allows validating inventory transfers", () => {
    const transfer = getRecordActionDef("inventory/transfers");
    assert.ok(transfer);
    assert.equal(transfer.model, "stock.picking");
    assert.equal(transfer.method, "button_validate");
    assert.equal(canConfirmRecord("inventory/transfers"), true);
    assert.equal(isConfirmableState("inventory/transfers", "assigned"), true);
    assert.equal(isConfirmableState("inventory/transfers", "confirmed"), true);
    assert.equal(isConfirmableState("inventory/transfers", "waiting"), true);
    assert.equal(isConfirmableState("inventory/transfers", "done"), false);
  });

  it("rejects products and confirmed sales orders lists", () => {
    assert.equal(getRecordActionDef("inventory/products"), null);
    assert.equal(canConfirmRecord("sales/orders"), false);
  });

  it("gates confirm by state", () => {
    assert.equal(isConfirmableState("sales/quotations", "draft"), true);
    assert.equal(isConfirmableState("sales/quotations", "sent"), true);
    assert.equal(isConfirmableState("sales/quotations", "sale"), false);
    assert.equal(isConfirmableState("purchase/solicitudes-borrador", "sent"), false);
  });
});
