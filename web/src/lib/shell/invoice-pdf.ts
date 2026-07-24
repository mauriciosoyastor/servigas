/**
 * Allowlist + helpers for embedding account.move invoice PDFs in the Astro shell.
 *
 * Odoo report XMLID is fixed server-side — never accept a free-form report name
 * from the browser.
 */

export const INVOICE_PDF_REPORT =
  "account.report_invoice_with_payments" as const;

const INVOICE_PDF_LIST_KEYS = new Set([
  "accounting/customer-invoices",
  "accounting/vendor-bills",
  "accounting/credit-notes",
  "accounting/vendor-refunds",
  "accounting/drafts",
]);

export function canFetchInvoicePdf(listKey: string): boolean {
  return INVOICE_PDF_LIST_KEYS.has(listKey);
}

/** BFF path that streams the PDF (same-origin so sg_bff_sid is sent). */
export function invoicePdfPath(listKey: string, id: number): string {
  if (!canFetchInvoicePdf(listKey) || !Number.isFinite(id) || id <= 0) {
    return "";
  }
  return `/api/reports/invoice/${listKey}/${id}`;
}

export function parseInvoicePdfSlug(slug: string): {
  listKey: string;
  id: number;
} | null {
  const parts = slug.split("/").filter(Boolean);
  if (parts.length < 3) return null;
  const idRaw = parts[parts.length - 1];
  const listKey = parts.slice(0, -1).join("/");
  const id = Number(idRaw);
  if (!canFetchInvoicePdf(listKey) || !Number.isFinite(id) || id <= 0) {
    return null;
  }
  return { listKey, id };
}

export function invoicePdfFilename(title: string | null | undefined, id: number): string {
  const raw = String(title || "").trim() || `comprobante-${id}`;
  const safe = raw
    .replace(/[/\\]+/g, "-")
    .replace(/[^\w.\-áéíóúñÁÉÍÓÚÑ ]+/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return `${safe || `comprobante-${id}`}.pdf`;
}
