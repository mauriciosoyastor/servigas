/**
 * Allowlisted payment registration from posted invoices (FC/FP).
 * Specs: accounting-ops-prioridad-alta + fc-pdf-payment-method
 *
 * Medios alineados al Mostrador (pos.payment.method / labels BFF).
 */

import { resolveRecordListKey } from "./record-lists.ts";

export type PaymentRegisterDef = {
  listKey: string;
  model: "account.move";
  /** inbound = cobro cliente; outbound = pago proveedor */
  paymentDirection: "inbound" | "outbound";
  expectedMoveTypes: string[];
};

/** Codes accepted by register_payment (Mostrador + legacy `card`). */
export type PaymentMethodCode =
  | "cash"
  | "transfer"
  | "account"
  | "debit"
  | "mercadopago"
  | "card";

export const PAYMENT_METHOD_OPTIONS: ReadonlyArray<{
  value: Exclude<PaymentMethodCode, "card">;
  label: string;
}> = [
  { value: "cash", label: "Efectivo" },
  { value: "transfer", label: "Transferencia / depósito al banco" },
  { value: "account", label: "Cuenta corriente" },
  { value: "debit", label: "Débito" },
  { value: "mercadopago", label: "Mercado Pago" },
];

const PAYMENT_METHOD_CODES = new Set<string>([
  "cash",
  "transfer",
  "account",
  "debit",
  "mercadopago",
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
  if (!PAYMENT_METHOD_CODES.has(value)) return null;
  // Legacy UI/API "card" → Débito del Mostrador.
  if (value === "card") return "debit";
  return value as PaymentMethodCode;
}

export function paymentMethodLabel(code: PaymentMethodCode): string {
  if (code === "card") return "Débito";
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
 * - paymentMethod obligatorio (códigos Mostrador; `card` se normaliza a debit)
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

/** Preferencias de nombre al elegir diario bank/cash. */
export function journalNameHints(method: PaymentMethodCode): string[] {
  if (method === "transfer") {
    return ["transferencia", "transfer", "depósito", "deposito", "banco"];
  }
  if (method === "mercadopago") {
    return ["mercado pago", "mercadopago", "mp"];
  }
  if (method === "debit" || method === "card") {
    return ["débito", "debito", "debit", "tarjeta", "card"];
  }
  if (method === "account") {
    return ["cuenta corriente", "cuenta", "crédito", "credito"];
  }
  return ["efectivo", "caja", "cash"];
}

/**
 * Elige journal_id entre candidatos {id, name, type}.
 * cash → type cash; resto → type bank con hint de nombre.
 */
function pickByNameHints(
  journals: Array<{ id: number; name?: string; type?: string }>,
  hints: string[]
): number | null {
  // Preferir hints en orden (más específicos primero).
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
