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
    "codigo articulo",
    "código artículo",
    "codigo de articulo",
    "código de artículo",
    "codigo art",
    "codigo",
    "código",
    "codigo interno",
    "código interno",
    "referencia",
    "sku",
    "codigo fabricante",
    "código fabricante",
  ],
  name: [
    "name",
    "nombre",
    "descripcion articulo",
    "descripción artículo",
    "descripcion art",
    "descripcion",
    "descripción",
    "designacion",
    "designación",
    "denominacion",
    "denominación",
    "producto",
    "detalle",
  ],
  list_price: [
    "list price",
    "list_price",
    "valores sin iva",
    "valor sin iva",
    "p.lista s/iva",
    "p lista s/iva",
    "p.lista",
    "p lista",
    "precio lista",
    "p.venta",
    "p venta",
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
    "agrupacion",
    "agrupación",
  ],
  proveedor: [
    "proveedor",
    "supplier",
    "vendor",
    "fabricante",
    "marca proveedor",
  ],
};

/** Spanish labels for the column-mapping step in the import UI. */
export const MAPPING_FIELD_LABELS: Record<keyof PriceListMapping, string> = {
  barcode: "Código de barras",
  default_code: "Código / SKU",
  name: "Nombre del producto",
  list_price: "Precio de venta",
  standard_price: "Costo",
  categoria: "Categoría",
  proveedor: "Proveedor",
};

/** Fields shown in the mapping UI (required fields marked in the page). */
export const MAPPING_UI_FIELDS: (keyof PriceListMapping)[] = [
  "name",
  "default_code",
  "barcode",
  "list_price",
  "standard_price",
  "categoria",
  "proveedor",
];

const HEADER_SCAN_MAX_ROWS = 25;
const HEADERLESS_MIN_SCORE = 3;
const SYNTHETIC_HEADER_PREFIX = "__col_";

export const TEMPLATE_CSV =
  "barcode,default_code,name,list_price,standard_price,categoria,proveedor\n" +
  "7790000000000,SKU-EJEMPLO,Producto ejemplo,1500.00,900.00,Filtros,Proveedor Ejemplo\n";

export function isRejectedFilename(filename: string | null | undefined): boolean {
  if (!filename) return false;
  const name = filename.trim().toLowerCase();
  return REJECTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function normHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ");
}

function sortedAliases(field: keyof PriceListMapping): string[] {
  return [...FIELD_ALIASES[field]].sort((a, b) => b.length - a.length);
}

function headerMatchesFieldExact(norm: string, field: keyof PriceListMapping): boolean {
  return FIELD_ALIASES[field].includes(norm);
}

function headerMatchesFieldPartial(norm: string, field: keyof PriceListMapping): boolean {
  if (!norm || norm.length > 120) return false;
  for (const alias of sortedAliases(field)) {
    if (alias.length >= 4 && norm.includes(alias)) return true;
  }
  if (field === "list_price") {
    if (/^p[\.\s]?\s*venta\b/.test(norm)) return true;
    if (/p[\.\s]?lista/.test(norm)) return true;
    if (/valores?\s*sin\s*iva/.test(norm)) return true;
  }
  if (field === "name" && /designacion/.test(norm)) return true;
  if (field === "default_code" && /codigo\s+(de\s+)?articulo/.test(norm)) return true;
  if (field === "categoria" && /agrupacion/.test(norm)) return true;
  return false;
}

function scoreHeaderCell(norm: string): number {
  if (!norm) return 0;
  if (norm.length > 80) return -4;
  if (/actualizados|vigencia|lista de precios|convertí|fueron actualizados/i.test(norm)) {
    return -5;
  }
  let score = 0;
  for (const field of Object.keys(FIELD_ALIASES) as (keyof PriceListMapping)[]) {
    if (headerMatchesFieldExact(norm, field) || headerMatchesFieldPartial(norm, field)) {
      score += 2;
    }
  }
  return score;
}

function scoreHeaderRow(cells: string[]): number {
  let score = 0;
  let nonEmpty = 0;
  for (const cell of cells) {
    const trimmed = cell.trim();
    if (!trimmed) continue;
    nonEmpty += 1;
    score += scoreHeaderCell(normHeader(trimmed));
  }
  if (nonEmpty < 2) score -= 10;
  return score;
}

export function detectHeaderRowIndex(matrix: unknown[][]): number {
  let bestIdx = 0;
  let bestScore = -Infinity;
  const limit = Math.min(matrix.length, HEADER_SCAN_MAX_ROWS);
  for (let i = 0; i < limit; i++) {
    const row = matrix[i];
    if (!Array.isArray(row)) continue;
    const cells = row.map((cell) => cellToString(cell).trim());
    let score = scoreHeaderRow(cells);
    if (looksLikeDataRow(cells)) score -= 8;
    const nextIdx = nextNonEmptyRowIndex(matrix, i + 1);
    if (nextIdx >= 0) {
      const nextCells = (matrix[nextIdx] as unknown[]).map((cell) =>
        cellToString(cell).trim()
      );
      if (looksLikeDataRow(nextCells)) score += 5;
    }
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function looksLikePrice(value: string): boolean {
  const parsed = parsePrice(value);
  return parsed.amount !== null && !parsed.invalid;
}

function looksLikeProductCode(value: string): boolean {
  const text = value.trim();
  if (!text || text.length > 40) return false;
  return /^[\w.\-/]+$/.test(text) && /\d/.test(text);
}

function looksLikeProductName(value: string): boolean {
  const text = value.trim();
  if (!text || text.length < 3) return false;
  if (looksLikeProductCode(text) && !/\s/.test(text) && text.length <= 16) return false;
  return /[a-záéíóúñ]/i.test(text);
}

function looksLikeDataRow(cells: string[]): boolean {
  const nonEmpty = cells.map((c) => c.trim()).filter(Boolean);
  if (nonEmpty.length < 2) return false;
  const priceCount = nonEmpty.filter(looksLikePrice).length;
  const codeCount = nonEmpty.filter(looksLikeProductCode).length;
  const nameCount = nonEmpty.filter(
    (c) => looksLikeProductName(c) && !looksLikeProductCode(c)
  ).length;
  return (codeCount >= 1 && nameCount >= 1) || (nameCount >= 1 && priceCount >= 1);
}

function nextNonEmptyRowIndex(matrix: unknown[][], start: number): number {
  for (let i = start; i < matrix.length; i++) {
    const row = matrix[i];
    if (!Array.isArray(row)) continue;
    if (row.some((cell) => cellToString(cell).trim())) return i;
  }
  return -1;
}

/** When no header row is found, infer column roles from the first data rows (Fercor-style). */
export function inferHeaderlessLayout(matrix: unknown[][]): {
  headers: string[];
  mapping: PriceListMapping;
} | null {
  const sample: string[][] = [];
  for (const row of matrix) {
    if (!Array.isArray(row)) continue;
    const cells = row.map((cell) => cellToString(cell).trim());
    if (cells.some(Boolean)) sample.push(cells);
    if (sample.length >= 5) break;
  }
  if (sample.length < 2) return null;

  const colCount = Math.max(...sample.map((row) => row.length));
  if (colCount < 2) return null;

  let codeCol = -1;
  let nameCol = -1;
  let priceCol = -1;

  const threshold = Math.ceil(sample.length * 0.6);
  const priceThreshold = Math.ceil(sample.length * 0.5);

  for (let c = 0; c < colCount; c++) {
    const values = sample.map((row) => row[c] || "");
    const codeHits = values.filter(looksLikeProductCode).length;
    if (codeCol < 0 && codeHits >= threshold) codeCol = c;
  }
  for (let c = 0; c < colCount; c++) {
    if (c === codeCol) continue;
    const values = sample.map((row) => row[c] || "");
    const nameHits = values.filter(looksLikeProductName).length;
    if (nameCol < 0 && nameHits >= threshold) nameCol = c;
  }
  for (let c = 0; c < colCount; c++) {
    if (c === codeCol || c === nameCol) continue;
    const values = sample.map((row) => row[c] || "");
    const priceHits = values.filter(looksLikePrice).length;
    if (priceCol < 0 && priceHits >= priceThreshold) priceCol = c;
  }

  if (nameCol < 0) return null;
  if (priceCol < 0 && codeCol < 0) return null;

  const headers = Array.from({ length: colCount }, (_, i) => `${SYNTHETIC_HEADER_PREFIX}${i}`);
  const mapping: PriceListMapping = { name: headers[nameCol] };
  if (codeCol >= 0 && codeCol !== nameCol) mapping.default_code = headers[codeCol];
  if (priceCol >= 0) mapping.list_price = headers[priceCol];

  return { headers, mapping };
}

export function isMappingComplete(mapping: PriceListMapping): boolean {
  return Boolean(mapping.name) && Boolean(mapping.list_price || mapping.standard_price);
}

export function suggestMapping(headers: string[]): PriceListMapping {
  const mapping: PriceListMapping = {};
  const used = new Set<string>();
  const entries = headers
    .filter(Boolean)
    .map((header) => [header, normHeader(header)] as const);

  const fields = Object.keys(FIELD_ALIASES) as (keyof PriceListMapping)[];

  for (const field of fields) {
    for (const [header, norm] of entries) {
      if (used.has(header)) continue;
      if (headerMatchesFieldExact(norm, field)) {
        mapping[field] = header;
        used.add(header);
        break;
      }
    }
  }

  for (const field of fields) {
    if (mapping[field]) continue;
    for (const [header, norm] of entries) {
      if (used.has(header)) continue;
      if (headerMatchesFieldPartial(norm, field)) {
        mapping[field] = header;
        used.add(header);
        break;
      }
    }
  }

  return mapping;
}

function uniqueHeaderLabel(raw: string, index: number, used: Set<string>): string {
  const base = raw.trim() || `Columna ${index + 1}`;
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let n = 2;
  while (used.has(`${base} (${n})`)) n += 1;
  const label = `${base} (${n})`;
  used.add(label);
  return label;
}

function matrixColumnCount(matrix: unknown[][]): number {
  let max = 0;
  for (const row of matrix) {
    if (Array.isArray(row) && row.length > max) max = row.length;
  }
  return max;
}

function buildHeadersFromRow(headerCells: unknown[], columnCount: number): string[] {
  const used = new Set<string>();
  const headers: string[] = [];
  for (let i = 0; i < columnCount; i++) {
    const raw = i < headerCells.length ? cellToString(headerCells[i]).trim() : "";
    headers.push(uniqueHeaderLabel(raw, i, used));
  }
  return headers;
}

/** If price wasn't mapped from headers, pick the unused column that looks most like prices. */
export function enrichMappingFromData(
  headers: string[],
  rows: Record<string, string>[],
  mapping: PriceListMapping
): PriceListMapping {
  if (mapping.list_price || mapping.standard_price || !rows.length) return mapping;
  const used = new Set(Object.values(mapping).filter(Boolean));
  const sample = rows.slice(0, 30);
  let bestHeader: string | undefined;
  let bestHits = 0;
  for (const header of headers) {
    if (used.has(header)) continue;
    const hits = sample.filter((row) => looksLikePrice(row[header] || "")).length;
    if (hits > bestHits) {
      bestHits = hits;
      bestHeader = header;
    }
  }
  const minHits = Math.min(3, Math.max(1, Math.ceil(sample.length * 0.5)));
  if (bestHeader && bestHits >= minHits) {
    return { ...mapping, list_price: bestHeader };
  }
  return mapping;
}

function matrixToTabular(matrix: unknown[][]): {
  headers: string[];
  rows: Record<string, string>[];
  headerRowIndex: number;
  presetMapping?: PriceListMapping;
  error: string | null;
} {
  if (!matrix.length) {
    return { headers: [], rows: [], headerRowIndex: 0, error: "El archivo está vacío." };
  }

  const columnCount = matrixColumnCount(matrix);
  const headerRowIndex = detectHeaderRowIndex(matrix);
  const headerCells = Array.isArray(matrix[headerRowIndex]) ? matrix[headerRowIndex] : [];
  const headerScore = scoreHeaderRow(
    Array.from({ length: columnCount }, (_, i) =>
      cellToString(headerCells[i] ?? "").trim()
    )
  );

  let headers: string[];
  let dataStart: number;
  let presetMapping: PriceListMapping | undefined;

  if (headerScore < HEADERLESS_MIN_SCORE) {
    const headerless = inferHeaderlessLayout(matrix);
    if (headerless) {
      headers = headerless.headers;
      dataStart = 0;
      presetMapping = headerless.mapping;
    } else {
      headers = buildHeadersFromRow(headerCells, columnCount);
      dataStart = headerRowIndex + 1;
    }
  } else {
    headers = buildHeadersFromRow(headerCells, columnCount);
    dataStart = headerRowIndex + 1;
  }

  if (!headers.some(Boolean)) {
    return {
      headers: [],
      rows: [],
      headerRowIndex,
      error: "No se encontraron encabezados de columnas.",
    };
  }

  const rows: Record<string, string>[] = [];
  for (const line of matrix.slice(dataStart)) {
    const cells = Array.isArray(line) ? line : [];
    const row: Record<string, string> = {};
    let any = false;
    headers.forEach((header, i) => {
      const value = cellToString(cells[i] ?? "").trim();
      row[header] = value;
      if (value) any = true;
    });
    if (any) rows.push(row);
  }

  return { headers, rows, headerRowIndex, error: null, ...(presetMapping ? { presetMapping } : {}) };
}

export type TabularParseResult = {
  headers: string[];
  rows: Record<string, string>[];
  headerRowIndex: number;
  suggestedMapping?: PriceListMapping;
  sheetName?: string;
  error: string | null;
};

export type PriceListAnalyzeResult = {
  headers: string[];
  suggestedMapping: PriceListMapping;
  needsMapping: boolean;
  rowCount: number;
  headerRowIndex: number;
  sampleRows: Record<string, string>[];
  sheetName?: string;
  error?: string;
};

export function analyzeTabularFile(
  filename: string | null | undefined,
  content: string
): PriceListAnalyzeResult | { error: string } {
  const parsed = parseTabularText(filename, content);
  if (parsed.error) {
    return { error: parsed.error };
  }
  if (!parsed.rows.length) {
    return {
      error:
        "El archivo no tiene filas de datos. Revisá que la hoja con productos no esté vacía y que no sea solo la portada.",
    };
  }
  const suggestedMapping = enrichMappingFromData(
    parsed.headers,
    parsed.rows,
    parsed.suggestedMapping ?? suggestMapping(parsed.headers)
  );
  return {
    headers: parsed.headers,
    suggestedMapping,
    needsMapping: !isMappingComplete(suggestedMapping),
    rowCount: parsed.rows.length,
    headerRowIndex: parsed.headerRowIndex,
    sampleRows: parsed.rows.slice(0, 3),
    sheetName: parsed.sheetName,
  };
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

function parseCsvText(text: string): TabularParseResult {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/);
  const matrix = lines.map((line) => splitCsvLine(line));
  const result = matrixToTabular(matrix);
  if (result.error) return { ...result, suggestedMapping: undefined };
  const suggestedMapping = enrichMappingFromData(
    result.headers,
    result.rows,
    result.presetMapping ?? suggestMapping(result.headers)
  );
  return { ...result, suggestedMapping };
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

function sheetToMatrix(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });
}

function scoreParsedSheet(result: {
  headers: string[];
  rows: Record<string, string>[];
  presetMapping?: PriceListMapping;
  error: string | null;
}): number {
  if (result.error) return -1;
  const mapping = enrichMappingFromData(
    result.headers,
    result.rows,
    result.presetMapping ?? suggestMapping(result.headers)
  );
  let score = result.rows.length * 10 + result.headers.length;
  if (isMappingComplete(mapping)) score += 100;
  else if (mapping.name) score += 25;
  if (mapping.list_price || mapping.standard_price) score += 40;
  return score;
}

function pickBestWorkbookSheet(workbook: XLSX.WorkBook): {
  sheetName: string;
  matrix: unknown[][];
} | null {
  let best: { sheetName: string; matrix: unknown[][]; score: number } | null = null;
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;
    const matrix = sheetToMatrix(sheet);
    const parsed = matrixToTabular(matrix);
    const score = scoreParsedSheet(parsed);
    if (!best || score > best.score) {
      best = { sheetName, matrix, score };
    }
  }
  return best ? { sheetName: best.sheetName, matrix: best.matrix } : null;
}

function parseExcelContent(content: string): TabularParseResult {
  const b64 = stripBase64Payload(content);
  if (!b64) {
    return {
      headers: [],
      rows: [],
      headerRowIndex: 0,
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
      headerRowIndex: 0,
      error: "No se pudo leer el Excel. Subí un .xlsx o .xls válido.",
    };
  }
  if (!buffer.length) {
    return {
      headers: [],
      rows: [],
      headerRowIndex: 0,
      error: "El archivo Excel está vacío.",
    };
  }
  if (!looksLikeExcelBuffer(buffer)) {
    return {
      headers: [],
      rows: [],
      headerRowIndex: 0,
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
      headerRowIndex: 0,
      error: "El archivo Excel no es válido.",
    };
  }

  if (!workbook.SheetNames.length) {
    return {
      headers: [],
      rows: [],
      headerRowIndex: 0,
      error: "El Excel no tiene hojas.",
    };
  }

  const picked = pickBestWorkbookSheet(workbook);
  if (!picked) {
    return {
      headers: [],
      rows: [],
      headerRowIndex: 0,
      error: "El Excel no tiene hojas.",
    };
  }

  const result = matrixToTabular(picked.matrix);
  if (result.error) {
    return { ...result, sheetName: picked.sheetName };
  }
  const suggestedMapping = enrichMappingFromData(
    result.headers,
    result.rows,
    result.presetMapping ?? suggestMapping(result.headers)
  );
  return { ...result, suggestedMapping, sheetName: picked.sheetName };
}

export function parseTabularText(
  filename: string | null | undefined,
  text: string
): TabularParseResult {
  if (isRejectedFilename(filename)) {
    return {
      headers: [],
      rows: [],
      headerRowIndex: 0,
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
