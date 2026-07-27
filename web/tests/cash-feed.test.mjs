import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifyJournalMedium,
  classifyPosPaymentMedium,
  mergeCashFeed,
  summarizeCash,
} from "../src/lib/caja/cash-feed.ts";

describe("cash feed", () => {
  it("merges items newest first", () => {
    const merged = mergeCashFeed([
      {
        id: "a",
        at: "2026-07-26T10:00:00Z",
        kind: "manual_in",
        medium: "cash",
        amount: 100,
        label: "A",
      },
      {
        id: "b",
        at: "2026-07-26T12:00:00Z",
        kind: "pos_sale",
        medium: "cash",
        amount: 50,
        label: "B",
      },
    ]);
    assert.equal(merged[0].id, "b");
    assert.equal(merged[1].id, "a");
  });

  it("computes expected cash from opening + cash in - cash out", () => {
    const summary = summarizeCash(50000, [
      {
        id: "1",
        at: "2026-07-26T10:00:00Z",
        kind: "pos_sale",
        medium: "cash",
        amount: 12000,
        label: "POS",
      },
      {
        id: "2",
        at: "2026-07-26T11:00:00Z",
        kind: "payment_in",
        medium: "transfer",
        amount: 8000,
        label: "FC",
      },
      {
        id: "3",
        at: "2026-07-26T12:00:00Z",
        kind: "manual_out",
        medium: "cash",
        amount: 5000,
        label: "Retiro",
      },
      {
        id: "4",
        at: "2026-07-26T13:00:00Z",
        kind: "payment_out",
        medium: "cash",
        amount: 2000,
        label: "FP",
      },
    ]);
    assert.equal(summary.openingBalance, 50000);
    assert.equal(summary.cashIn, 12000);
    assert.equal(summary.cashOut, 7000);
    assert.equal(summary.expectedCash, 55000);
    assert.equal(summary.transferTotal, 8000);
    assert.equal(summary.movementCount, 4);
  });

  it("classifies journals and POS methods", () => {
    assert.equal(classifyJournalMedium("cash", "Caja"), "cash");
    assert.equal(classifyJournalMedium("bank", "Banco Galicia"), "transfer");
    assert.equal(classifyJournalMedium("bank", "Tarjeta Visa"), "card");
    assert.equal(classifyPosPaymentMedium(true, "Cash"), "cash");
    assert.equal(classifyPosPaymentMedium(false, "Card"), "card");
    assert.equal(classifyPosPaymentMedium(false, "Transferencia"), "transfer");
    assert.equal(classifyPosPaymentMedium(false, "Mercado Pago"), "transfer");
    assert.equal(classifyPosPaymentMedium(false, "Débito"), "card");
  });
});
