/**
 * Allowlist: crear FC desde pedido de venta (fase 2b).
 * Spec: docs/superpowers/specs/2026-07-24-fc-from-sale-order-design.md
 */

import { getRecordListDef, resolveRecordListKey } from "./record-lists.ts";

const ORDER_INVOICE_KEYS = new Set([
  "sales/orders",
  "sales/to-invoice",
]);

export const TO_INVOICE_STATUS = "to invoice";

export function canCreateInvoiceFromOrder(listKey: string): boolean {
  const key = resolveRecordListKey(listKey) || listKey;
  if (!ORDER_INVOICE_KEYS.has(key)) return false;
  return Boolean(getRecordListDef(key));
}

export function isOrderReadyToInvoice(
  invoiceStatus: string | null | undefined
): boolean {
  return String(invoiceStatus || "").trim() === TO_INVOICE_STATUS;
}
