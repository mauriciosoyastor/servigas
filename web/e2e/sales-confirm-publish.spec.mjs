/**
 * Tracer: click Confirmar cotización + click Publicar FC.
 * Seed via API; mutate actions via real browser clicks + waitForResponse.
 */
import { test, expect } from "@playwright/test";
import { loginViaUi, stripDevToolbar } from "./helpers/auth.mjs";
import {
  pickPartnerAndProduct,
  createQuotation,
  createInvoiceFromOrder,
} from "./helpers/api.mjs";

test.describe.configure({ mode: "serial" });

test("sales: click Confirmar cotización + Publicar FC", async ({ page }) => {
  await loginViaUi(page);
  const request = page.context().request;

  const { partnerId, productId } = await pickPartnerAndProduct(request);
  const quotation = await createQuotation(request, partnerId, productId);

  await page.goto(quotation.detailPath);
  await stripDevToolbar(page);

  const confirmBtn = page.locator("[data-record-confirm-btn]");
  await expect(confirmBtn).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());

  const confirmResponsePromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/records/sales/quotations") &&
      res.request().method() === "POST" &&
      res.status() < 500
  );

  await confirmBtn.click();
  const confirmRes = await confirmResponsePromise;
  expect(confirmRes.ok()).toBeTruthy();
  const confirmBody = await confirmRes.json().catch(() => ({}));
  expect(
    confirmBody.state === "sale" || confirmBody.ok === true
  ).toBeTruthy();

  // Control reloads ~450ms after OK; wait for post-confirm UI
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(600);
  await stripDevToolbar(page);

  // After confirm, same SO id is the order; create FC via API
  const invoice = await createInvoiceFromOrder(request, quotation.id);

  await page.goto(invoice.detailPath);
  await stripDevToolbar(page);

  const publishBtn = page.locator("[data-record-confirm-btn]");
  await expect(publishBtn).toBeVisible();
  await expect(publishBtn).toContainText(/Publicar/i);

  page.once("dialog", (dialog) => dialog.accept());

  const publishResponsePromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/records/accounting/customer-invoices") &&
      res.request().method() === "POST" &&
      res.status() < 500
  );

  await publishBtn.click();
  const publishRes = await publishResponsePromise;
  expect(publishRes.ok()).toBeTruthy();

  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(600);
  await stripDevToolbar(page);

  // Published: Publicar CTA gone, or payment / posted state visible
  const stillPublish = page.locator(
    '[data-record-confirm-btn]:has-text("Publicar")'
  );
  const paymentCue = page.getByText(/Registrar cobro|Publicado|posted/i);
  await expect
    .poll(async () => {
      const publishVisible = await stillPublish.isVisible().catch(() => false);
      const paymentVisible = await paymentCue
        .first()
        .isVisible()
        .catch(() => false);
      return !publishVisible || paymentVisible;
    })
    .toBeTruthy();
});
