import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  filterCashFeed,
  resolveCashFeedFilter,
  cajaFeedHref,
  suggestedBankWithdraw,
  validateCashClose,
  buildCashAlerts,
  canOwnerWithdraw,
} from "../src/lib/caja/cash-ops.ts";

const feed = [
  {
    id: "1",
    at: "2026-07-26T10:00:00Z",
    kind: "pos_sale",
    medium: "cash",
    amount: 100,
    label: "POS cash",
  },
  {
    id: "2",
    at: "2026-07-26T11:00:00Z",
    kind: "pos_sale",
    medium: "transfer",
    amount: 50,
    label: "POS transfer",
  },
  {
    id: "3",
    at: "2026-07-26T12:00:00Z",
    kind: "manual_out",
    medium: "cash",
    amount: 20,
    label: "Retiro al banco",
  },
  {
    id: "4",
    at: "2026-07-26T13:00:00Z",
    kind: "payment_in",
    medium: "card",
    amount: 80,
    label: "Cobro",
    href: "/lists/accounting/payments/9",
  },
];

describe("cash feed filters", () => {
  it("filters by medium and manual kinds", () => {
    assert.equal(filterCashFeed(feed, "all").length, 4);
    assert.equal(filterCashFeed(feed, "cash").length, 2);
    assert.equal(filterCashFeed(feed, "transfer").length, 1);
    assert.equal(filterCashFeed(feed, "card").length, 1);
    assert.equal(filterCashFeed(feed, "manual").length, 1);
  });

  it("resolves filter query and builds feed href", () => {
    assert.equal(resolveCashFeedFilter(null), "all");
    assert.equal(resolveCashFeedFilter(""), "all");
    assert.equal(resolveCashFeedFilter("manual"), "manual");
    assert.equal(resolveCashFeedFilter("nope"), "all");
    assert.equal(cajaFeedHref("all"), "/caja?filter=all#movimientos");
    assert.equal(cajaFeedHref("cash"), "/caja?filter=cash#movimientos");
    assert.equal(cajaFeedHref("manual"), "/caja?filter=manual#movimientos");
  });
});

describe("cash close validation", () => {
  it("requires difference note when abs(diff) > 0.01", () => {
    assert.deepEqual(
      validateCashClose({
        countedAmount: 100,
        expectedCash: 100,
        bankDeposit: 0,
        leaveFloat: 100,
      }),
      { ok: true }
    );
    const missing = validateCashClose({
      countedAmount: 90,
      expectedCash: 100,
      bankDeposit: 0,
      leaveFloat: 90,
      differenceNote: "  ",
    });
    assert.equal(missing.ok, false);
    assert.match(missing.error || "", /justific/i);

    const ok = validateCashClose({
      countedAmount: 90,
      expectedCash: 100,
      bankDeposit: 0,
      leaveFloat: 90,
      differenceNote: "Faltante por vuelto mal dado",
    });
    assert.equal(ok.ok, true);
  });

  it("rejects negative deposit/float and deposit+float above counted", () => {
    const bad = validateCashClose({
      countedAmount: 100,
      expectedCash: 100,
      bankDeposit: 80,
      leaveFloat: 30,
    });
    assert.equal(bad.ok, false);
    assert.match(bad.error || "", /contado/i);
  });
});

describe("suggested bank withdraw", () => {
  it("suggests excess over target float", () => {
    assert.equal(suggestedBankWithdraw(55000, 10000), 45000);
    assert.equal(suggestedBankWithdraw(8000, 10000), 0);
  });
});

describe("cash alerts", () => {
  it("flags long open session and high cash without bank withdraw", () => {
    const openedAt = new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString();
    const alerts = buildCashAlerts({
      openedAt,
      expectedCash: 150000,
      cashThreshold: 100000,
      openHoursThreshold: 12,
      feed,
      now: new Date(),
    });
    assert.ok(alerts.some((a) => a.code === "open_too_long"));
    // feed has bank withdraw labeled Retiro al banco — should NOT alert high cash
    assert.ok(!alerts.some((a) => a.code === "high_cash_no_bank"));

    const noBank = buildCashAlerts({
      openedAt: new Date().toISOString(),
      expectedCash: 150000,
      cashThreshold: 100000,
      openHoursThreshold: 12,
      feed: feed.filter((f) => f.id !== "3"),
      now: new Date(),
    });
    assert.ok(noBank.some((a) => a.code === "high_cash_no_bank"));
  });
});

describe("owner withdraw permission", () => {
  it("allows system or account manager groups", () => {
    assert.equal(canOwnerWithdraw(["base.group_user"]), false);
    assert.equal(canOwnerWithdraw(["account.group_account_manager"]), true);
    assert.equal(canOwnerWithdraw(["base.group_system"]), true);
  });
});
