/**
 * Allowlist: crear FC desde venta de caja (pos.order).
 * Spec: docs/superpowers/specs/2026-07-24-fw-pos-nc-prov-design.md
 */

import { getRecordListDef, resolveRecordListKey } from "./record-lists.ts";

const POS_INVOICE_KEYS = new Set(["sales/ventas-caja"]);

/** Estados POS facturables (cobrada). */
export const POS_INVOICEABLE_STATES = new Set(["paid", "done"]);

export function canCreateInvoiceFromPos(listKey: string): boolean {
  const key = resolveRecordListKey(listKey) || listKey;
  if (!POS_INVOICE_KEYS.has(key)) return false;
  return Boolean(getRecordListDef(key));
}

export function isPosOrderReadyToInvoice(
  state: string | null | undefined
): boolean {
  return POS_INVOICEABLE_STATES.has(String(state || "").trim());
}
