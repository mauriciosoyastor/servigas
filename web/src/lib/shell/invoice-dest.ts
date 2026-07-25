/**
 * Destino fiscal CF vs CUIT (fase 1) + checksum (P0.2).
 * Specs: cf-cuit-invoice-destination · accounting-moves-cuit-checksum
 */

import { isValidCuit } from "./cuit.ts";

export const INVOICE_DEST_CF = "cf";
export const INVOICE_DEST_CUIT = "cuit";

export const INVOICE_DEST_OPTIONS = [
  { value: INVOICE_DEST_CF, label: "Consumidor final" },
  { value: INVOICE_DEST_CUIT, label: "Con CUIT" },
] as const;

export const CUIT_DEST_REQUIRED_MSG =
  "Este cliente es Con CUIT: cargá el CUIT para guardar.";

export const CUIT_INVALID_MSG =
  "El CUIT no es válido (revisá los 11 dígitos).";

export const CUIT_INVALID_WARN_MSG =
  "El CUIT cargado no es válido; podés guardar igual (destino CF).";

export const POS_CUIT_MISSING_MSG =
  "Falta CUIT; completá la ficha antes de facturar.";

export const PUBLISH_CUIT_VAT_MSG =
  "Este cliente es Con CUIT: cargá el CUIT para publicar.";

export const PUBLISH_CUIT_ADDRESS_MSG =
  "Este cliente es Con CUIT: cargá calle y ciudad para publicar.";

export type InvoiceDest = typeof INVOICE_DEST_CF | typeof INVOICE_DEST_CUIT;

export type PartnerFiscalFields = {
  sg_invoice_dest?: unknown;
  vat?: unknown;
  street?: unknown;
  city?: unknown;
};

export function normalizeInvoiceDest(raw: unknown): InvoiceDest {
  const value = String(raw ?? INVOICE_DEST_CF).trim().toLowerCase();
  return value === INVOICE_DEST_CUIT ? INVOICE_DEST_CUIT : INVOICE_DEST_CF;
}

/** Badge corto para listas / POS */
export function invoiceDestBadge(raw: unknown): string {
  return normalizeInvoiceDest(raw) === INVOICE_DEST_CUIT ? "CUIT" : "CF";
}

/** Label largo para ficha */
export function invoiceDestLabel(raw: unknown): string {
  return normalizeInvoiceDest(raw) === INVOICE_DEST_CUIT
    ? "Con CUIT"
    : "Consumidor final";
}

/**
 * Valida destino+CUIT en un payload ya filtrado (create/update).
 * Devuelve mensaje de error o null si ok.
 * Si el payload no trae `sg_invoice_dest`, no exige (update parcial).
 * Destino CF + vat inválido: no bloquea (ver invoiceDestVatWarning).
 */
export function invoiceDestVatError(
  values: Record<string, unknown>
): string | null {
  if (!("sg_invoice_dest" in values) && !("vat" in values)) {
    return null;
  }
  const dest = normalizeInvoiceDest(
    "sg_invoice_dest" in values ? values.sg_invoice_dest : INVOICE_DEST_CF
  );
  // Update parcial: solo vat — no sabemos destino; Odoo constraint cubre.
  if (!("sg_invoice_dest" in values)) {
    return null;
  }
  const vat = String(values.vat ?? "").trim();
  if (dest === INVOICE_DEST_CUIT) {
    if (!vat) return CUIT_DEST_REQUIRED_MSG;
    if (!isValidCuit(vat)) return CUIT_INVALID_MSG;
  }
  return null;
}

/** Aviso no bloqueante (opción C): CF con texto inválido en vat. */
export function invoiceDestVatWarning(
  values: Record<string, unknown>
): string | null {
  if (!("sg_invoice_dest" in values) && !("vat" in values)) {
    return null;
  }
  if (!("sg_invoice_dest" in values)) return null;
  const dest = normalizeInvoiceDest(values.sg_invoice_dest);
  if (dest !== INVOICE_DEST_CF) return null;
  const vat = String(values.vat ?? "").trim();
  if (!vat) return null;
  if (!isValidCuit(vat)) return CUIT_INVALID_WARN_MSG;
  return null;
}

export function needsCuitWarning(dest: unknown, vat: unknown): boolean {
  const normalized = normalizeInvoiceDest(dest);
  const trimmed = String(vat ?? "").trim();
  if (normalized === INVOICE_DEST_CUIT) {
    if (!trimmed) return true;
    return !isValidCuit(trimmed);
  }
  if (normalized === INVOICE_DEST_CF && trimmed && !isValidCuit(trimmed)) {
    return true;
  }
  return false;
}

/**
 * Validación al publicar FC: destino CUIT exige vat válido + street + city.
 * CF siempre ok (vat inválido no bloquea publicación).
 */
export function publishInvoiceDestError(
  partner: PartnerFiscalFields | null | undefined
): string | null {
  if (!partner) return null;
  const dest = normalizeInvoiceDest(partner.sg_invoice_dest);
  if (dest !== INVOICE_DEST_CUIT) return null;
  const vat = String(partner.vat ?? "").trim();
  if (!vat) return PUBLISH_CUIT_VAT_MSG;
  if (!isValidCuit(vat)) return CUIT_INVALID_MSG;
  if (
    !String(partner.street ?? "").trim() ||
    !String(partner.city ?? "").trim()
  ) {
    return PUBLISH_CUIT_ADDRESS_MSG;
  }
  return null;
}

/** Tipo de comprobante sugerido (fase 3a) — no es emisión AFIP. */
export type SuggestedDocTypeCode = "bc_cf" | "ab_cuit";

export type SuggestedDocType = {
  code: SuggestedDocTypeCode;
  /** Lista corta: B/C o A/B */
  short: string;
  /** Label ficha */
  label: string;
  /** Nota educativa */
  note: string;
};

export const SUGGESTED_DOC_TYPE_NOTE =
  "Sugerido según destino. El tipo final lo define AFIP/l10n_ar según tu condición IVA.";

export function suggestedDocType(dest: unknown): SuggestedDocType {
  if (normalizeInvoiceDest(dest) === INVOICE_DEST_CUIT) {
    return {
      code: "ab_cuit",
      short: "A/B",
      label: "Factura A/B (CUIT)",
      note: SUGGESTED_DOC_TYPE_NOTE,
    };
  }
  return {
    code: "bc_cf",
    short: "B/C",
    label: "Factura B/C (consumidor final)",
    note: SUGGESTED_DOC_TYPE_NOTE,
  };
}

export function suggestedDocTypeShort(dest: unknown): string {
  return suggestedDocType(dest).short;
}

export function suggestedDocTypeLabel(dest: unknown): string {
  return suggestedDocType(dest).label;
}
