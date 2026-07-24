import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  addToCart,
  cartAmounts,
  cartTotal,
  emptyCart,
  lineSubtotal,
} from "../src/lib/pos/cart.ts";
import { roundCents, splitAmount, summarizeTaxes } from "../src/lib/pos/tax.ts";

describe("pos tax helpers", () => {
  it("rounds to centavos", () => {
    assert.equal(roundCents(10.005), 10.01);
    assert.equal(roundCents(10.004), 10);
  });

  it("adds IVA when price excludes tax", () => {
    assert.deepEqual(splitAmount(100, 21, false), {
      untaxed: 100,
      tax: 21,
      total: 121,
    });
  });

  it("extracts IVA when price includes tax", () => {
    assert.deepEqual(splitAmount(121, 21, true), {
      untaxed: 100,
      tax: 21,
      total: 121,
    });
  });

  it("summarizes percent sale taxes", () => {
    assert.deepEqual(
      summarizeTaxes([
        { amount: 21, amount_type: "percent", price_include: false },
        { amount: 0, amount_type: "fixed", price_include: false },
      ]),
      { taxRate: 21, priceIncludesTax: false }
    );
  });
});

describe("pos cart with IVA", () => {
  it("keeps totals without tax when rate is zero", () => {
    let cart = addToCart(emptyCart(), {
      productId: 1,
      name: "A",
      price: 100.5,
      qty: 2,
    });
    assert.equal(cart.lines[0].taxRate, 0);
    assert.equal(lineSubtotal(cart.lines[0]), 201);
    assert.equal(cartTotal(cart), 201);
  });

  it("adds 21% IVA on discounted lines", () => {
    let cart = addToCart(emptyCart(), {
      productId: 7,
      name: "X",
      price: 100,
      qty: 2,
      taxRate: 21,
    });
    const amounts = cartAmounts(cart);
    assert.equal(amounts.untaxed, 200);
    assert.equal(amounts.tax, 42);
    assert.equal(amounts.total, 242);
    assert.equal(cartTotal(cart), 242);
  });
});
