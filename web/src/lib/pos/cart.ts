export type PosCartLine = {
  productId: number;
  name: string;
  price: number;
  qty: number;
  discount: number;
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
  imageUrl?: string;
};

export function emptyCart(): PosCart {
  return { lines: [], orderDiscount: 0 };
}

export function addToCart(cart: PosCart, product: PosCartProduct): PosCart {
  const qty = Math.max(1, Number(product.qty) || 1);
  const existing = cart.lines.find((line) => line.productId === product.productId);
  if (existing) {
    return {
      ...cart,
      lines: cart.lines.map((line) =>
        line.productId === product.productId
          ? {
              ...line,
              qty: line.qty + qty,
              price: product.price,
              name: product.name,
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
        price: product.price,
        qty,
        discount: 0,
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
  const next = Math.max(0, Number(price) || 0);
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

export function lineSubtotal(line: PosCartLine): number {
  const gross = line.price * line.qty;
  return gross * (1 - (Number(line.discount) || 0) / 100);
}

export function linesSubtotal(cart: PosCart): number {
  return cart.lines.reduce((sum, line) => sum + lineSubtotal(line), 0);
}

export function cartTotal(cart: PosCart): number {
  return linesSubtotal(cart) * (1 - (Number(cart.orderDiscount) || 0) / 100);
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
