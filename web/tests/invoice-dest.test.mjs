import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CUIT_DEST_REQUIRED_MSG,
  CUIT_INVALID_MSG,
  CUIT_INVALID_WARN_MSG,
  INVOICE_DEST_CF,
  INVOICE_DEST_CUIT,
  invoiceDestBadge,
  invoiceDestLabel,
  invoiceDestVatError,
  invoiceDestVatWarning,
  needsCuitWarning,
  normalizeInvoiceDest,
  suggestedDocType,
  suggestedDocTypeShort,
} from "../src/lib/shell/invoice-dest.ts";

describe("invoice-dest helpers", () => {
  it("normalizes unknown values to cf", () => {
    assert.equal(normalizeInvoiceDest(undefined), INVOICE_DEST_CF);
    assert.equal(normalizeInvoiceDest("CUIT"), INVOICE_DEST_CUIT);
    assert.equal(normalizeInvoiceDest("cf"), INVOICE_DEST_CF);
  });

  it("formats badge and label", () => {
    assert.equal(invoiceDestBadge("cf"), "CF");
    assert.equal(invoiceDestBadge("cuit"), "CUIT");
    assert.equal(invoiceDestLabel("cf"), "Consumidor final");
    assert.equal(invoiceDestLabel("cuit"), "Con CUIT");
  });

  it("requires vat when destination is cuit", () => {
    assert.equal(
      invoiceDestVatError({ sg_invoice_dest: "cuit", vat: "" }),
      CUIT_DEST_REQUIRED_MSG
    );
    assert.equal(
      invoiceDestVatError({ sg_invoice_dest: "cuit", vat: "20-12345678-6" }),
      null
    );
    assert.equal(
      invoiceDestVatError({ sg_invoice_dest: "cuit", vat: "20123456789" }),
      CUIT_INVALID_MSG
    );
    assert.equal(invoiceDestVatError({ sg_invoice_dest: "cf" }), null);
    assert.equal(
      invoiceDestVatError({ sg_invoice_dest: "cf", vat: "20123456789" }),
      null
    );
    assert.equal(invoiceDestVatError({ phone: "11" }), null);
  });

  it("warns on CF with invalid vat without blocking", () => {
    assert.equal(
      invoiceDestVatWarning({ sg_invoice_dest: "cf", vat: "20123456789" }),
      CUIT_INVALID_WARN_MSG
    );
    assert.equal(
      invoiceDestVatWarning({ sg_invoice_dest: "cf", vat: "20123456786" }),
      null
    );
    assert.equal(
      invoiceDestVatWarning({ sg_invoice_dest: "cuit", vat: "20123456789" }),
      null
    );
  });

  it("flags POS warning when cuit dest lacks vat or checksum fails", () => {
    assert.equal(needsCuitWarning("cuit", ""), true);
    assert.equal(needsCuitWarning("cuit", "20123456786"), false);
    assert.equal(needsCuitWarning("cuit", "20123456789"), true);
    assert.equal(needsCuitWarning("cf", ""), false);
    assert.equal(needsCuitWarning("cf", "20123456789"), true);
  });

  it("suggests document type from destination", () => {
    assert.equal(suggestedDocTypeShort("cf"), "B/C");
    assert.equal(suggestedDocTypeShort("cuit"), "A/B");
    assert.equal(suggestedDocType("cf").code, "bc_cf");
    assert.equal(suggestedDocType("cuit").code, "ab_cuit");
    assert.match(suggestedDocType("cf").label, /B\/C/);
    assert.match(suggestedDocType("cuit").label, /A\/B/);
  });
});
