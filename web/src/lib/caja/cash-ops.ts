import type { CashFeedItem } from "./cash-feed.ts";

export type CashFeedFilter = "all" | "cash" | "transfer" | "card" | "manual";

export type CashAlert = {
  code: "open_too_long" | "high_cash_no_bank";
  message: string;
};

export type CashCloseInput = {
  countedAmount: number;
  expectedCash: number;
  bankDeposit: number;
  leaveFloat: number;
  differenceNote?: string | null;
};

export type CashCloseValidation =
  | { ok: true }
  | { ok: false; error: string };

function roundCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function filterCashFeed<T extends CashFeedItem>(
  items: T[],
  filter: CashFeedFilter
): T[] {
  if (filter === "all") return items;
  if (filter === "manual") {
    return items.filter(
      (item) => item.kind === "manual_in" || item.kind === "manual_out"
    );
  }
  return items.filter((item) => item.medium === filter);
}

export function validateCashClose(input: CashCloseInput): CashCloseValidation {
  const counted = Number(input.countedAmount);
  const expected = Number(input.expectedCash);
  const deposit = Number(input.bankDeposit);
  const leave = Number(input.leaveFloat);
  if (!Number.isFinite(counted) || counted < 0) {
    return { ok: false, error: "El efectivo contado no puede ser negativo" };
  }
  if (!Number.isFinite(deposit) || deposit < 0) {
    return { ok: false, error: "El depósito al banco no puede ser negativo" };
  }
  if (!Number.isFinite(leave) || leave < 0) {
    return { ok: false, error: "El fondo a dejar no puede ser negativo" };
  }
  if (roundCents(deposit + leave) > roundCents(counted) + 0.001) {
    return {
      ok: false,
      error: "Depósito + fondo a dejar no pueden superar el efectivo contado",
    };
  }
  const diff = roundCents(counted - expected);
  if (Math.abs(diff) > 0.01) {
    const note = String(input.differenceNote || "").trim();
    if (!note) {
      return {
        ok: false,
        error: "Justificá la diferencia de caja (faltante o sobrante)",
      };
    }
  }
  return { ok: true };
}

export function suggestedBankWithdraw(
  expectedCash: number,
  targetFloat: number
): number {
  return Math.max(0, roundCents((Number(expectedCash) || 0) - (Number(targetFloat) || 0)));
}

export function buildCashAlerts(input: {
  openedAt: string;
  expectedCash: number;
  cashThreshold: number;
  openHoursThreshold: number;
  feed: CashFeedItem[];
  now?: Date;
}): CashAlert[] {
  const alerts: CashAlert[] = [];
  const now = input.now || new Date();
  const opened = new Date(input.openedAt);
  const hoursOpen =
    (now.getTime() - opened.getTime()) / (1000 * 60 * 60);
  if (Number.isFinite(hoursOpen) && hoursOpen >= input.openHoursThreshold) {
    alerts.push({
      code: "open_too_long",
      message: `La caja lleva más de ${input.openHoursThreshold} h abierta`,
    });
  }

  const hasBankWithdraw = input.feed.some(
    (item) =>
      item.kind === "manual_out" &&
      /retiro al banco/i.test(String(item.label || ""))
  );
  if (
    (Number(input.expectedCash) || 0) >= input.cashThreshold &&
    !hasBankWithdraw
  ) {
    alerts.push({
      code: "high_cash_no_bank",
      message: "Hay mucho efectivo esperado y todavía no hay retiro al banco",
    });
  }
  return alerts;
}

const OWNER_GROUPS = new Set([
  "base.group_system",
  "account.group_account_manager",
]);

export function canOwnerWithdraw(groups: string[]): boolean {
  return (groups || []).some((g) => OWNER_GROUPS.has(g));
}

export const CASH_SHIFTS = [
  { code: "manana", label: "Mañana" },
  { code: "tarde", label: "Tarde" },
  { code: "noche", label: "Noche" },
] as const;

export type CashShiftCode = (typeof CASH_SHIFTS)[number]["code"];

export function resolveCashShift(
  code: string | null | undefined
): CashShiftCode | null {
  const normalized = String(code || "").trim();
  return CASH_SHIFTS.some((s) => s.code === normalized)
    ? (normalized as CashShiftCode)
    : null;
}
