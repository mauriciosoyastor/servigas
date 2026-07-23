/**
 * Allowlisted minimal order creates (quotation / RFQ).
 */

export type OrderCreateDef = {
  listKey: string;
  model: string;
  partnerRankField: "customer_rank" | "supplier_rank";
  lineQtyField: "product_uom_qty" | "product_qty";
};

const ORDER_CREATES: Record<string, OrderCreateDef> = {
  "sales/quotations": {
    listKey: "sales/quotations",
    model: "sale.order",
    partnerRankField: "customer_rank",
    lineQtyField: "product_uom_qty",
  },
  "purchase/rfq": {
    listKey: "purchase/rfq",
    model: "purchase.order",
    partnerRankField: "supplier_rank",
    lineQtyField: "product_qty",
  },
};

export type OrderCreateValues = {
  partnerId: number;
  productId: number;
  qty: number;
};

export function getOrderCreateDef(listKey: string): OrderCreateDef | null {
  return ORDER_CREATES[listKey] || null;
}

export function canCreateOrder(listKey: string): boolean {
  return Boolean(getOrderCreateDef(listKey));
}

export function filterOrderCreateValues(
  listKey: string,
  values: Record<string, unknown>
): OrderCreateValues | null {
  if (!getOrderCreateDef(listKey)) return null;

  const partnerId = Number(values.partnerId ?? values.partner_id);
  const productId = Number(values.productId ?? values.product_id);
  const qtyRaw = values.qty ?? values.product_uom_qty ?? values.product_qty ?? 1;
  const qty = Number(qtyRaw);

  if (!Number.isFinite(partnerId) || partnerId <= 0) return null;
  if (!Number.isFinite(productId) || productId <= 0) return null;
  if (!Number.isFinite(qty) || qty <= 0) return null;

  return {
    partnerId,
    productId,
    qty,
  };
}
