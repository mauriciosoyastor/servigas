/** Display labels for POS payment methods (Odoo often ships English names). */
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  card: "Transferencia",
  "customer account": "Crédito",
};

export function localizePaymentMethodName(name: string): string {
  const key = name.trim().toLowerCase();
  return PAYMENT_METHOD_LABELS[key] ?? name;
}
