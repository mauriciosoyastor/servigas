/** Display labels for POS payment methods (Odoo often ships English names). */
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  efectivo: "Efectivo",
  card: "Transferencia / depósito al banco",
  transferencia: "Transferencia / depósito al banco",
  "transferencia / depósito al banco": "Transferencia / depósito al banco",
  "transferencia / deposito al banco": "Transferencia / depósito al banco",
  "customer account": "Cuenta corriente",
  credito: "Cuenta corriente",
  crédito: "Cuenta corriente",
  "cuenta corriente": "Cuenta corriente",
  debit: "Débito",
  debito: "Débito",
  débito: "Débito",
  credit: "Tarjeta de crédito",
  "credit card": "Tarjeta de crédito",
  "tarjeta de credito": "Tarjeta de crédito",
  "tarjeta de crédito": "Tarjeta de crédito",
  "mercado pago": "Mercado Pago",
  mercadopago: "Mercado Pago",
};

export function localizePaymentMethodName(name: string): string {
  const key = name.trim().toLowerCase();
  return PAYMENT_METHOD_LABELS[key] ?? name;
}

/** Unique localized payment labels for a POS order (one or many methods). */
export function formatPosOrderPaymentLabel(methodNames: string[]): string {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const raw of methodNames) {
    const label = localizePaymentMethodName(String(raw || "").trim());
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(label);
  }
  return unique.join(" · ");
}
