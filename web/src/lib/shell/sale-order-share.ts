/**
 * Allowlist + helpers for sale order / quotation PDF, WhatsApp, and Odoo email.
 * Report/template XMLIDs are fixed server-side.
 */

import {
  normalizeWhatsappPhone,
  purchaseOrderWhatsappUrl,
} from "./purchase-order-share.ts";

export const SALE_ORDER_PDF_REPORT = "sale.report_saleorder" as const;

export const SALE_ORDER_EMAIL_TEMPLATE = "sale.email_template_edi_sale" as const;

const SALE_ORDER_SHARE_LIST_KEYS = new Set([
  "sales/quotations",
  "sales/orders",
]);

export function canFetchSaleOrderPdf(listKey: string): boolean {
  return SALE_ORDER_SHARE_LIST_KEYS.has(listKey);
}

export function canSendSaleOrderEmail(listKey: string): boolean {
  return SALE_ORDER_SHARE_LIST_KEYS.has(listKey);
}

export function saleOrderPdfPath(listKey: string, id: number): string {
  if (!canFetchSaleOrderPdf(listKey) || !Number.isFinite(id) || id <= 0) {
    return "";
  }
  return `/api/reports/sale-order/${listKey}/${id}`;
}

export function parseSaleOrderPdfSlug(slug: string): {
  listKey: string;
  id: number;
} | null {
  const parts = slug.split("/").filter(Boolean);
  if (parts.length < 3) return null;
  const idRaw = parts[parts.length - 1];
  const listKey = parts.slice(0, -1).join("/");
  const id = Number(idRaw);
  if (!canFetchSaleOrderPdf(listKey) || !Number.isFinite(id) || id <= 0) {
    return null;
  }
  return { listKey, id };
}

export function saleOrderPdfFilename(
  title: string | null | undefined,
  id: number
): string {
  const raw = String(title || "").trim() || `pedido-${id}`;
  const safe = raw
    .replace(/[/\\]+/g, "-")
    .replace(/[^\w.\-áéíóúñÁÉÍÓÚÑ ]+/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return `${safe || `pedido-${id}`}.pdf`;
}

export function saleOrderDocumentLabel(listKey: string): string {
  return listKey === "sales/quotations" ? "cotización" : "pedido";
}

/** Odoo only allows action_quotation_sent from draft → sent. */
export function shouldMarkQuotationSentAfterEmail(
  state: string | null | undefined
): boolean {
  return String(state || "") === "draft";
}

export function saleOrderWhatsappMessage(
  orderName: string,
  partnerName: string,
  listKey: string
): string {
  const name = String(partnerName || "").trim() || "cliente";
  const order = String(orderName || "").trim() || "documento";
  const kind = saleOrderDocumentLabel(listKey);
  return `Hola ${name}, te envío la ${kind} ${order}. Por favor revisá el PDF adjunto.`;
}

export function saleOrderWhatsappUrl(
  phone: string | null | undefined,
  message: string
): string | null {
  return purchaseOrderWhatsappUrl(phone, message);
}

export function missingCustomerContactHint(input: {
  phone: string | null;
  email: string | null;
}): string | null {
  const hasPhone = Boolean(input.phone);
  const hasEmail = Boolean(input.email);
  if (hasPhone && hasEmail) return null;
  if (!hasPhone && !hasEmail) return "Cargá el teléfono/mail del cliente";
  if (!hasPhone) return "Cargá el teléfono del cliente";
  return "Cargá el mail del cliente";
}

export type SaleOrderShareMeta = {
  orderName: string;
  partnerName: string;
  email: string | null;
  phone: string | null;
  whatsappUrl: string | null;
  pdfPath: string;
  missingContactHint: string | null;
  documentLabel: string;
};

export { normalizeWhatsappPhone };
