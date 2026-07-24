import { roundCents, splitAmount } from "./tax.ts";

export type PosCartLine = {
  productId: number;
  name: string;
  price: number;
  qty: number;
  discount: number;
  taxRate: number;
  priceIncludesTax: boolean;
  imageUrl?: string;
};

export type PosCart = {
  lines: PosCartLine[];
  orderDiscount: number;
};

export type PosCartProduct = {
  productId: number;
  name: string;
  price: number;
  qty?: number;
  taxRate?: number;
  priceIncludesTax?: boolean;
  imageUrl?: string;
};

export type CartAmounts = {
  untaxed: number;
  tax: number;
  total: number;
};

export function emptyCart(): PosCart {
  return { lines: [], orderDiscount: 0 };
}

export function addToCart(cart: PosCart, product: PosCartProduct): PosCart {
  const qty = Math.max(1, Number(product.qty) || 1);
  const taxRate = Math.max(0, Number(product.taxRate) || 0);
  const priceIncludesTax = product.priceIncludesTax === true;
  const price = roundCents(Math.max(0, Number(product.price) || 0));
  const existing = cart.lines.find((line) => line.productId === product.productId);
  if (existing) {
    return {
      ...cart,
      lines: cart.lines.map((line) =>
        line.productId === product.productId
          ? {
              ...line,
              qty: line.qty + qty,
              price,
              name: product.name,
              taxRate,
              priceIncludesTax,
              imageUrl: product.imageUrl || line.imageUrl,
            }
          : line
      ),
    };
  }
  return {
    ...cart,
    lines: [
      ...cart.lines,
      {
        productId: product.productId,
        name: product.name,
        price,
        qty,
        discount: 0,
        taxRate,
        priceIncludesTax,
        imageUrl: product.imageUrl || undefined,
      },
    ],
  };
}

export function setCartQty(cart: PosCart, productId: number, qty: number): PosCart {
  const nextQty = Math.floor(Number(qty) || 0);
  if (nextQty <= 0) return removeFromCart(cart, productId);
  return {
    ...cart,
    lines: cart.lines.map((line) =>
      line.productId === productId ? { ...line, qty: nextQty } : line
    ),
  };
}

export function setCartPrice(
  cart: PosCart,
  productId: number,
  price: number
): PosCart {
  const next = roundCents(Math.max(0, Number(price) || 0));
  return {
    ...cart,
    lines: cart.lines.map((line) =>
      line.productId === productId ? { ...line, price: next } : line
    ),
  };
}

export function setCartDiscount(
  cart: PosCart,
  productId: number,
  discount: number
): PosCart {
  const pct = Math.min(100, Math.max(0, Number(discount) || 0));
  return {
    ...cart,
    lines: cart.lines.map((line) =>
      line.productId === productId ? { ...line, discount: pct } : line
    ),
  };
}

export function setOrderDiscount(cart: PosCart, discount: number): PosCart {
  const pct = Math.min(100, Math.max(0, Number(discount) || 0));
  return { ...cart, orderDiscount: pct };
}

export function removeFromCart(cart: PosCart, productId: number): PosCart {
  return {
    ...cart,
    lines: cart.lines.filter((line) => line.productId !== productId),
  };
}

/** Discounted line amount before IVA split (list price basis). */
export function lineSubtotal(line: PosCartLine): number {
  const gross = line.price * line.qty;
  return roundCents(gross * (1 - (Number(line.discount) || 0) / 100));
}

export function linesSubtotal(cart: PosCart): number {
  return roundCents(
    cart.lines.reduce((sum, line) => sum + lineSubtotal(line), 0)
  );
}

export function lineAmounts(
  line: PosCartLine,
  orderDiscount = 0
): CartAmounts {
  const afterOrder = roundCents(
    lineSubtotal(line) * (1 - (Number(orderDiscount) || 0) / 100)
  );
  return splitAmount(afterOrder, line.taxRate, line.priceIncludesTax);
}

export function cartAmounts(cart: PosCart): CartAmounts {
  let untaxed = 0;
  let tax = 0;
  let total = 0;
  for (const line of cart.lines) {
    const amounts = lineAmounts(line, cart.orderDiscount);
    untaxed += amounts.untaxed;
    tax += amounts.tax;
    total += amounts.total;
  }
  return {
    untaxed: roundCents(untaxed),
    tax: roundCents(tax),
    total: roundCents(total),
  };
}

/** Amount to collect (includes IVA when lines have taxRate). */
export function cartTotal(cart: PosCart): number {
  return cartAmounts(cart).total;
}

/** Combine line % and order % into one effective line discount for checkout. */
export function effectiveLineDiscount(
  lineDiscount: number,
  orderDiscount: number
): number {
  const line = Math.min(100, Math.max(0, Number(lineDiscount) || 0));
  const order = Math.min(100, Math.max(0, Number(orderDiscount) || 0));
  return Number((100 * (1 - (1 - line / 100) * (1 - order / 100))).toFixed(4));
}

export function checkoutLinesFromCart(cart: PosCart): {
  productId: number;
  qty: number;
  price: number;
  discount: number;
}[] {
  return cart.lines.map((line) => ({
    productId: line.productId,
    qty: line.qty,
    price: line.price,
    discount: effectiveLineDiscount(line.discount, cart.orderDiscount),
  }));
}
