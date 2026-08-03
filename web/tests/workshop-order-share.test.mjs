import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { OdooAdapter } from "../src/lib/bff/odoo-adapter.ts";
import {
  WORKSHOP_ORDER_EMAIL_TEMPLATE,
  WORKSHOP_ORDER_PDF_REPORT,
  canFetchWorkshopOrderPdf,
  canSendWorkshopOrderEmail,
  missingWorkshopContactHint,
  parseWorkshopOrderPdfSlug,
  resolveWorkshopShareContacts,
  workshopOrderPdfFilename,
  workshopOrderPdfPath,
  workshopOrderWhatsappMessage,
} from "../src/lib/shell/workshop-order-share.ts";
import { __setBackendForTests } from "../src/lib/bff/get-backend.ts";
import { BFF_COOKIE, sessionStore } from "../src/lib/bff/session-store.ts";
import { GET as getWorkshopOrderPdf } from "../src/pages/api/reports/workshop-order/[...slug].ts";
import { POST as postSendWorkshopOrderEmail } from "../src/pages/api/workshop-orders/send-email.ts";

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

describe("workshop-order-share allowlist", () => {
  it("allows only workshop/orders", () => {
    assert.equal(canFetchWorkshopOrderPdf("workshop/orders"), true);
    assert.equal(canSendWorkshopOrderEmail("workshop/orders"), true);
    assert.equal(
      workshopOrderPdfPath("workshop/orders", 12),
      "/api/reports/workshop-order/workshop/orders/12"
    );
    assert.equal(canFetchWorkshopOrderPdf("sales/orders"), false);
    assert.equal(workshopOrderPdfPath("workshop/orders", 0), "");
  });

  it("parses slug and keeps report/template fixed", () => {
    assert.deepEqual(parseWorkshopOrderPdfSlug("workshop/orders/12"), {
      listKey: "workshop/orders",
      id: 12,
    });
    assert.equal(parseWorkshopOrderPdfSlug("workshop/orders"), null);
    assert.equal(
      WORKSHOP_ORDER_PDF_REPORT,
      "servigas_core.report_sg_work_order"
    );
    assert.equal(
      WORKSHOP_ORDER_EMAIL_TEMPLATE,
      "servigas_core.email_template_sg_work_order"
    );
  });

  it("builds filename, WA message and contact hints", () => {
    assert.equal(workshopOrderPdfFilename("OT/2026-08-03/0012", 12), "OT-2026-08-03-0012.pdf");
    assert.match(
      workshopOrderWhatsappMessage("OT/2026-08-03/0012", "Ana"),
      /orden de trabajo OT\/2026-08-03\/0012/
    );
    assert.equal(
      missingWorkshopContactHint({ phone: null, email: null }),
      "Cargá el teléfono/mail del cliente"
    );
    assert.equal(
      missingWorkshopContactHint({ phone: "54911", email: null }),
      "Cargá el mail del cliente"
    );
  });

  it("resolves partner phone/email with owner_phone fallback", () => {
    const a = resolveWorkshopShareContacts({
      partnerName: "Ana",
      partnerEmail: "ana@x.com",
      partnerPhone: "",
      partnerMobile: "1155551111",
      ownerName: "Papel",
      ownerPhone: "1144442222",
    });
    assert.equal(a.displayName, "Ana");
    assert.equal(a.email, "ana@x.com");
    assert.ok(a.phone); // normalized mobile

    const b = resolveWorkshopShareContacts({
      partnerName: null,
      partnerEmail: null,
      partnerPhone: null,
      partnerMobile: null,
      ownerName: "Papel",
      ownerPhone: "1144442222",
    });
    assert.equal(b.displayName, "Papel");
    assert.equal(b.email, null);
    assert.ok(b.phone);
  });
});

describe("OdooAdapter workshop order PDF + email", () => {
  it("streams workshop PDF from fixed report", async () => {
    const pdfBytes = new TextEncoder().encode("%PDF-1.4 workshop");
    const fetchImpl = mock.fn(async (url) => {
      const href = String(url);
      if (href.endsWith("/web/dataset/call_kw")) {
        return Response.json({
          result: [
            {
              id: 12,
              name: "OT/2026/0012",
              display_name: "OT/2026/0012",
            },
          ],
        });
      }
      if (href.includes(`/report/pdf/${WORKSHOP_ORDER_PDF_REPORT}/12`)) {
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

    const out = await adapter.fetchWorkshopOrderPdf(
      "sess",
      "workshop/orders",
      12
    );

    assert.equal(out.filename, "OT-2026-0012.pdf");
    assert.equal(new TextDecoder().decode(out.body).startsWith("%PDF-"), true);
  });

  it("loads share meta using partner contacts and owner fallback fields", async () => {
    const fetchImpl = mock.fn(async (_url, init) => {
      const body = JSON.parse(String(init.body));
      if (body.params.model === "sg.work.order") {
        assert.deepEqual(body.params.args[1], [
          "name",
          "partner_id",
          "owner_name",
          "owner_phone",
        ]);
        return Response.json({
          result: [{
            id: 12,
            name: "OT/2026/0012",
            partner_id: [9, "Ana"],
            owner_name: "Papel",
            owner_phone: "1144442222",
          }],
        });
      }
      assert.equal(body.params.model, "res.partner");
      assert.deepEqual(body.params.args[1], ["name", "email", "phone", "mobile"]);
      return Response.json({
        result: [{
          id: 9,
          name: "Ana",
          email: "ana@x.com",
          phone: false,
          mobile: "1155559999",
        }],
      });
    });
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });

    const meta = await adapter.getWorkshopOrderShareMeta(
      "sess",
      "workshop/orders",
      12
    );

    assert.equal(meta.displayName, "Ana");
    assert.equal(meta.email, "ana@x.com");
    assert.equal(meta.phone, "541155559999");
    assert.match(meta.whatsappUrl || "", /wa\.me\/541155559999/);
    assert.equal(
      meta.pdfPath,
      "/api/reports/workshop-order/workshop/orders/12"
    );
  });

  it("sends workshop email through fixed template without sale transition", async () => {
    const methods = [];
    const fetchImpl = mock.fn(async (_url, init) => {
      const body = JSON.parse(String(init.body));
      methods.push(`${body.params.model}.${body.params.method}`);
      if (body.params.model === "sg.work.order") {
        return Response.json({
          result: [{
            id: 12,
            name: "OT/2026/0012",
            partner_id: [9, "Ana"],
          }],
        });
      }
      if (body.params.model === "res.partner") {
        return Response.json({
          result: [{ id: 9, name: "Ana", email: "ana@x.com" }],
        });
      }
      if (body.params.model === "ir.model.data") {
        assert.deepEqual(body.params.args?.[0], [
          ["module", "=", "servigas_core"],
          ["name", "=", "email_template_sg_work_order"],
        ]);
        return Response.json({ result: [{ id: 1, res_id: 77 }] });
      }
      if (body.params.model === "mail.template") {
        assert.equal(body.params.method, "send_mail");
        assert.deepEqual(body.params.args, [77, 12]);
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

    const out = await adapter.sendWorkshopOrderEmail(
      "sess",
      "workshop/orders",
      12
    );

    assert.deepEqual(out, {
      ok: true,
      email: "ana@x.com",
      orderName: "OT/2026/0012",
    });
    assert.ok(methods.includes("mail.template.send_mail"));
    assert.equal(
      methods.some((entry) => entry.endsWith(".action_quotation_sent")),
      false
    );
  });
});

describe("workshop-order report + send-email API", () => {
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
        return {
          id: 12,
          title: "OT/2026/0012",
          listPath: "/lists/workshop/orders",
          fields: [],
        };
      },
      async fetchWorkshopOrderPdf(_session, listKey, id) {
        assert.equal(listKey, "workshop/orders");
        assert.equal(id, 12);
        return {
          body: pdfBytes.buffer,
          contentType: "application/pdf",
          filename: "OT-2026-0012.pdf",
        };
      },
    });
    try {
      const response = await getWorkshopOrderPdf({
        cookies,
        params: { slug: ["workshop", "orders", "12"] },
        url: new URL(
          "http://localhost/api/reports/workshop-order/workshop/orders/12"
        ),
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
      async sendWorkshopOrderEmail(_session, listKey, id) {
        assert.equal(listKey, "workshop/orders");
        assert.equal(id, 12);
        return {
          ok: true,
          email: "ana@x.com",
          orderName: "OT/2026/0012",
        };
      },
    });
    try {
      const response = await postSendWorkshopOrderEmail({
        cookies,
        request: {
          json: async () => ({ listKey: "workshop/orders", id: 12 }),
        },
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        ok: true,
        email: "ana@x.com",
        orderName: "OT/2026/0012",
      });
    } finally {
      __setBackendForTests(undefined);
      sessionStore.destroy(bffSid);
    }
  });
});
