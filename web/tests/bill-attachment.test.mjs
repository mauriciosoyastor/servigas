import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  BILL_ATTACHMENT_MISSING_MSG,
  BILL_ATTACHMENT_MIME_MSG,
  BILL_ATTACHMENT_SIZE_MSG,
  billSourceLabel,
  normalizeBillAttachment,
  normalizeBillSource,
} from "../src/lib/shell/bill-attachment.ts";
import { BffError } from "../src/lib/bff/errors.ts";

/** Minimal valid PNG (1x1) */
const PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
/** Minimal JPEG */
const JPEG_B64 =
  "/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=";
/** Minimal PDF */
const PDF_B64 = Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n").toString(
  "base64"
);

describe("bill-attachment", () => {
  it("normalizes PNG data-URL", () => {
    const out = normalizeBillAttachment({
      filename: "foto.png",
      mimetype: "image/png",
      content: `data:image/png;base64,${PNG_B64}`,
    });
    assert.equal(out.filename, "foto.png");
    assert.equal(out.mimetype, "image/png");
    assert.equal(out.content, PNG_B64);
  });

  it("accepts JPEG and PDF base64", () => {
    assert.equal(
      normalizeBillAttachment({
        filename: "a.jpg",
        mimetype: "image/jpeg",
        content: JPEG_B64,
      }).mimetype,
      "image/jpeg"
    );
    assert.equal(
      normalizeBillAttachment({
        filename: "b.pdf",
        mimetype: "application/pdf",
        content: PDF_B64,
      }).mimetype,
      "application/pdf"
    );
  });

  it("rejects missing content and bad mime", () => {
    assert.throws(
      () => normalizeBillAttachment({ filename: "x.png" }),
      (err) =>
        err instanceof BffError &&
        err.message === BILL_ATTACHMENT_MISSING_MSG
    );
    assert.throws(
      () =>
        normalizeBillAttachment({
          filename: "x.gif",
          mimetype: "image/gif",
          content: PNG_B64,
        }),
      (err) =>
        err instanceof BffError && err.message === BILL_ATTACHMENT_MIME_MSG
    );
  });

  it("rejects oversized payload", () => {
    const huge = Buffer.alloc(10_485_761, 0xff);
    // Force JPEG magic so mime path reaches size check after magic? Size checked before magic.
    const b64 = Buffer.concat([
      Buffer.from([0xff, 0xd8, 0xff]),
      huge,
    ]).toString("base64");
    assert.throws(
      () =>
        normalizeBillAttachment({
          filename: "big.jpg",
          mimetype: "image/jpeg",
          content: b64,
        }),
      (err) =>
        err instanceof BffError && err.message === BILL_ATTACHMENT_SIZE_MSG
    );
  });

  it("labels and normalizes bill source", () => {
    assert.equal(normalizeBillSource("whatsapp"), "whatsapp");
    assert.equal(normalizeBillSource("MAIL"), "mail");
    assert.equal(normalizeBillSource("nope"), "");
    assert.equal(billSourceLabel("whatsapp"), "WhatsApp");
    assert.equal(billSourceLabel(""), "");
  });
});
