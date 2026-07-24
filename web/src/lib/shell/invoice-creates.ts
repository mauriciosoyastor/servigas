/**
 * Allowlisted account.move creates (FC / NC / FP), multi-line.
 * Specs: fc-create-publish-destino + accounting-ops-prioridad-alta
 * + docs/superpowers/specs/2026-07-24-vendor-bill-attachment-design.md
 */

import {
  normalizeBillAttachment,
  normalizeBillSource,
  type BillSource,
  type NormalizedBillAttachment,
} from "./bill-attachment.ts";
import {
  filterOrderCreateValues,
  type OrderCreateLine,
  type OrderCreateValues,
} from "./order-creates.ts";
import { resolveRecordListKey } from "./record-lists.ts";

export type InvoiceMoveType =
  | "out_invoice"
  | "out_refund"
  | "in_invoice"
  | "in_refund";

export type InvoiceCreateDef = {
  listKey: string;
  model: "account.move";
  moveType: InvoiceMoveType;
  requireAttachment?: boolean;
};

const INVOICE_CREATES: Record<string, InvoiceCreateDef> = {
  "accounting/customer-invoices": {
    listKey: "accounting/customer-invoices",
    model: "account.move",
    moveType: "out_invoice",
  },
  "accounting/credit-notes": {
    listKey: "accounting/credit-notes",
    model: "account.move",
    moveType: "out_refund",
  },
  "accounting/vendor-bills": {
    listKey: "accounting/vendor-bills",
    model: "account.move",
    moveType: "in_invoice",
    requireAttachment: true,
  },
  "accounting/vendor-refunds": {
    listKey: "accounting/vendor-refunds",
    model: "account.move",
    moveType: "in_refund",
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

export type InvoiceCreateLine = OrderCreateLine;

export type InvoiceCreateValues = OrderCreateValues & {
  billSource?: BillSource | "";
  attachment?: NormalizedBillAttachment;
};

/** Same partner+lines shape as order-creates; FP also requires attachment. */
export function filterInvoiceCreateValues(
  listKey: string,
  values: Record<string, unknown>
): InvoiceCreateValues | null {
  const def = getInvoiceCreateDef(listKey);
  if (!def) return null;

  // Reuse line/partner parsing via a known order key, then accept for invoice.
  const parsed = filterOrderCreateValues("sales/quotations", values);
  if (!parsed) return null;

  const out: InvoiceCreateValues = { ...parsed };

  if (def.moveType === "in_invoice") {
    const source = normalizeBillSource(
      values.billSource ?? values.sg_bill_source
    );
    if (source) out.billSource = source;
  }

  if (def.requireAttachment) {
    out.attachment = normalizeBillAttachment(
      values.attachment ?? values.file
    );
  }

  return out;
}
