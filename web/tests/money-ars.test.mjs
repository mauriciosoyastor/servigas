import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  applyMoneyDigits,
  formatArs,
  isMoneyFieldKey,
  parseArs,
} from "../src/lib/money/ars.ts";

describe("formatArs", () => {
  it("formats with peso sign, thousands dots and two decimals", () => {
    assert.equal(formatArs(1234.5), "$\u00a01.234,50");
    assert.equal(formatArs(0), "$\u00a00,00");
    assert.equal(formatArs(12), "$\u00a012,00");
  });
});

describe("parseArs", () => {
  it("parses Argentine formatted amounts", () => {
    assert.equal(parseArs("$ 1.234,50"), 1234.5);
    assert.equal(parseArs("1.234,5"), 1234.5);
    assert.equal(parseArs("100"), 100);
  });

  it("parses unambiguous English decimal point", () => {
    assert.equal(parseArs("1234.50"), 1234.5);
    assert.equal(parseArs("$1234.5"), 1234.5);
  });

  it("returns null for empty or invalid", () => {
    assert.equal(parseArs(""), null);
    assert.equal(parseArs("$"), null);
    assert.equal(parseArs("abc"), null);
    assert.equal(parseArs("-10"), null);
  });
});

describe("applyMoneyDigits (cents from the right)", () => {
  it("builds amounts digit by digit", () => {
    assert.deepEqual(applyMoneyDigits("1"), {
      digits: "1",
      value: 0.01,
      display: formatArs(0.01),
    });
    assert.deepEqual(applyMoneyDigits("12"), {
      digits: "12",
      value: 0.12,
      display: formatArs(0.12),
    });
    assert.deepEqual(applyMoneyDigits("1234"), {
      digits: "1234",
      value: 12.34,
      display: formatArs(12.34),
    });
  });

  it("treats empty as zero", () => {
    assert.deepEqual(applyMoneyDigits(""), {
      digits: "",
      value: 0,
      display: formatArs(0),
    });
  });
});

describe("isMoneyFieldKey", () => {
  it("flags money columns and skips qty/discount/stock", () => {
    assert.equal(isMoneyFieldKey("list_price"), true);
    assert.equal(isMoneyFieldKey("amount_total"), true);
    assert.equal(isMoneyFieldKey("price_unit"), true);
    assert.equal(isMoneyFieldKey("qty_available"), false);
    assert.equal(isMoneyFieldKey("discount"), false);
    assert.equal(isMoneyFieldKey("id"), false);
  });
});
