import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { OdooAdapter } from "../src/lib/bff/odoo-adapter.ts";
import { BffError } from "../src/lib/bff/errors.ts";
import {
  SALE_ORDER_EMAIL_TEMPLATE,
  SALE_ORDER_PDF_REPORT,
  canFetchSaleOrderPdf,
  canSendSaleOrderEmail,
  missingCustomerContactHint,
  parseSaleOrderPdfSlug,
  saleOrderPdfFilename,
  saleOrderPdfPath,
  saleOrderWhatsappMessage,
  shouldMarkQuotationSentAfterEmail,
} from "../src/lib/shell/sale-order-share.ts";
import { __setBackendForTests } from "../src/lib/bff/get-backend.ts";
import { BFF_COOKIE, sessionStore } from "../src/lib/bff/session-store.ts";
import { GET as getSaleOrderPdf } from "../src/pages/api/reports/sale-order/[...slug].ts";
import { POST as postSendSaleOrderEmail } from "../src/pages/api/sale-orders/send-email.ts";

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

describe("sale-order-share allowlist", () => {
  it("allows quotations and confirmed orders", () => {
    assert.equal(canFetchSaleOrderPdf("sales/quotations"), true);
    assert.equal(canFetchSaleOrderPdf("sales/orders"), true);
    assert.equal(canSendSaleOrderEmail("sales/orders"), true);
    assert.equal(
      saleOrderPdfPath("sales/quotations", 4),
      "/api/reports/sale-order/sales/quotations/4"
    );
    assert.equal(canFetchSaleOrderPdf("purchase/orders"), false);
    assert.equal(saleOrderPdfPath("sales/orders", 0), "");
  });

  it("parses slug and keeps report/template fixed", () => {
    assert.deepEqual(parseSaleOrderPdfSlug("sales/orders/4"), {
      listKey: "sales/orders",
      id: 4,
    });
    assert.equal(parseSaleOrderPdfSlug("sales/quotations"), null);
    assert.equal(SALE_ORDER_PDF_REPORT, "sale.report_saleorder");
    assert.equal(SALE_ORDER_EMAIL_TEMPLATE, "sale.email_template_edi_sale");
  });

  it("builds filename, message and customer hints", () => {
    assert.equal(saleOrderPdfFilename("S00004", 4), "S00004.pdf");
    assert.match(
      saleOrderWhatsappMessage("S00004", "Ana", "sales/quotations"),
      /cotización S00004/
    );
    assert.match(
      saleOrderWhatsappMessage("S00004", "Ana", "sales/orders"),
      /pedido S00004/
    );
    assert.equal(
      missingCustomerContactHint({ phone: null, email: null }),
      "Cargá el teléfono/mail del cliente"
    );
  });

  it("marks only draft quotations as sent after email", () => {
    assert.equal(shouldMarkQuotationSentAfterEmail("draft"), true);
    assert.equal(shouldMarkQuotationSentAfterEmail("sent"), false);
    assert.equal(shouldMarkQuotationSentAfterEmail("sale"), false);
    assert.equal(shouldMarkQuotationSentAfterEmail(null), false);
  });
});

describe("OdooAdapter sale order PDF + email", () => {
  it("streams sale PDF from fixed report", async () => {
    const pdfBytes = new TextEncoder().encode("%PDF-1.4 sale");
    const fetchImpl = mock.fn(async (url, init) => {
      const href = String(url);
      if (href.endsWith("/web/dataset/call_kw")) {
        return Response.json({
          result: [{ id: 4, name: "S00004", display_name: "S00004" }],
        });
      }
      if (href.includes(`/report/pdf/${SALE_ORDER_PDF_REPORT}/4`)) {
        return new Response(pdfBytes, {
          status: 200,
          headers: { "content-type": "application/pdf" },
        });
      }
      throw new Error(`unexpected ${href}`);
    });
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });
    const out = await adapter.fetchSaleOrderPdf("sess", "sales/orders", 4);
    assert.equal(out.filename, "S00004.pdf");
    assert.equal(new TextDecoder().decode(out.body).startsWith("%PDF-"), true);
  });

  it("loads share meta for customer contacts", async () => {
    const fetchImpl = mock.fn(async (_url, init) => {
      const body = JSON.parse(String(init.body));
      if (body.params.model === "sale.order") {
        return Response.json({
          result: [{ id: 4, name: "S00004", partner_id: [9, "Ana"] }],
        });
      }
      return Response.json({
        result: [
          {
            id: 9,
            name: "Ana",
            email: "ana@x.com",
            phone: "011 5555-9999",
            mobile: false,
          },
        ],
      });
    });
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });
    const meta = await adapter.getSaleOrderShareMeta(
      "sess",
      "sales/quotations",
      4
    );
    assert.equal(meta.email, "ana@x.com");
    assert.equal(meta.phone, "541155559999");
    assert.equal(meta.documentLabel, "cotización");
    assert.match(meta.whatsappUrl || "", /wa\.me\/541155559999/);
  });

  it("sendSaleOrderEmail requires customer email and uses template", async () => {
    const fetchImpl = mock.fn(async (_url, init) => {
      const body = JSON.parse(String(init.body));
      if (body.params.model === "sale.order" && body.params.method === "read") {
        return Response.json({
          result: [
            {
              id: 4,
              name: "S00004",
              state: "sale",
              partner_id: [9, "Ana"],
            },
          ],
        });
      }
      if (body.params.model === "res.partner") {
        return Response.json({
          result: [{ id: 9, name: "Ana", email: "ana@x.com" }],
        });
      }
      if (
        body.params.model === "ir.model.data" &&
        body.params.method === "search_read"
      ) {
        assert.deepEqual(body.params.args?.[0], [
          ["module", "=", "sale"],
          ["name", "=", "email_template_edi_sale"],
        ]);
        return Response.json({ result: [{ id: 1, res_id: 55 }] });
      }
      if (body.params.method === "send_mail") {
        assert.deepEqual(body.params.args, [55, 4]);
        assert.equal(body.params.kwargs.force_send, true);
        return Response.json({ result: 1 });
      }
      if (body.params.method === "action_quotation_sent") {
        throw new Error("confirmed order must not be marked sent");
      }
      throw new Error("unexpected");
    });
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });
    const out = await adapter.sendSaleOrderEmail("sess", "sales/orders", 4);
    assert.equal(out.ok, true);
    assert.equal(out.email, "ana@x.com");
    assert.equal(out.markedSent, false);
  });

  it("sendSaleOrderEmail marks draft quotation as sent", async () => {
    const methods = [];
    const fetchImpl = mock.fn(async (_url, init) => {
      const body = JSON.parse(String(init.body));
      methods.push(`${body.params.model}.${body.params.method}`);
      if (body.params.model === "sale.order" && body.params.method === "read") {
        return Response.json({
          result: [
            {
              id: 7,
              name: "S00007",
              state: "draft",
              partner_id: [9, "Ana"],
            },
          ],
        });
      }
      if (body.params.model === "res.partner") {
        return Response.json({
          result: [{ id: 9, name: "Ana", email: "ana@x.com" }],
        });
      }
      if (
        body.params.model === "ir.model.data" &&
        body.params.method === "search_read"
      ) {
        return Response.json({ result: [{ id: 1, res_id: 55 }] });
      }
      if (body.params.method === "send_mail") {
        return Response.json({ result: 1 });
      }
      if (
        body.params.model === "sale.order" &&
        body.params.method === "action_quotation_sent"
      ) {
        assert.deepEqual(body.params.args, [[7]]);
        return Response.json({ result: true });
      }
      throw new Error(`unexpected ${body.params.model}.${body.params.method}`);
    });
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });
    const out = await adapter.sendSaleOrderEmail(
      "sess",
      "sales/quotations",
      7
    );
    assert.equal(out.ok, true);
    assert.equal(out.markedSent, true);
    assert.ok(methods.includes("mail.template.send_mail"));
    assert.ok(methods.includes("sale.order.action_quotation_sent"));
    assert.ok(
      methods.indexOf("mail.template.send_mail") <
        methods.indexOf("sale.order.action_quotation_sent")
    );
  });
});

describe("sale-order report + send-email API", () => {
  it("GET proxies PDF", async () => {
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
        return { id: 4, title: "S00004", listPath: "/lists/sales/orders", fields: [] };
      },
      async fetchSaleOrderPdf() {
        return {
          body: pdfBytes.buffer,
          contentType: "application/pdf",
          filename: "S00004.pdf",
        };
      },
    });
    try {
      const response = await getSaleOrderPdf({
        cookies,
        params: { slug: ["sales", "orders", "4"] },
        url: new URL("http://localhost/api/reports/sale-order/sales/orders/4"),
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "application/pdf");
    } finally {
      __setBackendForTests(undefined);
      sessionStore.destroy(bffSid);
    }
  });

  it("POST send-email proxies backend", async () => {
    const cookies = new FakeCookies();
    const bffSid = sessionStore.create("odoo-sess", {
      uid: 2,
      name: "Admin",
      login: "admin",
    });
    cookies.values.set(BFF_COOKIE, bffSid);
    __setBackendForTests({
      async sendSaleOrderEmail(_s, listKey, id) {
        assert.equal(listKey, "sales/quotations");
        assert.equal(id, 4);
        return {
          ok: true,
          email: "ana@x.com",
          orderName: "S00004",
          markedSent: true,
        };
      },
    });
    try {
      const response = await postSendSaleOrderEmail({
        cookies,
        request: {
          json: async () => ({ listKey: "sales/quotations", id: 4 }),
        },
      });
      assert.equal(response.status, 200);
      const payload = await response.json();
      assert.equal(payload.ok, true);
    } finally {
      __setBackendForTests(undefined);
      sessionStore.destroy(bffSid);
    }
  });
});
