/**
 * Allowlisted field writes (no arbitrary model/field from the browser).
 */

import { getRecordListDef } from "./record-lists.ts";
import { canCreateOrder } from "./order-creates.ts";

export type RecordWriteDef = {
  listKey: string;
  model: string;
  /** Fields allowed on update */
  fields: string[];
  /** Fields allowed on create (plus createDefaults) */
  createFields: string[];
  createDefaults: Record<string, string | number | boolean>;
  canArchive: boolean;
};

type WriteConfig = {
  fields: string[];
  createFields: string[];
  createDefaults: Record<string, string | number | boolean>;
  numericCreateFields?: string[];
  canArchive: boolean;
};

const WRITES: Record<string, WriteConfig> = {
  "sales/customers": {
    fields: ["phone", "email", "vat", "street", "city"],
    createFields: ["name", "vat", "phone", "email", "street", "city"],
    createDefaults: { customer_rank: 1 },
    canArchive: true,
  },
  "purchase/vendors": {
    fields: ["phone", "email", "vat", "street", "city"],
    createFields: ["name", "vat", "phone", "email", "street", "city"],
    createDefaults: { supplier_rank: 1 },
    canArchive: true,
  },
  "inventory/products": {
    fields: ["default_code", "list_price"],
    createFields: ["name", "default_code", "list_price"],
    createDefaults: { sale_ok: true, is_storable: true },
    numericCreateFields: ["list_price"],
    canArchive: true,
  },
};

export function getRecordWriteDef(listKey: string): RecordWriteDef | null {
  const cfg = WRITES[listKey];
  if (!cfg) return null;
  const list = getRecordListDef(listKey);
  if (!list) return null;
  return {
    listKey,
    model: list.model,
    fields: [...cfg.fields],
    createFields: [...cfg.createFields],
    createDefaults: { ...cfg.createDefaults },
    canArchive: cfg.canArchive,
  };
}

export function canCreateRecord(listKey: string): boolean {
  const def = getRecordWriteDef(listKey);
  return Boolean(def?.createFields.length) || canCreateOrder(listKey);
}

export function canArchiveRecord(listKey: string): boolean {
  return Boolean(getRecordWriteDef(listKey)?.canArchive);
}

function asTrimmedString(raw: unknown): string | null {
  if (raw === null || raw === undefined) return "";
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  return String(raw).trim();
}

export function filterWritableValues(
  listKey: string,
  values: Record<string, unknown>
): Record<string, string> | null {
  const def = getRecordWriteDef(listKey);
  if (!def) return null;

  const out: Record<string, string> = {};
  for (const field of def.fields) {
    if (!(field in values)) continue;
    const next = asTrimmedString(values[field]);
    if (next === null) continue;
    out[field] = next;
  }

  return Object.keys(out).length ? out : null;
}

export function filterCreateValues(
  listKey: string,
  values: Record<string, unknown>
): Record<string, string | number | boolean> | null {
  const cfg = WRITES[listKey];
  const def = getRecordWriteDef(listKey);
  if (!def?.createFields.length || !cfg) return null;

  const numeric = new Set(cfg.numericCreateFields || []);
  const out: Record<string, string | number | boolean> = {
    ...def.createDefaults,
  };

  for (const field of def.createFields) {
    if (!(field in values)) continue;
    if (numeric.has(field)) {
      const n = Number(values[field]);
      if (!Number.isFinite(n)) continue;
      out[field] = n;
      continue;
    }
    const next = asTrimmedString(values[field]);
    if (next === null) continue;
    out[field] = next;
  }

  const name = typeof out.name === "string" ? out.name.trim() : "";
  if (!name) return null;
  out.name = name;

  return out;
}
