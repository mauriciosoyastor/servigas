/**
 * Pure parse/match/classify for Servigas price-list import (Astro BFF).
 */

export type PriceListMapping = {
  barcode?: string;
  default_code?: string;
  name?: string;
  list_price?: string;
  standard_price?: string;
};

export type NormalizedRow = {
  barcode: string;
  default_code: string;
  name: string;
  list_price: number | null;
  standard_price: number | null;
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
};

export const TEMPLATE_CSV =
  "barcode,default_code,name,list_price,standard_price\n" +
  "7790000000000,SKU-EJEMPLO,Producto ejemplo,1500.00,900.00\n";

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
  const name = (filename || "").trim().toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    return {
      headers: [],
      rows: [],
      error:
        "Desde el shell web usá CSV por ahora. En Excel: Guardar como → CSV UTF-8.",
    };
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
