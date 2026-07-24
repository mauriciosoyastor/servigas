/**
 * Puente Factura Web: marcar FC cargadas + export pendientes.
 * Spec: docs/superpowers/specs/2026-07-24-fw-pos-nc-prov-design.md
 */

import { resolveRecordListKey } from "./record-lists.ts";

const FW_MARK_KEYS = new Set([
  "accounting/customer-invoices",
  "accounting/factura-web-pending",
]);

export const FW_PENDING_LIST_KEY = "accounting/factura-web-pending";

export function canMarkFwLoaded(listKey: string): boolean {
  const key = resolveRecordListKey(listKey) || listKey;
  return FW_MARK_KEYS.has(key);
}

export function canExportFwPending(listKey: string): boolean {
  const key = resolveRecordListKey(listKey) || listKey;
  return key === FW_PENDING_LIST_KEY || key === "accounting/customer-invoices";
}

export type MarkFwLoadedValues = {
  fwNumber?: string;
};

export function filterMarkFwLoadedValues(
  listKey: string,
  values: Record<string, unknown>
): MarkFwLoadedValues | null {
  if (!canMarkFwLoaded(listKey)) return null;
  const raw = values.fwNumber ?? values.sg_fw_number;
  if (raw === undefined || raw === null || raw === "") {
    return {};
  }
  const fwNumber = String(raw).trim();
  if (!fwNumber) return {};
  if (fwNumber.length > 64) return null;
  return { fwNumber };
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
