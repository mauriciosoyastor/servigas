import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { GET as getAlerts, POST as postAlerts } from "../src/pages/api/settings/alerts.ts";
import { GET as getLowStockCount } from "../src/pages/api/inventory/low-stock-count.ts";
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

describe("settings alerts API", () => {
  it("GET returns alert settings from backend", async () => {
    const cookies = new FakeCookies();
    const sid = sessionStore.create("odoo", {
      uid: 2,
      name: "Admin",
      login: "admin",
    });
    cookies.values.set(BFF_COOKIE, sid);
    __setBackendForTests({
      async getAlertSettings() {
        return {
          cashThreshold: 150000,
          openHoursThreshold: 8,
          stockAlertsEnabled: false,
          stockMinQty: 0,
        };
      },
    });
    try {
      const res = await getAlerts({ cookies });
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), {
        cashThreshold: 150000,
        openHoursThreshold: 8,
        stockAlertsEnabled: false,
        stockMinQty: 0,
      });
    } finally {
      __setBackendForTests(undefined);
      sessionStore.destroy(sid);
    }
  });

  it("POST updates alert settings", async () => {
    const cookies = new FakeCookies();
    const sid = sessionStore.create("odoo", {
      uid: 2,
      name: "Admin",
      login: "admin",
    });
    cookies.values.set(BFF_COOKIE, sid);
    let saved = null;
    __setBackendForTests({
      async updateAlertSettings(_s, values) {
        saved = values;
        return {
          cashThreshold: 90000,
          openHoursThreshold: 10,
          stockAlertsEnabled: true,
          stockMinQty: 5,
        };
      },
    });
    try {
      const res = await postAlerts({
        cookies,
        request: {
          json: async () => ({
            cashThreshold: 90000,
            openHoursThreshold: 10,
            stockAlertsEnabled: true,
            stockMinQty: 5,
          }),
        },
      });
      assert.equal(res.status, 200);
      assert.deepEqual(saved, {
        cashThreshold: 90000,
        openHoursThreshold: 10,
        stockAlertsEnabled: true,
        stockMinQty: 5,
      });
    } finally {
      __setBackendForTests(undefined);
      sessionStore.destroy(sid);
    }
  });
});

describe("low-stock count API", () => {
  it("GET proxies countLowStockProducts", async () => {
    const cookies = new FakeCookies();
    const sid = sessionStore.create("odoo", {
      uid: 2,
      name: "Admin",
      login: "admin",
    });
    cookies.values.set(BFF_COOKIE, sid);
    __setBackendForTests({
      async countLowStockProducts() {
        return { count: 3, capped: false };
      },
    });
    try {
      const res = await getLowStockCount({ cookies });
      assert.equal(res.status, 200);
      assert.deepEqual(await res.json(), { count: 3, capped: false });
    } finally {
      __setBackendForTests(undefined);
      sessionStore.destroy(sid);
    }
  });
});
