import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  bufferValue,
  emptyNumpad,
  pressBackspace,
  pressDigit,
  selectLine,
  setNumpadMode,
} from "../src/lib/pos/numpad.ts";
import {
  addToCart,
  cartTotal,
  checkoutLinesFromCart,
  effectiveLineDiscount,
  emptyCart,
  setCartPrice,
  setCartQty,
  setOrderDiscount,
} from "../src/lib/pos/cart.ts";

describe("pos numpad", () => {
  it("starts empty in qty mode", () => {
    assert.deepEqual(emptyNumpad(), {
      mode: "qty",
      buffer: "",
      selectedProductId: null,
    });
  });

  it("builds buffer with digits and backspace", () => {
    let pad = emptyNumpad();
    pad = pressDigit(pad, "1");
    pad = pressDigit(pad, "2");
    pad = pressDigit(pad, ".");
    pad = pressDigit(pad, "5");
    assert.equal(pad.buffer, "12.5");
    assert.equal(bufferValue(pad), 12.5);
    pad = pressBackspace(pad);
    assert.equal(pad.buffer, "12.");
    pad = setNumpadMode(pad, "price");
    assert.equal(pad.mode, "price");
    assert.equal(pad.buffer, "");
  });

  it("selects a line and clears buffer", () => {
    let pad = pressDigit(emptyNumpad(), "9");
    pad = selectLine(pad, 42);
    assert.equal(pad.selectedProductId, 42);
    assert.equal(pad.buffer, "");
  });
});

describe("pos cart order discount", () => {
  it("applies order discount on top of line discount", () => {
    let cart = addToCart(emptyCart(), {
      productId: 1,
      name: "X",
      price: 100,
      qty: 2,
    });
    cart = setCartQty(cart, 1, 2);
    cart = setOrderDiscount(cart, 10);
    assert.equal(cart.orderDiscount, 10);
    assert.equal(cartTotal(cart), 180);
    assert.equal(effectiveLineDiscount(10, 10), 19);
    const lines = checkoutLinesFromCart({
      ...cart,
      lines: [{ ...cart.lines[0], discount: 10 }],
    });
    assert.equal(lines[0].discount, 19);
  });

  it("sets unit price via helper", () => {
    let cart = addToCart(emptyCart(), {
      productId: 7,
      name: "Y",
      price: 50,
      qty: 1,
    });
    cart = setCartPrice(cart, 7, 80);
    assert.equal(cart.lines[0].price, 80);
    assert.equal(cartTotal(cart), 80);
  });
});
