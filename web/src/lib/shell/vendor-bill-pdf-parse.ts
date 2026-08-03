/**
 * Pure parse/match for vendor-bill PDF text lines (Astro BFF).
 * Spec: docs/superpowers/specs/2026-07-29-vendor-bill-pdf-lines-design.md
 */

import {
  buildProductIndexes,
  parsePrice,
  type ProductIndexes,
} from "./price-list-import.ts";

export { buildProductIndexes };
export type { ProductIndexes };

export type RawBillLine = {
  code: string;
  name: string;
  qty: number;
  price: number;
};

export type BillLineStatus = "matched" | "review" | "error";

export type ClassifiedBillLine = RawBillLine & {
  status: BillLineStatus;
  productId: number | null;
  reason: string;
  candidates: number[];
};

export type PartnerHint = {
  vat?: string;
  name?: string;
};

const CUIT_RE = /(\d{2}-\d{8}-\d)/;
const RAZON_RE = /Razon\s+Social:\s*(.+)/i;
// code  name...  qty  unitPrice  [importe]
const LINE_RE =
  /^(\S+)\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s+(\$?\s*\d[\d.,]*)(?:\s+[\d.,]+)?\s*$/;
const SKIP_CODE_RE = /^(subtotal|iva|total|codigo|código|cant|p\.?unit|importe)$/i;

function parseQty(raw: string): number | null {
  const cleaned = String(raw || "")
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function parseVendorBillText(text: string): {
  lines: RawBillLine[];
  partnerHint: PartnerHint | null;
} {
  if (!text || !String(text).trim()) {
    return { lines: [], partnerHint: null };
  }

  const lines: RawBillLine[] = [];
  let vat: string | undefined;
  let name: string | undefined;

  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (!vat) {
      const cuit = line.match(CUIT_RE);
      if (cuit) vat = cuit[1];
    }
    if (!name) {
      const razon = line.match(RAZON_RE);
      if (razon) name = razon[1].trim();
    }

    const m = line.match(LINE_RE);
    if (!m) continue;
    const code = m[1].trim();
    if (SKIP_CODE_RE.test(code)) continue;
    if (/^(subtotal|iva|total)\b/i.test(line)) continue;

    const qty = parseQty(m[3]);
    const priceParsed = parsePrice(m[4]);
    if (qty === null || priceParsed.invalid || priceParsed.amount === null) {
      continue;
    }

    lines.push({
      code,
      name: m[2].trim(),
      qty,
      price: priceParsed.amount,
    });
  }

  const partnerHint =
    vat || name ? { ...(vat ? { vat } : {}), ...(name ? { name } : {}) } : null;

  return { lines, partnerHint };
}

export function matchBillLine(
  row: RawBillLine,
  indexes: ProductIndexes
): Pick<ClassifiedBillLine, "status" | "productId" | "reason" | "candidates"> {
  if (!Number.isFinite(row.qty) || row.qty <= 0) {
    return {
      status: "error",
      productId: null,
      candidates: [],
      reason: "invalid_qty",
    };
  }
  if (!Number.isFinite(row.price) || row.price < 0) {
    return {
      status: "error",
      productId: null,
      candidates: [],
      reason: "invalid_price",
    };
  }

  const code = (row.code || "").trim();
  const name = (row.name || "").trim();

  if (code) {
    const byBarcode = indexes.byBarcode[code] || [];
    if (byBarcode.length === 1) {
      return {
        status: "matched",
        productId: byBarcode[0],
        candidates: [],
        reason: "barcode",
      };
    }
    if (byBarcode.length > 1) {
      return {
        status: "review",
        productId: null,
        candidates: [...byBarcode],
        reason: "ambiguous_barcode",
      };
    }

    const byCode = indexes.byCode[code] || [];
    if (byCode.length === 1) {
      return {
        status: "matched",
        productId: byCode[0],
        candidates: [],
        reason: "default_code",
      };
    }
    if (byCode.length > 1) {
      return {
        status: "review",
        productId: null,
        candidates: [...byCode],
        reason: "ambiguous_code",
      };
    }
  }

  if (name) {
    const byName = indexes.byName[name.toLowerCase()] || [];
    if (byName.length === 1) {
      return {
        status: "matched",
        productId: byName[0],
        candidates: [],
        reason: "name",
      };
    }
    if (byName.length > 1) {
      return {
        status: "review",
        productId: null,
        candidates: [...byName],
        reason: "ambiguous_name",
      };
    }
  }

  return {
    status: "review",
    productId: null,
    candidates: [],
    reason: "no_match",
  };
}

export function classifyBillLines(
  lines: RawBillLine[],
  indexes: ProductIndexes
): ClassifiedBillLine[] {
  return lines.map((row) => ({
    ...row,
    ...matchBillLine(row, indexes),
  }));
}

export function countBillLineStatuses(lines: ClassifiedBillLine[]): {
  matched: number;
  review: number;
  error: number;
} {
  const counts = { matched: 0, review: 0, error: 0 };
  for (const line of lines) {
    counts[line.status] += 1;
  }
  return counts;
}
