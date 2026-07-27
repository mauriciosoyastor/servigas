/**
 * Tracer compras: click Confirmar OC en ficha de solicitud/pedido.
 * Seed RFQ vía API; solo el confirm va por browser.
 */
import { test, expect } from "@playwright/test";
import { loginViaUi, stripDevToolbar } from "./helpers/auth.mjs";
import { pickVendorAndProduct, createPurchaseRfq } from "./helpers/api.mjs";

test("purchase: click Confirmar OC", async ({ page }) => {
  await loginViaUi(page);
  const request = page.context().request;

  const { partnerId, productId } = await pickVendorAndProduct(request);
  const rfq = await createPurchaseRfq(request, partnerId, productId);

  await page.goto(rfq.detailPath);
  await stripDevToolbar(page);

  const confirmBtn = page.locator("[data-record-confirm-btn]");
  await expect(confirmBtn).toBeVisible();
  await expect(confirmBtn).toContainText(/Confirmar OC/i);

  page.once("dialog", (dialog) => dialog.accept());

  const confirmResPromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/records/purchase/solicitudes") &&
      res.request().method() === "POST" &&
      res.status() < 500
  );

  await confirmBtn.click();
  const confirmRes = await confirmResPromise;
  expect(confirmRes.ok()).toBeTruthy();
  const body = await confirmRes.json().catch(() => ({}));
  expect(body.state === "purchase" || body.ok === true).toBeTruthy();

  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(600);
  await stripDevToolbar(page);

  // Post-confirm: CTA Confirmar OC desaparece
  await expect(
    page.locator('[data-record-confirm-btn]:has-text("Confirmar OC")')
  ).toHaveCount(0, { timeout: 10_000 });
});
