/**
 * Inline partner get-or-create: parse payloads shared by order/invoice/POS/workshop flows.
 */

import { INVOICE_DEST_CF } from "./invoice-dest.ts";
import { resolveRecordListKey } from "./record-lists.ts";

export type PartnerKind = "customer" | "supplier";

export type PartnerNewInput = {
  name: string;
  phone?: string;
  email?: string;
  vat?: string;
};

export type PartnerResolution = {
  partnerId?: number;
  partnerNew?: PartnerNewInput;
};

export const PARTNER_MISSING_MSG =
  "Elegí o cargá un cliente o proveedor";

export function normalizePartnerName(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  return String(raw).trim();
}

export function partnerNamesMatch(a: string, b: string): boolean {
  return (
    normalizePartnerName(a).toLowerCase() ===
    normalizePartnerName(b).toLowerCase()
  );
}

export function cuitConflictMessage(cuit: string, existingName: string): string {
  const label = String(existingName || "").trim() || "sin nombre";
  return `Ya existe un contacto con CUIT ${cuit}: ${label}. Usá ese contacto o corregí el CUIT.`;
}

export function parsePartnerNew(raw: unknown): PartnerNewInput | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const name = normalizePartnerName(row.name);
  if (!name) return null;

  const out: PartnerNewInput = { name };
  const phone = normalizePartnerName(row.phone);
  if (phone) out.phone = phone;
  const email = normalizePartnerName(row.email);
  if (email) out.email = email;
  const vat = normalizePartnerName(row.vat);
  if (vat) out.vat = vat;
  return out;
}

export function parsePartnerResolution(
  values: Record<string, unknown>
): PartnerResolution | null {
  const partnerId = Number(values.partnerId ?? values.partner_id);
  if (Number.isFinite(partnerId) && partnerId > 0) {
    return { partnerId };
  }

  const partnerNew = parsePartnerNew(values.partnerNew ?? values.partner_new);
  if (partnerNew) return { partnerNew };

  return null;
}

/** Map list keys to customer vs supplier for inline partner ensure. */
export function partnerKindFromListKey(listKey: string): PartnerKind {
  const key = resolveRecordListKey(listKey) || listKey;
  if (
    key.startsWith("purchase/") ||
    key.startsWith("accounting/vendor")
  ) {
    return "supplier";
  }
  return "customer";
}

export function partnerKindFromPartnerListKey(listKey: string): PartnerKind {
  const key = resolveRecordListKey(listKey) || listKey;
  if (key.startsWith("purchase/vendors")) return "supplier";
  return "customer";
}

/** Defaults aligned with record-writes.ts createDefaults. */
export function partnerCreateDefaults(
  kind: PartnerKind
): Record<string, string | number | boolean> {
  if (kind === "supplier") {
    return { supplier_rank: 1, company_type: "company" };
  }
  return { customer_rank: 1, sg_invoice_dest: INVOICE_DEST_CF };
}

/** Workshop: derive inline partner from propietario fields when no partnerId. */
export function partnerNewFromWorkshopOwner(
  values: Record<string, unknown>
): PartnerNewInput | null {
  const name = normalizePartnerName(values.owner_name ?? values.ownerName);
  if (!name) return null;
  const out: PartnerNewInput = { name };
  const phone = normalizePartnerName(values.owner_phone ?? values.ownerPhone);
  if (phone) out.phone = phone;
  const email = normalizePartnerName(
    values.partner_email ?? values.partnerEmail ?? values.email
  );
  if (email) out.email = email;
  const vat = normalizePartnerName(values.partner_vat ?? values.partnerVat ?? values.vat);
  if (vat) out.vat = vat;
  return out;
}
