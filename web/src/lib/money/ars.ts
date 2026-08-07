/**
 * Argentine peso formatting for the Astro shell (display + money inputs).
 * Display always uses 2 decimals. Typing uses cents-from-the-right digit buffer.
 */

const MONEY_FIELD_KEYS = new Set([
  "list_price",
  "standard_price",
  "amount",
  "amount_total",
  "amount_untaxed",
  "amount_tax",
  "amount_residual",
  "amount_collected",
  "deposit",
  "price_unit",
  "price_subtotal",
  "price_total",
  "opening_balance",
  "openingBalance",
  "cash_in",
  "cash_out",
  "expected_cash",
  "transfer_total",
  "card_total",
  "counted_amount",
  "bank_deposit",
  "leave_float",
  "difference",
]);

export function formatArs(value: number): string {
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  return safe.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Parse user/pasted money text to a non-negative number, or null if invalid/empty.
 */
export function parseArs(text: string): number | null {
  if (text === null || text === undefined) return null;
  let raw = String(text).trim();
  if (!raw || raw === "$") return null;

  raw = raw.replace(/\$/g, "").replace(/\s/g, "").replace(/\u00a0/g, "");
  if (!raw) return null;
  if (raw.startsWith("-")) return null;

  // Argentine: 1.234,50
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(raw) || /^\d+,\d+$/.test(raw)) {
    const normalized = raw.replace(/\./g, "").replace(",", ".");
    const amount = Number(normalized);
    if (!Number.isFinite(amount) || amount < 0) return null;
    return amount;
  }

  // Plain integer or English decimal: 1234 / 1234.50
  if (/^\d+(\.\d+)?$/.test(raw)) {
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount < 0) return null;
    return amount;
  }

  return null;
}

export type MoneyDigitsResult = {
  digits: string;
  value: number;
  display: string;
};

/** Cents-from-the-right: digit buffer "1234" → $ 12,34 */
export function applyMoneyDigits(digits: string): MoneyDigitsResult {
  const clean = String(digits ?? "").replace(/\D/g, "").slice(0, 12);
  const value = Number(clean || "0") / 100;
  return {
    digits: clean,
    value,
    display: formatArs(value),
  };
}

export function digitsFromAmount(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "";
  return String(Math.round(value * 100));
}

export function isMoneyFieldKey(key: string): boolean {
  if (!key) return false;
  if (MONEY_FIELD_KEYS.has(key)) return true;
  if (key.startsWith("amount_")) return true;
  if (key.startsWith("price_") && key !== "price_list_id") return true;
  return false;
}
