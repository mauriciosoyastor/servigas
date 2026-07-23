import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_PRODUCT_IMAGE_BYTES,
  normalizeProductImage1920,
} from "../src/lib/shell/product-image.ts";

// 1x1 PNG
const PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("normalizeProductImage1920", () => {
  it("accepts a data-URL and returns pure base64", () => {
    const out = normalizeProductImage1920(`data:image/png;base64,${PNG_B64}`);
    assert.equal(out, PNG_B64);
  });

  it("accepts pure base64 for image bytes", () => {
    const out = normalizeProductImage1920(PNG_B64);
    assert.equal(out, PNG_B64);
  });

  it("rejects non-image data-URL", () => {
    assert.throws(
      () => normalizeProductImage1920("data:text/plain;base64,aGVsbG8="),
      (err) => err?.code === "validation_error"
    );
  });

  it("rejects oversized payloads", () => {
    const huge = Buffer.alloc(MAX_PRODUCT_IMAGE_BYTES + 1, 1).toString("base64");
    assert.throws(
      () => normalizeProductImage1920(`data:image/jpeg;base64,${huge}`),
      (err) =>
        err?.code === "validation_error" &&
        String(err.message).toLowerCase().includes("grande")
    );
  });

  it("rejects empty / non-string", () => {
    assert.throws(
      () => normalizeProductImage1920(""),
      (err) => err?.code === "validation_error"
    );
    assert.throws(
      () => normalizeProductImage1920(null),
      (err) => err?.code === "validation_error"
    );
  });
});
