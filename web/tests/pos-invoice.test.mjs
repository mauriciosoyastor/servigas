import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canCreateInvoiceFromPos,
  isPosOrderReadyToInvoice,
} from "../src/lib/shell/pos-invoice.ts";

describe("pos-invoice allowlist", () => {
  it("allows ventas-caja only", () => {
    assert.equal(canCreateInvoiceFromPos("sales/ventas-caja"), true);
    assert.equal(canCreateInvoiceFromPos("sales/pos-orders"), true);
    assert.equal(canCreateInvoiceFromPos("sales/orders"), false);
  });

  it("requires paid/done state", () => {
    assert.equal(isPosOrderReadyToInvoice("paid"), true);
    assert.equal(isPosOrderReadyToInvoice("done"), true);
    assert.equal(isPosOrderReadyToInvoice("draft"), false);
    assert.equal(isPosOrderReadyToInvoice("invoiced"), false);
  });
});
