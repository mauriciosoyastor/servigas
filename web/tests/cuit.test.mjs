import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cuitCheckDigit,
  isValidCuit,
  normalizeCuit,
} from "../src/lib/shell/cuit.ts";

describe("cuit helpers", () => {
  it("normalizes hyphens and spaces to 11 digits", () => {
    assert.equal(normalizeCuit("20-12345678-6"), "20123456786");
    assert.equal(normalizeCuit(" 20 12345678 6 "), "20123456786");
    assert.equal(normalizeCuit(""), null);
    assert.equal(normalizeCuit("20-123"), null);
    assert.equal(normalizeCuit("abcdefghijk"), null);
  });

  it("computes AFIP check digit", () => {
    assert.equal(cuitCheckDigit("2012345678"), 6);
    // rem === 1 → dígito 9 (caso especial AFIP)
    assert.equal(cuitCheckDigit("2000000001"), 9);
    assert.equal(isValidCuit("20000000019"), true);
  });

  it("accepts valid CUIT with or without hyphens", () => {
    assert.equal(isValidCuit("20-12345678-6"), true);
    assert.equal(isValidCuit("20123456786"), true);
  });

  it("rejects empty, wrong length, and bad checksum", () => {
    assert.equal(isValidCuit(""), false);
    assert.equal(isValidCuit("20123456789"), false);
    assert.equal(isValidCuit("123"), false);
    assert.equal(isValidCuit("20-12345678-0"), false);
  });
});
