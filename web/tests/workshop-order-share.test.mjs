import { describe, it } from "node:test";
import assert from "node:assert/strict";
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
