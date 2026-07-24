/**
 * Vencimientos (aging) para por cobrar / por pagar.
 * Spec: docs/superpowers/specs/2026-07-24-accounting-ops-prioridad-alta-design.md
 */

export type AgingBucket = "due_today" | "due_week" | "overdue";

export type AgingDateParts = {
  today: string;
  weekEnd: string;
};

/** YYYY-MM-DD en zona local del proceso (dev) / servidor. */
export function formatDateYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function agingDateParts(now: Date = new Date()): AgingDateParts {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return {
    today: formatDateYmd(today),
    weekEnd: formatDateYmd(weekEnd),
  };
}

/** Cláusulas sobre invoice_date_due para un bucket. */
export function agingDueClauses(
  bucket: AgingBucket,
  parts: AgingDateParts = agingDateParts()
): unknown[] {
  if (bucket === "due_today") {
    return [["invoice_date_due", "=", parts.today]];
  }
  if (bucket === "due_week") {
    return [
      ["invoice_date_due", ">=", parts.today],
      ["invoice_date_due", "<=", parts.weekEnd],
    ];
  }
  return [["invoice_date_due", "<", parts.today]];
}

export const UNPAID_PAYMENT_STATES = ["not_paid", "partial", "in_payment"];

export function unpaidMoveDomain(moveType: "out_invoice" | "in_invoice"): unknown[] {
  return [
    ["move_type", "=", moveType],
    ["state", "=", "posted"],
    ["payment_state", "in", UNPAID_PAYMENT_STATES],
  ];
}
