/**
 * Tracer: click Publicar en ficha FP (factura de proveedor).
 * Seed: FP con adjunto vía API; solo el publish va por browser.
 */
import { test, expect } from "@playwright/test";
import { loginViaUi, stripDevToolbar } from "./helpers/auth.mjs";
import { seedVendorBillDraft } from "./helpers/api.mjs";

test("accounting: click Publicar FP", async ({ page }) => {
  await loginViaUi(page);
  const bill = await seedVendorBillDraft(page.context().request);

  await page.goto(bill.detailPath);
  await stripDevToolbar(page);

  const publishBtn = page.locator("[data-record-confirm-btn]");
  await expect(publishBtn).toBeVisible({ timeout: 15_000 });
  await expect(publishBtn).toContainText(/Publicar/i);

  page.once("dialog", (dialog) => dialog.accept());

  const publishResPromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/records/accounting/vendor-bills") &&
      res.request().method() === "POST" &&
      res.status() < 500
  );

  await publishBtn.click();
  const publishRes = await publishResPromise;
  expect(publishRes.ok()).toBeTruthy();
  const body = await publishRes.json().catch(() => ({}));
  expect(body.state === "posted" || body.ok === true).toBeTruthy();

  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(600);
  await stripDevToolbar(page);

  await expect(
    page.locator('[data-record-confirm-btn]:has-text("Publicar")')
  ).toHaveCount(0, { timeout: 10_000 });
});
