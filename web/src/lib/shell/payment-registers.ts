/**
 * Allowlisted payment registration from posted invoices (FC/FP).
 * Spec: docs/superpowers/specs/2026-07-24-accounting-ops-prioridad-alta-design.md
 */

import { resolveRecordListKey } from "./record-lists.ts";

export type PaymentRegisterDef = {
  listKey: string;
  model: "account.move";
  /** inbound = cobro cliente; outbound = pago proveedor */
  paymentDirection: "inbound" | "outbound";
  expectedMoveTypes: string[];
};

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

export type PaymentRegisterValues = {
  /** Omit / null → usar residual completo en Odoo */
  amount?: number;
};

/**
 * Filtra el monto opcional del body.
 * - Sin amount / null / "" → {} (pago total residual)
 * - amount > 0 → { amount }
 * - inválido → null
 */
export function filterPaymentRegisterValues(
  listKey: string,
  values: Record<string, unknown>
): PaymentRegisterValues | null {
  if (!getPaymentRegisterDef(listKey)) return null;
  if (!("amount" in values) || values.amount === null || values.amount === "") {
    return {};
  }
  const amount = Number(values.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount };
}
