/**
 * Human labels (es-AR) for common Odoo selection technical values
 * shown raw in Astro fichas/listas (state, payment_state, …).
 */

const STATE_LABELS: Record<string, string> = {
  draft: "Borrador",
  sent: "Enviado",
  sale: "Pedido de venta",
  done: "Hecho",
  cancel: "Cancelado",
  cancelled: "Cancelado",
  paid: "Pagado",
  invoiced: "Facturado",
  posted: "Publicado",
  waiting: "En espera",
  confirmed: "Confirmado",
  assigned: "Listo",
  partial: "Parcial",
  in_payment: "En proceso",
  not_paid: "No pagado",
  reversed: "Revertido",
  to_invoice: "A facturar",
  purchase: "Orden de compra",
  to_approve: "A aprobar",
};

const PAYMENT_STATE_LABELS: Record<string, string> = {
  not_paid: "No pagado",
  in_payment: "En proceso",
  paid: "Pagado",
  partial: "Parcial",
  reversed: "Revertido",
  invoicing_legacy: "Legacy",
};

/** purchase.order receipt_status (purchase_stock). */
const RECEIPT_STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  partial: "Parcial",
  full: "Completa",
};

const BY_FIELD: Record<string, Record<string, string>> = {
  state: STATE_LABELS,
  payment_state: PAYMENT_STATE_LABELS,
  receipt_status: RECEIPT_STATUS_LABELS,
};

export function labelOdooSelection(
  key: string,
  value: string | number | boolean | null | undefined
): string | number | boolean | null | undefined {
  if (value === null || value === undefined || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") return value;
  const map = BY_FIELD[key];
  if (!map) return value;
  const normalized = String(value).trim().toLowerCase();
  return map[normalized] || value;
}
