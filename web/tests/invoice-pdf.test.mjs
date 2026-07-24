import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { OdooAdapter } from "../src/lib/bff/odoo-adapter.ts";
import { BffError } from "../src/lib/bff/errors.ts";
import {
  canFetchInvoicePdf,
  INVOICE_PDF_REPORT,
  invoicePdfFilename,
  invoicePdfPath,
  parseInvoicePdfSlug,
} from "../src/lib/shell/invoice-pdf.ts";
import { __setBackendForTests } from "../src/lib/bff/get-backend.ts";
import { BFF_COOKIE, sessionStore } from "../src/lib/bff/session-store.ts";
import { GET as getInvoicePdf } from "../src/pages/api/reports/invoice/[...slug].ts";

class FakeCookies {
  values = new Map();
  get(name) {
    const value = this.values.get(name);
    return value === undefined ? undefined : { value };
  }
  set(name, value) {
    this.values.set(name, value);
  }
  delete(name) {
    this.values.delete(name);
  }
}

describe("invoice-pdf allowlist", () => {
  it("allows accounting move fichas", () => {
    for (const key of [
      "accounting/customer-invoices",
      "accounting/vendor-bills",
      "accounting/credit-notes",
      "accounting/vendor-refunds",
      "accounting/drafts",
    ]) {
      assert.equal(canFetchInvoicePdf(key), true);
      assert.equal(
        invoicePdfPath(key, 12),
        `/api/reports/invoice/${key}/12`
      );
    }
    assert.equal(canFetchInvoicePdf("inventory/products"), false);
    assert.equal(invoicePdfPath("inventory/products", 1), "");
    assert.equal(invoicePdfPath("accounting/customer-invoices", 0), "");
  });

  it("parses slug and rejects free-form paths", () => {
    assert.deepEqual(parseInvoicePdfSlug("accounting/customer-invoices/7"), {
      listKey: "accounting/customer-invoices",
      id: 7,
    });
    assert.equal(parseInvoicePdfSlug("inventory/products/7"), null);
    assert.equal(parseInvoicePdfSlug("accounting/customer-invoices"), null);
    assert.equal(parseInvoicePdfSlug("accounting/customer-invoices/abc"), null);
  });

  it("builds a safe filename", () => {
    assert.equal(invoicePdfFilename("FC A-0001-00001234", 9), "FC-A-0001-00001234.pdf");
    assert.equal(invoicePdfFilename("", 9), "comprobante-9.pdf");
    assert.match(invoicePdfFilename('a/b"c', 1), /\.pdf$/);
  });

  it("keeps the Odoo report XMLID fixed", () => {
    assert.equal(INVOICE_PDF_REPORT, "account.report_invoice_with_payments");
  });
});

describe("OdooAdapter.fetchInvoicePdf", () => {
  it("streams PDF bytes from the fixed report endpoint", async () => {
    const pdfBytes = new TextEncoder().encode("%PDF-1.4 fake");
    const fetchImpl = mock.fn(async (url, init) => {
      const href = String(url);
      if (href.endsWith("/web/dataset/call_kw")) {
        const body = JSON.parse(String(init.body));
        assert.equal(body.params.model, "account.move");
        assert.equal(body.params.method, "read");
        return Response.json({
          result: [{ id: 5, name: "INV/2026/0005", display_name: "INV/2026/0005" }],
        });
      }
      if (href.includes(`/report/pdf/${INVOICE_PDF_REPORT}/5`)) {
        assert.match(String(init.headers.cookie), /session_id=sess/);
        return new Response(pdfBytes, {
          status: 200,
          headers: { "content-type": "application/pdf" },
        });
      }
      throw new Error(`unexpected url ${href}`);
    });

    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });

    const out = await adapter.fetchInvoicePdf(
      "sess",
      "accounting/customer-invoices",
      5
    );
    assert.equal(out.contentType, "application/pdf");
    assert.equal(out.filename, "INV-2026-0005.pdf");
    assert.equal(new TextDecoder().decode(out.body).startsWith("%PDF-"), true);
  });

  it("rejects allowlist misses and non-PDF payloads", async () => {
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl: async () => Response.json({ result: [{ id: 1, name: "X" }] }),
    });
    await assert.rejects(
      () => adapter.fetchInvoicePdf("sess", "inventory/products", 1),
      (err) => err instanceof BffError && err.code === "not_found"
    );

    const bad = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl: async (url) => {
        if (String(url).includes("/call_kw")) {
          return Response.json({
            result: [{ id: 1, name: "X", display_name: "X" }],
          });
        }
        return new Response("<html>login</html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        });
      },
    });
    await assert.rejects(
      () => bad.fetchInvoicePdf("sess", "accounting/customer-invoices", 1),
      (err) => err instanceof BffError && err.code === "odoo_unavailable"
    );
  });
});

describe("GET /api/reports/invoice/[...slug]", () => {
  it("proxies inline PDF with no-store cache", async () => {
    const cookies = new FakeCookies();
    const bffSid = sessionStore.create("odoo-sess", {
      uid: 2,
      name: "Admin",
      login: "admin",
    });
    cookies.values.set(BFF_COOKIE, bffSid);

    const pdfBytes = new TextEncoder().encode("%PDF-1.4 ok");
    __setBackendForTests({
      async getRecordDetail() {
        return {
          id: 3,
          title: "FC-3",
          listPath: "/lists/accounting/customer-invoices",
          fields: [],
        };
      },
      async fetchInvoicePdf() {
        return {
          body: pdfBytes.buffer,
          contentType: "application/pdf",
          filename: "FC-3.pdf",
        };
      },
    });

    try {
      const response = await getInvoicePdf({
        cookies,
        params: { slug: ["accounting", "customer-invoices", "3"] },
        url: new URL("http://localhost/api/reports/invoice/accounting/customer-invoices/3"),
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "application/pdf");
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      assert.match(
        response.headers.get("content-disposition") || "",
        /inline; filename="FC-3\.pdf"/
      );
      const bytes = new Uint8Array(await response.arrayBuffer());
      assert.equal(new TextDecoder().decode(bytes).startsWith("%PDF-"), true);

      const download = await getInvoicePdf({
        cookies,
        params: { slug: ["accounting", "customer-invoices", "3"] },
        url: new URL(
          "http://localhost/api/reports/invoice/accounting/customer-invoices/3?download=1"
        ),
      });
      assert.match(
        download.headers.get("content-disposition") || "",
        /^attachment;/
      );
    } finally {
      __setBackendForTests(undefined);
      sessionStore.destroy(bffSid);
    }
  });
});
