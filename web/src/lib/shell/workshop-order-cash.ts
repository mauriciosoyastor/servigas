/**
 * Cobro de orden de trabajo → movimiento de caja (opción C).
 */

import type { CashMedium } from "../caja/cash-feed.ts";

export const WORKSHOP_ORDER_CASH_MOTIVE = "cobro_ot" as const;

const WORKSHOP_ORDER_CASH_LIST_KEYS = new Set(["workshop/orders"]);

const MEDIUM_BY_METHOD: Record<string, CashMedium> = {
  cash: "cash",
  transfer: "transfer",
  account: "transfer",
  mercadopago: "transfer",
  card: "card",
  debit: "card",
};

function roundCents(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function canCollectWorkOrderCash(listKey: string): boolean {
  return WORKSHOP_ORDER_CASH_LIST_KEYS.has(String(listKey || "").trim());
}

export function buildWorkOrderCashNote(
  orderName: string,
  _id: number
): string {
  return String(orderName || "").trim() || "OT";
}

export function normalizeWorkOrderCashMedium(
  method: string | null | undefined
): CashMedium | null {
  const key = String(method || "")
    .trim()
    .toLowerCase();
  return MEDIUM_BY_METHOD[key] || null;
}

export function workOrderCashFeedLabel(orderName: string): string {
  const name = String(orderName || "").trim() || "OT";
  return `Taller · ${name}`;
}

export function workOrderCashFeedHref(workOrderId: number): string | null {
  const id = Number(workOrderId);
  if (!Number.isFinite(id) || id <= 0) return null;
  return `/lists/workshop/orders/${id}`;
}

/** Saldo pendiente de cobro; `null` si la OT no tiene importe (cobro libre una vez). */
export function workOrderCashRemaining(
  amount: number,
  amountCollected: number
): number | null {
  const total = Number(amount) || 0;
  const collected = Math.max(0, Number(amountCollected) || 0);
  if (total <= 0) return null;
  return roundCents(Math.max(0, total - collected));
}

/**
 * ¿Se puede registrar este cobro?
 * - Con importe: no superar el restante.
 * - Sin importe: solo el primer cobro (amountCollected == 0).
 */
export function canRegisterWorkOrderCash(
  amount: number,
  amountCollected: number,
  collectAmount: number
): boolean {
  const pay = Number(collectAmount);
  if (!Number.isFinite(pay) || pay <= 0) return false;
  const remaining = workOrderCashRemaining(amount, amountCollected);
  if (remaining == null) {
    return (Number(amountCollected) || 0) <= 0;
  }
  return pay <= remaining + 0.001;
}
