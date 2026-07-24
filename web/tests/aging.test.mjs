import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  agingDateParts,
  agingDueClauses,
  formatDateYmd,
} from "../src/lib/shell/aging.ts";
import {
  buildSearchDomain,
  getRecordListDef,
  resolveRecordListPath,
} from "../src/lib/shell/record-lists.ts";

describe("aging helpers", () => {
  it("formats local YYYY-MM-DD", () => {
    assert.equal(formatDateYmd(new Date(2026, 6, 24)), "2026-07-24");
  });

  it("builds due clauses for buckets", () => {
    const parts = { today: "2026-07-24", weekEnd: "2026-07-31" };
    assert.deepEqual(agingDueClauses("due_today", parts), [
      ["invoice_date_due", "=", "2026-07-24"],
    ]);
    assert.deepEqual(agingDueClauses("due_week", parts), [
      ["invoice_date_due", ">=", "2026-07-24"],
      ["invoice_date_due", "<=", "2026-07-31"],
    ]);
    assert.deepEqual(agingDueClauses("overdue", parts), [
      ["invoice_date_due", "<", "2026-07-24"],
    ]);
  });

  it("exposes aging list defs", () => {
    for (const key of [
      "accounting/receivable-overdue",
      "accounting/receivable-due-today",
      "accounting/receivable-due-week",
      "accounting/payable-overdue",
      "accounting/payable-due-today",
      "accounting/payable-due-week",
    ]) {
      const def = getRecordListDef(key);
      assert.ok(def, key);
      assert.ok(def.agingBucket);
      assert.ok(def.fields.includes("invoice_date_due"));
      assert.ok(def.fields.includes("amount_residual"));
    }
  });

  it("appends aging clauses in buildSearchDomain", () => {
    const def = getRecordListDef("accounting/receivable-overdue");
    assert.ok(def);
    const domain = buildSearchDomain(def, "", new Date(2026, 6, 24));
    assert.ok(
      domain.some(
        (clause) =>
          Array.isArray(clause) &&
          clause[0] === "invoice_date_due" &&
          clause[1] === "<" &&
          clause[2] === "2026-07-24"
      )
    );
  });

  it("routes hub labels to aging lists", () => {
    assert.equal(
      resolveRecordListPath(
        {
          type: "ir.actions.act_window",
          res_model: "account.move",
          domain: [],
        },
        { label: "Vencidas por cobrar" }
      ),
      "/lists/accounting/receivable-overdue"
    );
    assert.equal(
      resolveRecordListPath(
        {
          type: "ir.actions.act_window",
          res_model: "account.move",
          domain: [],
        },
        { label: "Vence hoy por pagar" }
      ),
      "/lists/accounting/payable-due-today"
    );
    assert.equal(
      resolveRecordListPath(
        {
          type: "ir.actions.act_window",
          res_model: "account.move",
          domain: [],
        },
        { label: "Vence esta semana por cobrar" }
      ),
      "/lists/accounting/receivable-due-week"
    );
  });

  it("keeps week end 7 days ahead", () => {
    const parts = agingDateParts(new Date(2026, 6, 24));
    assert.equal(parts.today, "2026-07-24");
    assert.equal(parts.weekEnd, "2026-07-31");
  });
});
