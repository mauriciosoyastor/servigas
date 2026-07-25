/**
 * Allowlisted account.move draft updates (partner + replace lines).
 * Spec: docs/superpowers/specs/2026-07-25-edit-invoice-draft-design.md
 */

import { normalizeBillSource } from "./bill-attachment.ts";
import {
  canCreateInvoice,
  getInvoiceCreateDef,
  type InvoiceCreateValues,
} from "./invoice-creates.ts";
import { filterOrderCreateValues } from "./order-creates.ts";
import { resolveRecordListKey } from "./record-lists.ts";

export function canUpdateInvoiceDraft(listKey: string): boolean {
  return canCreateInvoice(listKey);
}

/**
 * Same partner+lines as create; FP does NOT require attachment on update.
 */
export function filterInvoiceDraftUpdateValues(
  listKey: string,
  values: Record<string, unknown>
): InvoiceCreateValues | null {
  const key = resolveRecordListKey(listKey) || listKey;
  const def = getInvoiceCreateDef(key);
  if (!def) return null;

  const parsed = filterOrderCreateValues("sales/quotations", values);
  if (!parsed) return null;

  const out: InvoiceCreateValues = { ...parsed };
  if (def.moveType === "in_invoice") {
    const source = normalizeBillSource(
      values.billSource ?? values.sg_bill_source
    );
    if (source) out.billSource = source;
  }
  return out;
}
