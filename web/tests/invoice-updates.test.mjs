import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canUpdateInvoiceDraft,
  filterInvoiceDraftUpdateValues,
} from "../src/lib/shell/invoice-updates.ts";

describe("invoice-updates allowlist", () => {
  it("allows the same keys as invoice create", () => {
    assert.equal(canUpdateInvoiceDraft("accounting/customer-invoices"), true);
    assert.equal(canUpdateInvoiceDraft("accounting/credit-notes"), true);
    assert.equal(canUpdateInvoiceDraft("accounting/vendor-bills"), true);
    assert.equal(canUpdateInvoiceDraft("accounting/vendor-refunds"), true);
    assert.equal(canUpdateInvoiceDraft("accounting/drafts"), false);
  });

  it("filters partner + lines for FC", () => {
    const filtered = filterInvoiceDraftUpdateValues(
      "accounting/customer-invoices",
      {
        partnerId: 6,
        lines: [{ productId: 42, qty: 2, price: 100, discount: 5 }],
      }
    );
    assert.deepEqual(filtered, {
      partnerId: 6,
      lines: [{ productId: 42, qty: 2, price: 100, discount: 5 }],
    });
  });

  it("allows FP update without attachment", () => {
    const filtered = filterInvoiceDraftUpdateValues("accounting/vendor-bills", {
      partnerId: 8,
      lines: [{ productId: 1, qty: 1 }],
      billSource: "mail",
    });
    assert.ok(filtered);
    assert.equal(filtered.partnerId, 8);
    assert.equal(filtered.billSource, "mail");
    assert.equal(filtered.attachment, undefined);
  });

  it("rejects missing partner or lines", () => {
    assert.equal(
      filterInvoiceDraftUpdateValues("accounting/customer-invoices", {
        lines: [{ productId: 1, qty: 1 }],
      }),
      null
    );
    assert.equal(
      filterInvoiceDraftUpdateValues("accounting/customer-invoices", {
        partnerId: 6,
        lines: [],
      }),
      null
    );
  });
});
