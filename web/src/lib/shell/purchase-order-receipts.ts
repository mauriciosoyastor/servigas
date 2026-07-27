/**
 * Helpers for purchase-order ↔ inventory receipts (stock.picking).
 */

import { isConfirmableState } from "./record-actions.ts";
import { labelOdooSelection } from "./odoo-selection-labels.ts";

export type PurchaseOrderReceiptRow = {
  id: number;
  name: string;
  partnerName: string;
  origin: string | null;
  state: string;
  stateLabel: string;
  scheduledDate: string | null;
  canValidate: boolean;
  detailPath: string;
};

export type PurchaseOrderReceiptsPayload = {
  orderId: number;
  orderName: string;
  receiptStatus: string | null;
  receiptStatusLabel: string;
  pickings: PurchaseOrderReceiptRow[];
};

export function purchaseOrderReceiptDetailPath(pickingId: number): string {
  if (!Number.isFinite(pickingId) || pickingId <= 0) return "";
  return `/lists/inventory/transfers/${pickingId}`;
}

export function canValidatePurchaseReceipt(
  state: string | null | undefined
): boolean {
  return isConfirmableState("inventory/transfers", state);
}

export function mapPurchaseOrderReceiptRow(input: {
  id: number;
  name: string;
  partnerName: string;
  origin?: string | null;
  state: string;
  scheduledDate?: string | null;
}): PurchaseOrderReceiptRow {
  const state = String(input.state || "");
  return {
    id: input.id,
    name: String(input.name || `WH/${input.id}`),
    partnerName: String(input.partnerName || "Proveedor"),
    origin: input.origin ? String(input.origin) : null,
    state,
    stateLabel: String(labelOdooSelection("state", state) || state || "—"),
    scheduledDate: input.scheduledDate ? String(input.scheduledDate) : null,
    canValidate: canValidatePurchaseReceipt(state),
    detailPath: purchaseOrderReceiptDetailPath(input.id),
  };
}

export function receiptStatusLabel(
  status: string | null | undefined
): string {
  if (!status) return "Sin recepción";
  return String(labelOdooSelection("receipt_status", status) || status);
}
