/**
 * Reset / cancel posted invoices (P1.1).
 * Spec: 2026-07-25-invoice-reset-cancel-design.md
 */

import { resolveRecordListKey } from "./record-lists.ts";

const LIFECYCLE_KEYS = new Map<string, string>([
  ["accounting/customer-invoices", "out_invoice"],
  ["accounting/credit-notes", "out_refund"],
  ["accounting/vendor-bills", "in_invoice"],
  ["accounting/vendor-refunds", "in_refund"],
]);

function canonical(listKey: string): string {
  return resolveRecordListKey(listKey) || listKey;
}

export function canResetInvoiceDraft(listKey: string): boolean {
  return LIFECYCLE_KEYS.has(canonical(listKey));
}

export function canCancelInvoice(listKey: string): boolean {
  return canResetInvoiceDraft(listKey);
}

export function getInvoiceLifecycleMoveType(listKey: string): string | null {
  return LIFECYCLE_KEYS.get(canonical(listKey)) ?? null;
}

export function isInvoiceLifecycleReady(
  state: string | null | undefined,
  paymentState: string | null | undefined
): boolean {
  return (
    String(state || "") === "posted" &&
    String(paymentState || "") === "not_paid"
  );
}
