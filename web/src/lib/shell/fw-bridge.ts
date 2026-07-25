/**
 * Puente Factura Web: marcar FC cargadas + export pendientes + bulk.
 * Specs: fw-pos-nc-prov · fw-bulk-mark
 */

import { resolveRecordListKey } from "./record-lists.ts";

const FW_MARK_KEYS = new Set([
  "accounting/customer-invoices",
  "accounting/factura-web-pending",
]);

export const FW_PENDING_LIST_KEY = "accounting/factura-web-pending";
export const FW_BULK_MAX_IDS = 100;

export function canMarkFwLoaded(listKey: string): boolean {
  const key = resolveRecordListKey(listKey) || listKey;
  return FW_MARK_KEYS.has(key);
}

export function canMarkFwLoadedBulk(listKey: string): boolean {
  return canMarkFwLoaded(listKey);
}

export function canExportFwPending(listKey: string): boolean {
  const key = resolveRecordListKey(listKey) || listKey;
  return key === FW_PENDING_LIST_KEY || key === "accounting/customer-invoices";
}

/**
 * Normaliza ids de bulk mark. null = payload inválido / vacío / exceso.
 */
export function filterMarkFwBulkIds(raw: unknown): number[] | null {
  if (!Array.isArray(raw)) return null;
  const seen = new Set<number>();
  const ids: number[] = [];
  for (const item of raw) {
    const id = Number(item);
    if (!Number.isFinite(id) || id <= 0 || !Number.isInteger(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  if (!ids.length) return null;
  if (ids.length > FW_BULK_MAX_IDS) return null;
  return ids;
}

export type MarkFwLoadedValues = {
  fwNumber: string;
};

export function filterMarkFwLoadedValues(
  listKey: string,
  values: Record<string, unknown>
): MarkFwLoadedValues | null {
  if (!canMarkFwLoaded(listKey)) return null;
  const raw = values.fwNumber ?? values.sg_fw_number;
  if (raw === undefined || raw === null) return null;
  const fwNumber = String(raw).trim();
  if (!fwNumber || fwNumber.length > 64) return null;
  return { fwNumber };
}

export type MarkFwBulkItem = {
  id: number;
  fwNumber: string;
};

/**
 * Normaliza items bulk. null = inválido / vacío / exceso / nº faltante.
 * Dedup by id (first wins).
 */
export function filterMarkFwBulkItems(raw: unknown): MarkFwBulkItem[] | null {
  if (!Array.isArray(raw)) return null;
  const seen = new Set<number>();
  const items: MarkFwBulkItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") return null;
    const id = Number((entry as { id?: unknown }).id);
    if (!Number.isFinite(id) || id <= 0 || !Number.isInteger(id)) return null;
    if (seen.has(id)) continue;
    const fwRaw =
      (entry as { fwNumber?: unknown }).fwNumber ??
      (entry as { sg_fw_number?: unknown }).sg_fw_number;
    if (fwRaw === undefined || fwRaw === null) return null;
    const fwNumber = String(fwRaw).trim();
    if (!fwNumber || fwNumber.length > 64) return null;
    seen.add(id);
    items.push({ id, fwNumber });
  }
  if (!items.length) return null;
  if (items.length > FW_BULK_MAX_IDS) return null;
  return items;
}

export function isFwMarkableState(
  state: string | null | undefined,
  fwLoaded: unknown
): boolean {
  if (String(state || "") !== "posted") return false;
  return !fwLoaded || fwLoaded === "false" || fwLoaded === false || fwLoaded === "0";
}

/** Escape CSV cell (RFC-ish). */
export function csvEscape(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function buildFwPendingCsv(
  rows: Array<Record<string, unknown>>
): string {
  const headers = [
    "fecha",
    "n_fc_odoo",
    "cliente",
    "cuit",
    "destino_fiscal",
    "tipo_sugerido",
    "total",
    "n_factura_factura_web",
    "observaciones",
  ];
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      [
        csvEscape(row.invoice_date ?? row.date ?? ""),
        csvEscape(row.name ?? ""),
        csvEscape(row.partner_name ?? row.partner_id ?? ""),
        csvEscape(row.vat ?? ""),
        csvEscape(row.sg_invoice_dest ?? ""),
        csvEscape(row.sg_doc_type_short ?? ""),
        csvEscape(row.amount_total ?? ""),
        csvEscape(row.sg_fw_number ?? ""),
        csvEscape(row.ref ?? ""),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
