/**
 * Destino fiscal CF vs CUIT (fase 1).
 * Spec: docs/superpowers/specs/2026-07-24-cf-cuit-invoice-destination-design.md
 */

export const INVOICE_DEST_CF = "cf";
export const INVOICE_DEST_CUIT = "cuit";

export const INVOICE_DEST_OPTIONS = [
  { value: INVOICE_DEST_CF, label: "Consumidor final" },
  { value: INVOICE_DEST_CUIT, label: "Con CUIT" },
] as const;

export const CUIT_DEST_REQUIRED_MSG =
  "Este cliente es Con CUIT: cargá el CUIT para guardar.";

export const POS_CUIT_MISSING_MSG =
  "Falta CUIT; completá la ficha antes de facturar.";

export type InvoiceDest = typeof INVOICE_DEST_CF | typeof INVOICE_DEST_CUIT;

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
  if (dest === INVOICE_DEST_CUIT && !vat) {
    return CUIT_DEST_REQUIRED_MSG;
  }
  return null;
}

export function needsCuitWarning(dest: unknown, vat: unknown): boolean {
  return (
    normalizeInvoiceDest(dest) === INVOICE_DEST_CUIT &&
    !String(vat ?? "").trim()
  );
}
