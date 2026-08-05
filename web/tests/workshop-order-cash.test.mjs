import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  WORKSHOP_ORDER_CASH_MOTIVE,
  buildWorkOrderCashNote,
  canCollectWorkOrderCash,
  canRegisterWorkOrderCash,
  normalizeWorkOrderCashMedium,
  workOrderCashFeedHref,
  workOrderCashFeedLabel,
  workOrderCashRemaining,
} from "../src/lib/shell/workshop-order-cash.ts";
import { POST as postCollectCash } from "../src/pages/api/workshop-orders/collect-cash.ts";
import { BFF_COOKIE, sessionStore } from "../src/lib/bff/session-store.ts";
import { __setBackendForTests } from "../src/lib/bff/get-backend.ts";

class FakeCookies {
  values = new Map();
  get(name) {
    const value = this.values.get(name);
    return value === undefined ? undefined : { value };
  }
  set(name, value) {
    this.values.set(name, value);
  }
  delete(name) {
    this.values.delete(name);
  }
}

describe("workshop-order-cash helpers", () => {
  it("locks motive code and builds note with order name", () => {
    assert.equal(WORKSHOP_ORDER_CASH_MOTIVE, "cobro_ot");
    assert.equal(
      buildWorkOrderCashNote("OT/2026-08-04/0012", 12),
      "OT/2026-08-04/0012"
    );
  });

  it("normalizes payment media for caja feed", () => {
    assert.equal(normalizeWorkOrderCashMedium("cash"), "cash");
    assert.equal(normalizeWorkOrderCashMedium("transfer"), "transfer");
    assert.equal(normalizeWorkOrderCashMedium("card"), "card");
    assert.equal(normalizeWorkOrderCashMedium("debit"), "card");
    assert.equal(normalizeWorkOrderCashMedium("mercadopago"), "transfer");
    assert.equal(normalizeWorkOrderCashMedium("account"), "transfer");
    assert.equal(normalizeWorkOrderCashMedium("nope"), null);
  });

  it("builds feed label and href", () => {
    assert.equal(
      workOrderCashFeedLabel("OT/2026-08-04/0012"),
      "Taller · OT/2026-08-04/0012"
    );
    assert.equal(workOrderCashFeedHref(12), "/lists/workshop/orders/12");
    assert.equal(workOrderCashFeedHref(0), null);
  });

  it("allowlists workshop/orders for cash collect", () => {
    assert.equal(canCollectWorkOrderCash("workshop/orders"), true);
    assert.equal(canCollectWorkOrderCash("sales/customers"), false);
  });

  it("computes remaining and blocks over-collection", () => {
    assert.equal(workOrderCashRemaining(1000, 0), 1000);
    assert.equal(workOrderCashRemaining(1000, 400), 600);
    assert.equal(workOrderCashRemaining(1000, 1000), 0);
    assert.equal(workOrderCashRemaining(1000, 1200), 0);
    assert.equal(workOrderCashRemaining(0, 0), null);
    assert.equal(canRegisterWorkOrderCash(1000, 0, 500), true);
    assert.equal(canRegisterWorkOrderCash(1000, 600, 500), false);
    assert.equal(canRegisterWorkOrderCash(1000, 1000, 1), false);
    assert.equal(canRegisterWorkOrderCash(0, 0, 100), true);
    assert.equal(canRegisterWorkOrderCash(0, 50, 10), false);
  });
});

describe("workshop-order collect-cash API", () => {
  it("POST proxies collectWorkOrderCash", async () => {
    const cookies = new FakeCookies();
    const bffSid = sessionStore.create("odoo-sess", {
      uid: 2,
      name: "Admin",
      login: "admin",
    });
    cookies.values.set(BFF_COOKIE, bffSid);
    __setBackendForTests({
      async collectWorkOrderCash(_session, listKey, id, input) {
        assert.equal(listKey, "workshop/orders");
        assert.equal(id, 12);
        assert.equal(input.amount, 400);
        assert.equal(input.paymentMethod, "cash");
        return { id: 501, kind: "in", amount: 400 };
      },
    });
    try {
      const response = await postCollectCash({
        cookies,
        request: {
          json: async () => ({
            listKey: "workshop/orders",
            id: 12,
            amount: 400,
            paymentMethod: "cash",
          }),
        },
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        id: 501,
        kind: "in",
        amount: 400,
      });
    } finally {
      __setBackendForTests(undefined);
      sessionStore.destroy(bffSid);
    }
  });

  it("rejects disallowed listKey with 404", async () => {
    const cookies = new FakeCookies();
    const bffSid = sessionStore.create("odoo-sess", {
      uid: 2,
      name: "Admin",
      login: "admin",
    });
    cookies.values.set(BFF_COOKIE, bffSid);
    __setBackendForTests({
      async collectWorkOrderCash() {
        throw new Error("should not call backend");
      },
    });
    try {
      const response = await postCollectCash({
        cookies,
        request: {
          json: async () => ({
            listKey: "sales/customers",
            id: 12,
            amount: 10,
            paymentMethod: "cash",
          }),
        },
      });
      assert.equal(response.status, 404);
    } finally {
      __setBackendForTests(undefined);
      sessionStore.destroy(bffSid);
    }
  });
});
