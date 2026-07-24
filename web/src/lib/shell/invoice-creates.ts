/**
 * Allowlisted customer invoice creates (FC), multi-line.
 * Spec: docs/superpowers/specs/2026-07-24-fc-create-publish-destino-design.md
 */

import {
  filterOrderCreateValues,
  type OrderCreateLine,
  type OrderCreateValues,
} from "./order-creates.ts";
import { resolveRecordListKey } from "./record-lists.ts";

export type InvoiceCreateDef = {
  listKey: string;
  model: "account.move";
  moveType: "out_invoice";
};

const INVOICE_CREATES: Record<string, InvoiceCreateDef> = {
  "accounting/customer-invoices": {
    listKey: "accounting/customer-invoices",
    model: "account.move",
    moveType: "out_invoice",
  },
};

function canonicalKey(listKey: string): string {
  return resolveRecordListKey(listKey) || listKey;
}

export function getInvoiceCreateDef(listKey: string): InvoiceCreateDef | null {
  return INVOICE_CREATES[canonicalKey(listKey)] || null;
}

export function canCreateInvoice(listKey: string): boolean {
  return Boolean(getInvoiceCreateDef(listKey));
}

export type InvoiceCreateValues = OrderCreateValues;
export type InvoiceCreateLine = OrderCreateLine;

/** Same partner+lines shape as order-creates; keyed for FC list. */
export function filterInvoiceCreateValues(
  listKey: string,
  values: Record<string, unknown>
): InvoiceCreateValues | null {
  if (!getInvoiceCreateDef(listKey)) return null;
  // Reuse line/partner parsing via a known order key, then accept for invoice.
  const parsed = filterOrderCreateValues("sales/quotations", values);
  return parsed;
}
