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
  const raw = String(state || "").trim().toLowerCase();
  if (POS_INVOICEABLE_STATES.has(raw)) return true;
  // Labels localizados en ficha (por si llega el texto y no el key).
  return raw === "pagado" || raw === "hecho" || raw === "done";
}

/** True when the POS order already has a real customer assigned. */
export function hasPosOrderPartner(
  partnerValue: string | number | boolean | null | undefined
): boolean {
  if (partnerValue == null || partnerValue === false) return false;
  if (typeof partnerValue === "number") return partnerValue > 0;
  const raw = String(partnerValue).trim().toLowerCase();
  if (!raw || raw === "false" || raw === "no" || raw === "0") return false;
  return true;
}
