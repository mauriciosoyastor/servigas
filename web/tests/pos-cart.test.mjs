import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addToCart,
  cartTotal,
  emptyCart,
  lineSubtotal,
  removeFromCart,
  setCartDiscount,
  setCartQty,
} from "../src/lib/pos/cart.ts";

describe("pos cart", () => {
  it("starts empty", () => {
    assert.deepEqual(emptyCart(), { lines: [], orderDiscount: 0 });
  });

  it("adds a product line and accumulates qty", () => {
    let cart = emptyCart();
    cart = addToCart(cart, {
      productId: 10,
      name: "Calefactor",
      price: 100,
      qty: 1,
    });
    cart = addToCart(cart, {
      productId: 10,
      name: "Calefactor",
      price: 100,
      qty: 2,
    });
    assert.equal(cart.lines.length, 1);
    assert.equal(cart.lines[0].qty, 3);
    assert.equal(cart.lines[0].discount, 0);
    assert.equal(cart.lines[0].taxRate, 0);
    assert.equal(cartTotal(cart), 300);
  });

  it("sets qty and removes at zero", () => {
    let cart = addToCart(emptyCart(), {
      productId: 1,
      name: "A",
      price: 50,
      qty: 2,
    });
    cart = setCartQty(cart, 1, 1);
    assert.equal(cart.lines[0].qty, 1);
    cart = setCartQty(cart, 1, 0);
    assert.equal(cart.lines.length, 0);
    cart = addToCart(emptyCart(), {
      productId: 2,
      name: "B",
      price: 10,
      qty: 1,
    });
    cart = removeFromCart(cart, 2);
    assert.equal(cart.lines.length, 0);
  });

  it("applies line discount percent to totals", () => {
    let cart = addToCart(emptyCart(), {
      productId: 7,
      name: "X",
      price: 200,
      qty: 2,
    });
    cart = setCartDiscount(cart, 7, 10);
    assert.equal(cart.lines[0].discount, 10);
    assert.equal(lineSubtotal(cart.lines[0]), 360);
    assert.equal(cartTotal(cart), 360);
    cart = setCartDiscount(cart, 7, 150);
    assert.equal(cart.lines[0].discount, 100);
    assert.equal(cartTotal(cart), 0);
  });

  it("keeps product image url on cart lines", () => {
    let cart = addToCart(emptyCart(), {
      productId: 3,
      name: "Foto",
      price: 10,
      qty: 1,
      imageUrl: "/media/3.jpg",
    });
    assert.equal(cart.lines[0].imageUrl, "/media/3.jpg");
    cart = addToCart(cart, {
      productId: 3,
      name: "Foto",
      price: 10,
      qty: 1,
    });
    assert.equal(cart.lines[0].qty, 2);
    assert.equal(cart.lines[0].imageUrl, "/media/3.jpg");
  });
});
