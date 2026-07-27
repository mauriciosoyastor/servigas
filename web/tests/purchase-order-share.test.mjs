import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { OdooAdapter } from "../src/lib/bff/odoo-adapter.ts";
import { BffError } from "../src/lib/bff/errors.ts";
import {
  PURCHASE_ORDER_PDF_REPORT,
  PURCHASE_ORDER_EMAIL_TEMPLATE,
  canFetchPurchaseOrderPdf,
  canSendPurchaseOrderEmail,
  missingVendorContactHint,
  normalizeWhatsappPhone,
  parsePurchaseOrderPdfSlug,
  purchaseOrderPdfFilename,
  purchaseOrderPdfPath,
  purchaseOrderWhatsappMessage,
  purchaseOrderWhatsappUrl,
} from "../src/lib/shell/purchase-order-share.ts";
import { __setBackendForTests } from "../src/lib/bff/get-backend.ts";
import { BFF_COOKIE, sessionStore } from "../src/lib/bff/session-store.ts";
import { GET as getPurchaseOrderPdf } from "../src/pages/api/reports/purchase-order/[...slug].ts";
import { POST as postSendPurchaseOrderEmail } from "../src/pages/api/purchase-orders/send-email.ts";

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

describe("purchase-order-share allowlist", () => {
  it("allows confirmed purchase order fichas only", () => {
    assert.equal(canFetchPurchaseOrderPdf("purchase/orders"), true);
    assert.equal(canSendPurchaseOrderEmail("purchase/orders"), true);
    assert.equal(
      purchaseOrderPdfPath("purchase/orders", 7),
      "/api/reports/purchase-order/purchase/orders/7"
    );
    assert.equal(canFetchPurchaseOrderPdf("purchase/solicitudes"), false);
    assert.equal(purchaseOrderPdfPath("purchase/solicitudes", 1), "");
    assert.equal(purchaseOrderPdfPath("purchase/orders", 0), "");
  });

  it("parses slug and keeps report/template xmlids fixed", () => {
    assert.deepEqual(parsePurchaseOrderPdfSlug("purchase/orders/7"), {
      listKey: "purchase/orders",
      id: 7,
    });
    assert.equal(parsePurchaseOrderPdfSlug("purchase/solicitudes/7"), null);
    assert.equal(parsePurchaseOrderPdfSlug("purchase/orders"), null);
    assert.equal(PURCHASE_ORDER_PDF_REPORT, "purchase.report_purchaseorder");
    assert.equal(
      PURCHASE_ORDER_EMAIL_TEMPLATE,
      "purchase.email_template_edi_purchase_done"
    );
  });

  it("builds safe filename and WhatsApp helpers", () => {
    assert.equal(purchaseOrderPdfFilename("P00007", 7), "P00007.pdf");
    assert.equal(purchaseOrderPdfFilename("", 7), "orden-compra-7.pdf");
    assert.equal(normalizeWhatsappPhone("+54 11 5555-1234"), "541155551234");
    assert.equal(normalizeWhatsappPhone("011 5555-1234"), "541155551234");
    assert.equal(normalizeWhatsappPhone(""), null);
    assert.equal(
      purchaseOrderWhatsappMessage("P00007", "Rodrigo"),
      "Hola Rodrigo, te envío la orden de compra P00007. Por favor revisá el PDF adjunto."
    );
    assert.equal(
      purchaseOrderWhatsappUrl("541155551234", "Hola"),
      "https://wa.me/541155551234?text=Hola"
    );
    assert.equal(purchaseOrderWhatsappUrl(null, "Hola"), null);
  });

  it("hints when vendor phone or email is missing", () => {
    assert.equal(
      missingVendorContactHint({ phone: null, email: "a@b.com" }),
      "Cargá el teléfono del proveedor"
    );
    assert.equal(
      missingVendorContactHint({ phone: "11", email: null }),
      "Cargá el mail del proveedor"
    );
    assert.equal(
      missingVendorContactHint({ phone: null, email: null }),
      "Cargá el teléfono/mail del proveedor"
    );
    assert.equal(
      missingVendorContactHint({ phone: "11", email: "a@b.com" }),
      null
    );
  });
});

describe("OdooAdapter purchase order PDF + email", () => {
  it("streams PO PDF from the fixed report endpoint", async () => {
    const pdfBytes = new TextEncoder().encode("%PDF-1.4 po");
    const fetchImpl = mock.fn(async (url, init) => {
      const href = String(url);
      if (href.endsWith("/web/dataset/call_kw")) {
        const body = JSON.parse(String(init.body));
        assert.equal(body.params.model, "purchase.order");
        assert.equal(body.params.method, "read");
        return Response.json({
          result: [{ id: 7, name: "P00007", display_name: "P00007" }],
        });
      }
      if (href.includes(`/report/pdf/${PURCHASE_ORDER_PDF_REPORT}/7`)) {
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
    const out = await adapter.fetchPurchaseOrderPdf("sess", "purchase/orders", 7);
    assert.equal(out.contentType, "application/pdf");
    assert.equal(out.filename, "P00007.pdf");
    assert.equal(new TextDecoder().decode(out.body).startsWith("%PDF-"), true);
  });

  it("rejects allowlist misses for PDF", async () => {
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl: async () => Response.json({ result: [] }),
    });
    await assert.rejects(
      () => adapter.fetchPurchaseOrderPdf("sess", "purchase/solicitudes", 1),
      (err) => err instanceof BffError && err.code === "not_found"
    );
  });

  it("loads share meta from order + partner contacts", async () => {
    const fetchImpl = mock.fn(async (url, init) => {
      const body = JSON.parse(String(init.body));
      if (body.params.model === "purchase.order") {
        return Response.json({
          result: [
            {
              id: 7,
              name: "P00007",
              partner_id: [3, "Rodrigo Capcias"],
            },
          ],
        });
      }
      if (body.params.model === "res.partner") {
        return Response.json({
          result: [
            {
              id: 3,
              name: "Rodrigo Capcias",
              email: "rodrigo@example.com",
              phone: "011 5555-1234",
              mobile: false,
            },
          ],
        });
      }
      throw new Error("unexpected");
    });
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });
    const meta = await adapter.getPurchaseOrderShareMeta(
      "sess",
      "purchase/orders",
      7
    );
    assert.equal(meta.orderName, "P00007");
    assert.equal(meta.partnerName, "Rodrigo Capcias");
    assert.equal(meta.email, "rodrigo@example.com");
    assert.equal(meta.phone, "541155551234");
    assert.match(meta.whatsappUrl || "", /^https:\/\/wa\.me\/541155551234\?text=/);
    assert.equal(meta.missingContactHint, null);
    assert.equal(meta.pdfPath, "/api/reports/purchase-order/purchase/orders/7");
  });

  it("sendPurchaseOrderEmail uses fixed template and requires vendor email", async () => {
    const calls = [];
    const fetchImpl = mock.fn(async (url, init) => {
      const body = JSON.parse(String(init.body));
      calls.push(body.params);
      if (
        body.params.model === "purchase.order" &&
        body.params.method === "read"
      ) {
        return Response.json({
          result: [
            {
              id: 7,
              name: "P00007",
              state: "purchase",
              partner_id: [3, "Rodrigo"],
            },
          ],
        });
      }
      if (body.params.model === "res.partner") {
        return Response.json({
          result: [{ id: 3, name: "Rodrigo", email: "r@x.com", phone: false, mobile: false }],
        });
      }
      if (
        body.params.model === "ir.model.data" &&
        body.params.method === "xmlid_to_res_id"
      ) {
        assert.deepEqual(body.params.args, [
          PURCHASE_ORDER_EMAIL_TEMPLATE,
        ]);
        return Response.json({ result: 99 });
      }
      if (
        body.params.model === "mail.template" &&
        body.params.method === "send_mail"
      ) {
        assert.deepEqual(body.params.args, [99, 7]);
        assert.equal(body.params.kwargs.force_send, true);
        return Response.json({ result: 1 });
      }
      throw new Error(`unexpected ${body.params.model}.${body.params.method}`);
    });

    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });
    const out = await adapter.sendPurchaseOrderEmail(
      "sess",
      "purchase/orders",
      7
    );
    assert.equal(out.ok, true);
    assert.equal(out.email, "r@x.com");
    assert.equal(out.orderName, "P00007");

    const noEmail = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl: async (_url, init) => {
        const body = JSON.parse(String(init.body));
        if (body.params.model === "purchase.order") {
          return Response.json({
            result: [
              {
                id: 7,
                name: "P00007",
                state: "purchase",
                partner_id: [3, "Rodrigo"],
              },
            ],
          });
        }
        return Response.json({
          result: [{ id: 3, name: "Rodrigo", email: false, phone: false, mobile: false }],
        });
      },
    });
    await assert.rejects(
      () => noEmail.sendPurchaseOrderEmail("sess", "purchase/orders", 7),
      (err) =>
        err instanceof BffError &&
        err.code === "validation_error" &&
        /mail del proveedor/i.test(err.message)
    );
  });
});

describe("purchase-order report + send-email API", () => {
  it("GET proxies inline PDF", async () => {
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
          id: 7,
          title: "P00007",
          listPath: "/lists/purchase/orders",
          fields: [],
        };
      },
      async fetchPurchaseOrderPdf() {
        return {
          body: pdfBytes.buffer,
          contentType: "application/pdf",
          filename: "P00007.pdf",
        };
      },
    });
    try {
      const response = await getPurchaseOrderPdf({
        cookies,
        params: { slug: ["purchase", "orders", "7"] },
        url: new URL(
          "http://localhost/api/reports/purchase-order/purchase/orders/7"
        ),
      });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "application/pdf");
      assert.match(
        response.headers.get("content-disposition") || "",
        /inline; filename="P00007\.pdf"/
      );
    } finally {
      __setBackendForTests(undefined);
      sessionStore.destroy(bffSid);
    }
  });

  it("POST send-email proxies backend result", async () => {
    const cookies = new FakeCookies();
    const bffSid = sessionStore.create("odoo-sess", {
      uid: 2,
      name: "Admin",
      login: "admin",
    });
    cookies.values.set(BFF_COOKIE, bffSid);
    __setBackendForTests({
      async sendPurchaseOrderEmail(_sid, listKey, id) {
        assert.equal(listKey, "purchase/orders");
        assert.equal(id, 7);
        return { ok: true, email: "r@x.com", orderName: "P00007" };
      },
    });
    try {
      const response = await postSendPurchaseOrderEmail({
        cookies,
        request: {
          json: async () => ({ listKey: "purchase/orders", id: 7 }),
        },
      });
      assert.equal(response.status, 200);
      const payload = await response.json();
      assert.equal(payload.ok, true);
      assert.equal(payload.email, "r@x.com");
    } finally {
      __setBackendForTests(undefined);
      sessionStore.destroy(bffSid);
    }
  });
});
