/**
 * Prefill helpers for editing invoice drafts in Astro.
 */

import { resolveAccountingMoveDetailPath } from "./accounting-move-detail.ts";
import type { RecordDetailPayload } from "../bff/types.ts";

export type InvoiceDraftInitialLine = {
  productId: number;
  label: string;
  qty: number;
  price?: number;
  discount?: number;
};

export type InvoiceDraftInitialPartner = {
  id: number;
  label: string;
};

export function invoiceDraftEditPath(listKey: string, id: number): string {
  return `/lists/${listKey}/${id}/edit`;
}

/** From drafts ficha → typed edit URL by move_type. */
export function invoiceDraftEditPathFromMoveType(
  moveType: unknown,
  id: number
): string | null {
  const detail = resolveAccountingMoveDetailPath(moveType, id);
  if (!detail) return null;
  return `${detail}/edit`;
}

export function partnerFromInvoiceDetail(
  detail: RecordDetailPayload | null | undefined
): InvoiceDraftInitialPartner | null {
  if (!detail) return null;
  const ref = detail.fields.find((f) => f.key === "partner_ref_id");
  const id = Number(ref?.value);
  if (!Number.isFinite(id) || id <= 0) return null;
  const partnerField = detail.fields.find((f) => f.key === "partner_id");
  const label =
    partnerField?.value == null || partnerField.value === ""
      ? `Contacto ${id}`
      : String(partnerField.value);
  return { id, label };
}

export function linesFromInvoiceDetail(
  detail: RecordDetailPayload | null | undefined
): InvoiceDraftInitialLine[] {
  const rows = detail?.lines?.rows || [];
  const out: InvoiceDraftInitialLine[] = [];
  for (const row of rows) {
    const productId = Number(row.product_variant_id);
    if (!Number.isFinite(productId) || productId <= 0) continue;
    const qty = Number(row.quantity);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    const label =
      row.product_id == null || row.product_id === ""
        ? `Producto ${productId}`
        : String(row.product_id);
    const line: InvoiceDraftInitialLine = {
      productId,
      label,
      qty,
    };
    const price = Number(row.price_unit);
    if (Number.isFinite(price)) line.price = price;
    const discount = Number(row.discount);
    if (Number.isFinite(discount) && discount > 0) line.discount = discount;
    out.push(line);
  }
  return out;
}
