/**
 * Allowlist + helpers for purchase order PDF download, WhatsApp deep-link,
 * and Odoo email-with-attachment (mail.template).
 *
 * Report/template XMLIDs are fixed server-side — never accept free-form names
 * from the browser.
 */

export const PURCHASE_ORDER_PDF_REPORT =
  "purchase.report_purchaseorder" as const;

export const PURCHASE_ORDER_EMAIL_TEMPLATE =
  "purchase.email_template_edi_purchase_done" as const;

const PURCHASE_ORDER_SHARE_LIST_KEYS = new Set(["purchase/orders"]);

export function canFetchPurchaseOrderPdf(listKey: string): boolean {
  return PURCHASE_ORDER_SHARE_LIST_KEYS.has(listKey);
}

export function canSendPurchaseOrderEmail(listKey: string): boolean {
  return PURCHASE_ORDER_SHARE_LIST_KEYS.has(listKey);
}

/** BFF path that streams the PDF (same-origin so sg_bff_sid is sent). */
export function purchaseOrderPdfPath(listKey: string, id: number): string {
  if (!canFetchPurchaseOrderPdf(listKey) || !Number.isFinite(id) || id <= 0) {
    return "";
  }
  return `/api/reports/purchase-order/${listKey}/${id}`;
}

export function parsePurchaseOrderPdfSlug(slug: string): {
  listKey: string;
  id: number;
} | null {
  const parts = slug.split("/").filter(Boolean);
  if (parts.length < 3) return null;
  const idRaw = parts[parts.length - 1];
  const listKey = parts.slice(0, -1).join("/");
  const id = Number(idRaw);
  if (!canFetchPurchaseOrderPdf(listKey) || !Number.isFinite(id) || id <= 0) {
    return null;
  }
  return { listKey, id };
}

export function purchaseOrderPdfFilename(
  title: string | null | undefined,
  id: number
): string {
  const raw = String(title || "").trim() || `orden-compra-${id}`;
  const safe = raw
    .replace(/[/\\]+/g, "-")
    .replace(/[^\w.\-áéíóúñÁÉÍÓÚÑ ]+/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return `${safe || `orden-compra-${id}`}.pdf`;
}

/** Digits-only E.164-ish for wa.me (AR default country 54). */
export function normalizeWhatsappPhone(
  raw: string | null | undefined
): string | null {
  const digits = String(raw || "").replace(/\D+/g, "");
  if (!digits) return null;
  let phone = digits;
  if (phone.startsWith("00")) phone = phone.slice(2);
  if (phone.startsWith("0")) phone = phone.slice(1);
  if (!phone.startsWith("54") && phone.length <= 10) {
    phone = `54${phone}`;
  }
  if (phone.length < 10) return null;
  return phone;
}

export function purchaseOrderWhatsappMessage(
  orderName: string,
  partnerName: string
): string {
  const name = String(partnerName || "").trim() || "proveedor";
  const order = String(orderName || "").trim() || "OC";
  return `Hola ${name}, te envío la orden de compra ${order}. Por favor revisá el PDF adjunto.`;
}

export function purchaseOrderWhatsappUrl(
  phone: string | null | undefined,
  message: string
): string | null {
  const normalized = phone && /^\d{10,15}$/.test(phone) ? phone : null;
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}

export function missingVendorContactHint(input: {
  phone: string | null;
  email: string | null;
}): string | null {
  const hasPhone = Boolean(input.phone);
  const hasEmail = Boolean(input.email);
  if (hasPhone && hasEmail) return null;
  if (!hasPhone && !hasEmail) return "Cargá el teléfono/mail del proveedor";
  if (!hasPhone) return "Cargá el teléfono del proveedor";
  return "Cargá el mail del proveedor";
}

export type PurchaseOrderShareMeta = {
  orderName: string;
  partnerName: string;
  email: string | null;
  phone: string | null;
  whatsappUrl: string | null;
  pdfPath: string;
  missingContactHint: string | null;
};
