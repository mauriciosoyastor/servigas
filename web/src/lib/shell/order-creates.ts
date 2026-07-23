/**
 * Allowlisted order creates (quotation / RFQ), multi-line.
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

export type OrderCreateLine = {
  productId: number;
  qty: number;
  price?: number;
  discount?: number;
};

export type OrderCreateValues = {
  partnerId: number;
  lines: OrderCreateLine[];
};

export function getOrderCreateDef(listKey: string): OrderCreateDef | null {
  return ORDER_CREATES[listKey] || null;
}

export function canCreateOrder(listKey: string): boolean {
  return Boolean(getOrderCreateDef(listKey));
}

function parseLine(raw: unknown): OrderCreateLine | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const productId = Number(row.productId ?? row.product_id);
  const qty = Number(row.qty ?? row.product_uom_qty ?? row.product_qty);
  if (!Number.isFinite(productId) || productId <= 0) return null;
  if (!Number.isFinite(qty) || qty <= 0) return null;

  const line: OrderCreateLine = { productId, qty };

  if ("price" in row || "price_unit" in row) {
    const price = Number(row.price ?? row.price_unit);
    if (!Number.isFinite(price) || price < 0) return null;
    line.price = price;
  }

  if ("discount" in row) {
    const discount = Number(row.discount);
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      return null;
    }
    line.discount = discount;
  }

  return line;
}

export function filterOrderCreateValues(
  listKey: string,
  values: Record<string, unknown>
): OrderCreateValues | null {
  if (!getOrderCreateDef(listKey)) return null;

  const partnerId = Number(values.partnerId ?? values.partner_id);
  if (!Number.isFinite(partnerId) || partnerId <= 0) return null;

  let lines: OrderCreateLine[] = [];
  if (Array.isArray(values.lines)) {
    for (const raw of values.lines) {
      const line = parseLine(raw);
      if (!line) return null;
      lines.push(line);
    }
  } else {
    const legacy = parseLine({
      productId: values.productId ?? values.product_id,
      qty: values.qty ?? values.product_uom_qty ?? values.product_qty ?? 1,
      ...("price" in values || "price_unit" in values
        ? { price: values.price ?? values.price_unit }
        : {}),
      ...("discount" in values ? { discount: values.discount } : {}),
    });
    if (legacy) lines = [legacy];
  }

  if (!lines.length) return null;
  return { partnerId, lines };
}
