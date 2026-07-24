/**
 * Allowlisted payment registration from posted invoices (FC/FP).
 * Specs: accounting-ops-prioridad-alta + fc-pdf-payment-method
 */

import { resolveRecordListKey } from "./record-lists.ts";

export type PaymentRegisterDef = {
  listKey: string;
  model: "account.move";
  /** inbound = cobro cliente; outbound = pago proveedor */
  paymentDirection: "inbound" | "outbound";
  expectedMoveTypes: string[];
};

export type PaymentMethodCode = "cash" | "transfer" | "card";

export const PAYMENT_METHOD_OPTIONS: ReadonlyArray<{
  value: PaymentMethodCode;
  label: string;
}> = [
  { value: "cash", label: "Efectivo" },
  { value: "transfer", label: "Transferencia" },
  { value: "card", label: "Tarjeta" },
];

const PAYMENT_METHOD_CODES = new Set<PaymentMethodCode>([
  "cash",
  "transfer",
  "card",
]);

const PAYMENT_REGISTERS: Record<string, PaymentRegisterDef> = {
  "accounting/customer-invoices": {
    listKey: "accounting/customer-invoices",
    model: "account.move",
    paymentDirection: "inbound",
    expectedMoveTypes: ["out_invoice"],
  },
  "accounting/receivable": {
    listKey: "accounting/receivable",
    model: "account.move",
    paymentDirection: "inbound",
    expectedMoveTypes: ["out_invoice"],
  },
  "accounting/vendor-bills": {
    listKey: "accounting/vendor-bills",
    model: "account.move",
    paymentDirection: "outbound",
    expectedMoveTypes: ["in_invoice"],
  },
  "accounting/payable": {
    listKey: "accounting/payable",
    model: "account.move",
    paymentDirection: "outbound",
    expectedMoveTypes: ["in_invoice"],
  },
};

const PAYABLE_PAYMENT_STATES = new Set(["not_paid", "partial", "in_payment"]);

function canonicalKey(listKey: string): string {
  return resolveRecordListKey(listKey) || listKey;
}

export function getPaymentRegisterDef(
  listKey: string
): PaymentRegisterDef | null {
  return PAYMENT_REGISTERS[canonicalKey(listKey)] || null;
}

export function canRegisterPayment(listKey: string): boolean {
  return Boolean(getPaymentRegisterDef(listKey));
}

export function isPaymentRegisterableState(
  state: string | null | undefined,
  paymentState: string | null | undefined
): boolean {
  if (String(state || "") !== "posted") return false;
  return PAYABLE_PAYMENT_STATES.has(String(paymentState || ""));
}

export function normalizePaymentMethod(
  raw: unknown
): PaymentMethodCode | null {
  const value = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (PAYMENT_METHOD_CODES.has(value as PaymentMethodCode)) {
    return value as PaymentMethodCode;
  }
  return null;
}

export function paymentMethodLabel(code: PaymentMethodCode): string {
  return (
    PAYMENT_METHOD_OPTIONS.find((option) => option.value === code)?.label ||
    code
  );
}

export type PaymentRegisterValues = {
  /** Omit / null → usar residual completo en Odoo */
  amount?: number;
  paymentMethod: PaymentMethodCode;
};

/**
 * Filtra monto opcional + medio de pago.
 * - paymentMethod obligatorio (cash|transfer|card)
 * - amount opcional (> 0)
 */
export function filterPaymentRegisterValues(
  listKey: string,
  values: Record<string, unknown>
): PaymentRegisterValues | null {
  if (!getPaymentRegisterDef(listKey)) return null;
  const paymentMethod = normalizePaymentMethod(
    values.paymentMethod ?? values.method
  );
  if (!paymentMethod) return null;

  const out: PaymentRegisterValues = { paymentMethod };
  if (!("amount" in values) || values.amount === null || values.amount === "") {
    return out;
  }
  const amount = Number(values.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  out.amount = amount;
  return out;
}

/** Preferencias de nombre al elegir diario bank. */
export function journalNameHints(method: PaymentMethodCode): string[] {
  if (method === "transfer") {
    return ["transferencia", "transfer", "banco"];
  }
  if (method === "card") {
    return ["tarjeta", "card", "credito", "crédito", "debito", "débito"];
  }
  return ["efectivo", "caja", "cash"];
}

/**
 * Elige journal_id entre candidatos {id, name, type}.
 * cash → type cash; transfer/card → type bank con hint de nombre.
 */
function pickByNameHints(
  journals: Array<{ id: number; name?: string; type?: string }>,
  hints: string[]
): number | null {
  // Preferir hints en orden (más específicos primero: "transferencia" antes que "banco").
  for (const hint of hints) {
    const match = journals.find((j) =>
      String(j.name || "").toLowerCase().includes(hint)
    );
    if (match) return match.id;
  }
  return journals[0]?.id ?? null;
}

export function pickJournalId(
  method: PaymentMethodCode,
  journals: Array<{ id: number; name?: string; type?: string }>
): number | null {
  const hints = journalNameHints(method);
  if (method === "cash") {
    return pickByNameHints(
      journals.filter((j) => j.type === "cash"),
      hints
    );
  }
  return pickByNameHints(
    journals.filter((j) => j.type === "bank"),
    hints
  );
}
