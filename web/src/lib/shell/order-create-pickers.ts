/**
 * Helpers for searchable partner/product pickers on quotation & RFQ create.
 */

const PICKER_LIST_KEYS = new Set([
  "sales/customers",
  "purchase/vendors",
  "inventory/variants",
]);

export type PickerOption = { id: number; label: string };

export function buildOrderPickerSearchUrl(
  listKey: string,
  q: string
): string | null {
  if (!PICKER_LIST_KEYS.has(listKey)) return null;
  const query = String(q || "").trim();
  if (!query) return null;
  const params = new URLSearchParams({ q: query, page: "1" });
  return `/api/lists/${listKey}?${params.toString()}`;
}

export function labelOrderPartnerRow(
  row: Record<string, unknown>
): string {
  const name = row.name;
  if (typeof name === "string" && name.trim()) return name.trim();
  if (typeof name === "number") return String(name);
  return String(row.id ?? "");
}

export function labelOrderProductRow(
  row: Record<string, unknown>
): string {
  const display = row.display_name;
  if (typeof display === "string" && display.trim()) return display.trim();
  const code = row.default_code;
  if (typeof code === "string" && code.trim()) return code.trim();
  const name = row.name;
  if (typeof name === "string" && name.trim()) return name.trim();
  return String(row.id ?? "");
}

export function mapRowsToPickerOptions(
  rows: Record<string, unknown>[],
  kind: "partner" | "product"
): PickerOption[] {
  const labeler =
    kind === "partner" ? labelOrderPartnerRow : labelOrderProductRow;
  const out: PickerOption[] = [];
  for (const row of rows || []) {
    const id = Number(row.id);
    if (!Number.isFinite(id) || id <= 0) continue;
    out.push({ id, label: labeler(row) });
  }
  return out;
}
