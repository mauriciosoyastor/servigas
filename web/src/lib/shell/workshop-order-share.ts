import {
  normalizeWhatsappPhone,
  purchaseOrderWhatsappUrl,
} from "./purchase-order-share.ts";

export const WORKSHOP_ORDER_PDF_REPORT =
  "servigas_core.report_sg_work_order" as const;

export const WORKSHOP_ORDER_EMAIL_TEMPLATE =
  "servigas_core.email_template_sg_work_order" as const;

const WORKSHOP_ORDER_SHARE_LIST_KEYS = new Set(["workshop/orders"]);

export function canFetchWorkshopOrderPdf(listKey: string): boolean {
  return WORKSHOP_ORDER_SHARE_LIST_KEYS.has(listKey);
}

export function canSendWorkshopOrderEmail(listKey: string): boolean {
  return WORKSHOP_ORDER_SHARE_LIST_KEYS.has(listKey);
}

export function workshopOrderPdfPath(listKey: string, id: number): string {
  if (!canFetchWorkshopOrderPdf(listKey) || !Number.isFinite(id) || id <= 0) {
    return "";
  }
  return `/api/reports/workshop-order/${listKey}/${id}`;
}

export function parseWorkshopOrderPdfSlug(slug: string): {
  listKey: string;
  id: number;
} | null {
  const parts = slug.split("/").filter(Boolean);
  if (parts.length < 3) return null;
  const idRaw = parts[parts.length - 1];
  const listKey = parts.slice(0, -1).join("/");
  const id = Number(idRaw);
  if (!canFetchWorkshopOrderPdf(listKey) || !Number.isFinite(id) || id <= 0) {
    return null;
  }
  return { listKey, id };
}

export function workshopOrderPdfFilename(
  title: string | null | undefined,
  id: number
): string {
  const raw = String(title || "").trim() || `ot-${id}`;
  const safe = raw
    .replace(/[/\\]+/g, "-")
    .replace(/[^\w.\-áéíóúñÁÉÍÓÚÑ ]+/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return `${safe || `ot-${id}`}.pdf`;
}

export function workshopOrderWhatsappMessage(
  orderName: string,
  displayName: string
): string {
  const name = String(displayName || "").trim() || "cliente";
  const order = String(orderName || "").trim() || "documento";
  return `Hola ${name}, te envío la orden de trabajo ${order}. Por favor revisá el PDF adjunto.`;
}

export function workshopOrderWhatsappUrl(
  phone: string | null | undefined,
  message: string
): string | null {
  return purchaseOrderWhatsappUrl(phone, message);
}

export function resolveWorkshopShareContacts(input: {
  partnerName: string | null;
  partnerEmail: string | null;
  partnerPhone: string | null;
  partnerMobile: string | null;
  ownerName: string | null;
  ownerPhone: string | null;
}): { displayName: string; email: string | null; phone: string | null } {
  const displayName =
    String(input.partnerName || "").trim() ||
    String(input.ownerName || "").trim() ||
    "cliente";
  const emailRaw = String(input.partnerEmail || "").trim();
  const email = emailRaw || null;
  const phone =
    normalizeWhatsappPhone(input.partnerPhone) ||
    normalizeWhatsappPhone(input.partnerMobile) ||
    normalizeWhatsappPhone(input.ownerPhone);
  return { displayName, email, phone };
}

export function missingWorkshopContactHint(input: {
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

export type WorkshopOrderShareMeta = {
  orderName: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  whatsappUrl: string | null;
  pdfPath: string;
  missingContactHint: string | null;
};

export { normalizeWhatsappPhone };
