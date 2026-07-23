/** Round to Argentine peso centavos (2 decimals). */
export function roundCents(value: number): number {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export type SplitAmount = {
  untaxed: number;
  tax: number;
  total: number;
};

/**
 * Split a discounted line/ticket amount into untaxed + IVA.
 * `taxRate` is percent (e.g. 21). Prices sin IVA → priceIncludesTax=false.
 */
export function splitAmount(
  amount: number,
  taxRate: number,
  priceIncludesTax = false
): SplitAmount {
  const rate = Math.max(0, Number(taxRate) || 0) / 100;
  if (priceIncludesTax && rate > 0) {
    const total = roundCents(amount);
    const untaxed = roundCents(total / (1 + rate));
    return { untaxed, tax: roundCents(total - untaxed), total };
  }
  const untaxed = roundCents(amount);
  const tax = roundCents(untaxed * rate);
  return { untaxed, tax, total: roundCents(untaxed + tax) };
}

/** Sum percent sale taxes; price_include wins if any tax includes it. */
export function summarizeTaxes(
  taxes: { amount?: number; amount_type?: string; price_include?: boolean }[]
): { taxRate: number; priceIncludesTax: boolean } {
  let taxRate = 0;
  let priceIncludesTax = false;
  for (const tax of taxes || []) {
    const type = String(tax.amount_type || "percent");
    if (type !== "percent" && type !== "division") continue;
    taxRate += Number(tax.amount) || 0;
    if (tax.price_include === true) priceIncludesTax = true;
  }
  return { taxRate, priceIncludesTax };
}
