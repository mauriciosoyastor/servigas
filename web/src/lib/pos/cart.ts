export type PosCartLine = {
  productId: number;
  name: string;
  price: number;
  qty: number;
  discount: number;
};

export type PosCart = {
  lines: PosCartLine[];
};

export type PosCartProduct = {
  productId: number;
  name: string;
  price: number;
  qty?: number;
};

export function emptyCart(): PosCart {
  return { lines: [] };
}

export function addToCart(cart: PosCart, product: PosCartProduct): PosCart {
  const qty = Math.max(1, Number(product.qty) || 1);
  const existing = cart.lines.find((line) => line.productId === product.productId);
  if (existing) {
    return {
      lines: cart.lines.map((line) =>
        line.productId === product.productId
          ? {
              ...line,
              qty: line.qty + qty,
              price: product.price,
              name: product.name,
            }
          : line
      ),
    };
  }
  return {
    lines: [
      ...cart.lines,
      {
        productId: product.productId,
        name: product.name,
        price: product.price,
        qty,
        discount: 0,
      },
    ],
  };
}

export function setCartQty(cart: PosCart, productId: number, qty: number): PosCart {
  const nextQty = Math.floor(Number(qty) || 0);
  if (nextQty <= 0) return removeFromCart(cart, productId);
  return {
    lines: cart.lines.map((line) =>
      line.productId === productId ? { ...line, qty: nextQty } : line
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
    lines: cart.lines.map((line) =>
      line.productId === productId ? { ...line, discount: pct } : line
    ),
  };
}

export function removeFromCart(cart: PosCart, productId: number): PosCart {
  return {
    lines: cart.lines.filter((line) => line.productId !== productId),
  };
}

export function lineSubtotal(line: PosCartLine): number {
  const gross = line.price * line.qty;
  return gross * (1 - (Number(line.discount) || 0) / 100);
}

export function cartTotal(cart: PosCart): number {
  return cart.lines.reduce((sum, line) => sum + lineSubtotal(line), 0);
}
