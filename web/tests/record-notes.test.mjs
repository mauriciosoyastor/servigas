import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_NOTE_BODY_LENGTH,
  normalizeNoteBody,
  odooHtmlFromPlainText,
  plainTextFromOdooHtml,
  resolveNoteTarget,
} from "../src/lib/shell/record-notes.ts";

describe("record-notes allowlist", () => {
  it("resolves partner / product / sale / purchase listKeys", () => {
    assert.equal(resolveNoteTarget("sales/customers")?.model, "res.partner");
    assert.equal(resolveNoteTarget("purchase/vendors")?.model, "res.partner");
    assert.equal(resolveNoteTarget("inventory/products")?.model, "product.template");
    assert.equal(resolveNoteTarget("sales/orders")?.model, "sale.order");
    assert.equal(resolveNoteTarget("sales/quotations")?.model, "sale.order");
    assert.equal(resolveNoteTarget("purchase/orders")?.model, "purchase.order");
    assert.equal(resolveNoteTarget("purchase/solicitudes")?.model, "purchase.order");
  });

  it("rejects models outside v1 (e.g. variants, transfers)", () => {
    assert.equal(resolveNoteTarget("inventory/variants"), null);
    assert.equal(resolveNoteTarget("inventory/transfers"), null);
    assert.equal(resolveNoteTarget("nope"), null);
  });
});

describe("record-notes body", () => {
  it("trims and rejects empty / too long", () => {
    assert.deepEqual(normalizeNoteBody("  hola  "), { ok: true, body: "hola" });
    assert.equal(normalizeNoteBody("   ").ok, false);
    assert.equal(normalizeNoteBody("").ok, false);
    assert.equal(normalizeNoteBody("x".repeat(MAX_NOTE_BODY_LENGTH + 1)).ok, false);
  });

  it("round-trips plain text through html helpers", () => {
    const html = odooHtmlFromPlainText('a <b> & "x"');
    assert.match(html, /&lt;b&gt;/);
    assert.equal(plainTextFromOdooHtml("<p>hola<br/>mundo</p>"), "hola\nmundo");
  });
});
