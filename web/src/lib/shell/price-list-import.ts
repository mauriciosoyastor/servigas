/**
 * Pure parse/match/classify for Servigas price-list import (Astro BFF).
 */

import * as XLSX from "xlsx";

export type PriceListMapping = {
  barcode?: string;
  default_code?: string;
  name?: string;
  list_price?: string;
  standard_price?: string;
  categoria?: string;
  proveedor?: string;
};

export type NormalizedRow = {
  barcode: string;
  default_code: string;
  name: string;
  list_price: number | null;
  standard_price: number | null;
  categoria: string;
  proveedor: string;
  priceErrors: string[];
};

export type ProductIndexes = {
  byBarcode: Record<string, number[]>;
  byCode: Record<string, number[]>;
  byName: Record<string, number[]>;
};

export type MatchResult = {
  status: "create" | "update" | "review" | "error";
  productId: number | null;
  candidates: number[];
  reason: string;
};

export type ClassifiedRow = NormalizedRow &
  MatchResult & {
    lineNumber: number;
  };

export type CatalogProduct = {
  id: number;
  barcode?: string | null;
  default_code?: string | null;
  name?: string | null;
};

const REJECTED_EXTENSIONS = [
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".tif",
  ".tiff",
  ".bmp",
];

const FIELD_ALIASES: Record<keyof PriceListMapping, string[]> = {
  barcode: ["barcode", "codigo de barras", "código de barras", "ean", "codigo barras"],
  default_code: [
    "default code",
    "default_code",
    "codigo",
    "código",
    "codigo interno",
    "código interno",
    "referencia",
    "sku",
    "codigo fabricante",
    "código fabricante",
  ],
  name: ["name", "nombre", "descripcion", "descripción", "producto", "detalle"],
  list_price: [
    "list price",
    "list_price",
    "precio",
    "precio venta",
    "precio de venta",
    "precio publico",
    "precio público",
    "pvp",
  ],
  standard_price: [
    "standard price",
    "standard_price",
    "costo",
    "costo unitario",
    "precio costo",
    "cost",
  ],
  categoria: [
    "categoria",
    "categoría",
    "category",
    "categ",
    "tipo",
    "rubro",
  ],
  proveedor: [
    "proveedor",
    "supplier",
    "vendor",
    "fabricante",
    "marca proveedor",
  ],
};

export const TEMPLATE_CSV =
  "barcode,default_code,name,list_price,standard_price,categoria,proveedor\n" +
  "7790000000000,SKU-EJEMPLO,Producto ejemplo,1500.00,900.00,Filtros,Proveedor Ejemplo\n";

export function isRejectedFilename(filename: string | null | undefined): boolean {
  if (!filename) return false;
  const name = filename.trim().toLowerCase();
  return REJECTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function normHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
}

export function suggestMapping(headers: string[]): PriceListMapping {
  const mapping: PriceListMapping = {};
  const used = new Set<string>();
  const normalized = new Map(
    headers.filter(Boolean).map((h) => [h, normHeader(h)] as const)
  );

  for (const [field, aliases] of Object.entries(FIELD_ALIASES) as Array<
    [keyof PriceListMapping, string[]]
  >) {
    for (const [header, norm] of normalized) {
      if (used.has(header)) continue;
      if (aliases.includes(norm)) {
        mapping[field] = header;
        used.add(header);
        break;
      }
    }
  }
  return mapping;
}

export function parsePrice(value: unknown): { amount: number | null; invalid: boolean } {
  if (value === null || value === undefined) return { amount: null, invalid: false };
  const text = String(value).trim();
  if (!text) return { amount: null, invalid: false };
  let cleaned = text.replace(/\$/g, "").replace(/\s/g, "");
  if (cleaned.includes(",") && cleaned.includes(".")) {
    if (cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  } else if (cleaned.includes(",")) {
    cleaned = cleaned.replace(",", ".");
  }
  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount < 0) {
    return { amount: null, invalid: true };
  }
  return { amount, invalid: false };
}

export function normalizeRow(
  raw: Record<string, unknown>,
  mapping: PriceListMapping
): NormalizedRow {
  const cell = (field: keyof PriceListMapping): string => {
    const header = mapping[field];
    if (!header) return "";
    const value = raw[header];
    return value === null || value === undefined ? "" : String(value).trim();
  };

  const priceErrors: string[] = [];
  const listParsed = parsePrice(mapping.list_price ? cell("list_price") : "");
  if (mapping.list_price && listParsed.invalid) priceErrors.push("list_price");
  const costParsed = parsePrice(mapping.standard_price ? cell("standard_price") : "");
  if (mapping.standard_price && costParsed.invalid) {
    priceErrors.push("standard_price");
  }

  return {
    barcode: cell("barcode"),
    default_code: cell("default_code"),
    name: cell("name"),
    list_price: listParsed.amount,
    standard_price: costParsed.amount,
    categoria: cell("categoria"),
    proveedor: cell("proveedor"),
    priceErrors,
  };
}

export function matchProduct(
  row: Pick<NormalizedRow, "barcode" | "default_code" | "name" | "priceErrors">,
  indexes: ProductIndexes
): MatchResult {
  if (row.priceErrors.length) {
    return {
      status: "error",
      productId: null,
      candidates: [],
      reason: "invalid_price",
    };
  }
  const name = row.name.trim();
  if (!name) {
    return {
      status: "error",
      productId: null,
      candidates: [],
      reason: "missing_name",
    };
  }

  const barcode = row.barcode.trim();
  const code = row.default_code.trim();

  if (barcode) {
    const hits = indexes.byBarcode[barcode] || [];
    if (hits.length === 1) {
      return {
        status: "update",
        productId: hits[0],
        candidates: [],
        reason: "barcode",
      };
    }
    if (hits.length > 1) {
      return {
        status: "review",
        productId: null,
        candidates: [...hits],
        reason: "ambiguous_barcode",
      };
    }
  }

  if (code) {
    const hits = indexes.byCode[code] || [];
    if (hits.length === 1) {
      return {
        status: "update",
        productId: hits[0],
        candidates: [],
        reason: "default_code",
      };
    }
    if (hits.length > 1) {
      return {
        status: "review",
        productId: null,
        candidates: [...hits],
        reason: "ambiguous_code",
      };
    }
  }

  const hits = indexes.byName[name.toLowerCase()] || [];
  if (hits.length === 1) {
    return {
      status: "update",
      productId: hits[0],
      candidates: [],
      reason: "name",
    };
  }
  if (hits.length > 1) {
    return {
      status: "review",
      productId: null,
      candidates: [...hits],
      reason: "ambiguous_name",
    };
  }

  return {
    status: "create",
    productId: null,
    candidates: [],
    reason: "no_match",
  };
}

export function classifyRows(
  rawRows: Record<string, unknown>[],
  mapping: PriceListMapping,
  indexes: ProductIndexes
): ClassifiedRow[] {
  return rawRows.map((raw, index) => {
    const normalized = normalizeRow(raw, mapping);
    const matched = matchProduct(normalized, indexes);
    return {
      lineNumber: index + 1,
      ...normalized,
      ...matched,
    };
  });
}

export function buildProductIndexes(products: CatalogProduct[]): ProductIndexes {
  const byBarcode: Record<string, number[]> = {};
  const byCode: Record<string, number[]> = {};
  const byName: Record<string, number[]> = {};

  for (const product of products) {
    const barcode = (product.barcode || "").trim();
    const code = (product.default_code || "").trim();
    const name = (product.name || "").trim();
    if (barcode) {
      (byBarcode[barcode] ||= []).push(product.id);
    }
    if (code) {
      (byCode[code] ||= []).push(product.id);
    }
    if (name) {
      (byName[name.toLowerCase()] ||= []).push(product.id);
    }
  }

  return { byBarcode, byCode, byName };
}

function parseCsvText(text: string): {
  headers: string[];
  rows: Record<string, string>[];
  error: string | null;
} {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.length);
  if (!lines.length) {
    return { headers: [], rows: [], error: "El archivo CSV está vacío." };
  }
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  if (!headers.some(Boolean)) {
    return { headers: [], rows: [], error: "El archivo CSV no tiene encabezados." };
  }
  const rows: Record<string, string>[] = [];
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const cells = splitCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, i) => {
      row[header] = cells[i] ?? "";
    });
    rows.push(row);
  }
  return { headers, rows, error: null };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current);
  return out;
}

function isExcelFilename(filename: string | null | undefined): boolean {
  const name = (filename || "").trim().toLowerCase();
  return name.endsWith(".xlsx") || name.endsWith(".xls");
}

function stripBase64Payload(content: string): string {
  const trimmed = content.trim();
  const dataUrl = /^data:[^;]+;base64,(.+)$/is.exec(trimmed);
  return (dataUrl ? dataUrl[1] : trimmed).replace(/\s+/g, "");
}

function cellToString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

function looksLikeExcelBuffer(buffer: Buffer): boolean {
  if (buffer.length < 4) return false;
  // ZIP container (.xlsx) or OLE Compound File (.xls)
  if (buffer[0] === 0x50 && buffer[1] === 0x4b) return true;
  return (
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0
  );
}

function parseExcelContent(content: string): {
  headers: string[];
  rows: Record<string, string>[];
  error: string | null;
} {
  const b64 = stripBase64Payload(content);
  if (!b64) {
    return {
      headers: [],
      rows: [],
      error: "El archivo Excel está vacío.",
    };
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(b64, "base64");
  } catch {
    return {
      headers: [],
      rows: [],
      error: "No se pudo leer el Excel. Subí un .xlsx o .xls válido.",
    };
  }
  if (!buffer.length) {
    return {
      headers: [],
      rows: [],
      error: "El archivo Excel está vacío.",
    };
  }
  if (!looksLikeExcelBuffer(buffer)) {
    return {
      headers: [],
      rows: [],
      error: "El archivo Excel no es válido.",
    };
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  } catch {
    return {
      headers: [],
      rows: [],
      error: "El archivo Excel no es válido.",
    };
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return {
      headers: [],
      rows: [],
      error: "El Excel no tiene hojas.",
    };
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  if (!matrix.length) {
    return {
      headers: [],
      rows: [],
      error: "El archivo Excel está vacío.",
    };
  }

  const headerRow = Array.isArray(matrix[0]) ? matrix[0] : [];
  const headers = headerRow.map((cell) => cellToString(cell).trim());
  if (!headers.some(Boolean)) {
    return {
      headers: [],
      rows: [],
      error: "El archivo Excel no tiene encabezados.",
    };
  }

  const rows: Record<string, string>[] = [];
  for (const line of matrix.slice(1)) {
    const cells = Array.isArray(line) ? line : [];
    const row: Record<string, string> = {};
    let any = false;
    headers.forEach((header, i) => {
      if (!header) return;
      const value = cellToString(cells[i] ?? "").trim();
      row[header] = value;
      if (value) any = true;
    });
    if (any) rows.push(row);
  }

  return { headers, rows, error: null };
}

export function parseTabularText(
  filename: string | null | undefined,
  text: string
): {
  headers: string[];
  rows: Record<string, string>[];
  error: string | null;
} {
  if (isRejectedFilename(filename)) {
    return {
      headers: [],
      rows: [],
      error:
        "PDF e imágenes no se importan en esta versión. Convertí la lista a Excel o CSV.",
    };
  }
  if (isExcelFilename(filename)) {
    return parseExcelContent(text);
  }
  return parseCsvText(text);
}

export type ApplyLineInput = {
  selected: boolean;
  status: "create" | "update" | "review" | "error";
  productId?: number | null;
  barcode?: string;
  default_code?: string;
  name?: string;
  list_price?: number | null;
  standard_price?: number | null;
};

export function resolveApplyStatus(line: ApplyLineInput): "create" | "update" | "skip" {
  if (!line.selected) return "skip";
  if (line.status === "create") return "create";
  if (line.status === "update" && line.productId) return "update";
  if (line.status === "review" && line.productId) return "update";
  return "skip";
}

const IMPORT_STATUS_LABELS: Record<string, string> = {
  create: "Crear",
  update: "Actualizar",
  review: "Revisar",
  error: "Error",
};

const IMPORT_REASON_LABELS: Record<string, string> = {
  no_match: "Producto nuevo (no encontrado en stock)",
  barcode: "Encontrado por código de barras",
  default_code: "Encontrado por código",
  name: "Encontrado por nombre",
  ambiguous_barcode: "Varios productos coinciden; revisá el CSV",
  ambiguous_code: "Varios productos coinciden; revisá el CSV",
  ambiguous_name: "Varios productos coinciden; revisá el CSV",
  invalid_price: "Falta o es inválido el precio de venta",
  missing_name: "Falta el nombre",
};

/** Display label for preview Estado column (codes unchanged in API). */
export function labelImportStatus(status: string): string {
  const key = String(status || "").trim();
  return IMPORT_STATUS_LABELS[key] || key;
}

/** Display label for preview Motivo column (codes unchanged in API). */
export function labelImportReason(reason: string): string {
  const key = String(reason || "").trim();
  return IMPORT_REASON_LABELS[key] || key;
}
