/**
 * CUIT argentino — normalización + dígito verificador AFIP.
 */

const WEIGHTS = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2] as const;

/** Digitos solo; 11 chars o null si no califica. */
export function normalizeCuit(raw: unknown): string | null {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length !== 11) return null;
  return digits;
}

/** Check digit for the first 10 digits (string of length 10). */
export function cuitCheckDigit(base10: string): number {
  if (!/^\d{10}$/.test(base10)) {
    throw new RangeError("cuitCheckDigit expects 10 digits");
  }
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += Number(base10[i]) * WEIGHTS[i];
  }
  const rem = sum % 11;
  if (rem === 0) return 0;
  if (rem === 1) return 9;
  return 11 - rem;
}

export function isValidCuit(raw: unknown): boolean {
  const digits = normalizeCuit(raw);
  if (!digits) return false;
  const expected = cuitCheckDigit(digits.slice(0, 10));
  return Number(digits[10]) === expected;
}
