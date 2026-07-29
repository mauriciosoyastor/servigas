/**
 * Tracer: Volver a borrador + Anular en FC publicada (no cobrada).
 */
import { test, expect } from "@playwright/test";
import { loginViaUi, stripDevToolbar } from "./helpers/auth.mjs";
import { seedPostedCustomerInvoice } from "./helpers/api.mjs";

test("accounting: click Volver a borrador en FC", async ({ page }) => {
  await loginViaUi(page);
  const invoice = await seedPostedCustomerInvoice(page.context().request);

  await page.goto(invoice.detailPath);
  await stripDevToolbar(page);

  const resetBtn = page.locator(
    '[data-record-confirm-btn][data-action="reset_invoice_draft"]'
  );
  await expect(resetBtn).toBeVisible({ timeout: 15_000 });

  page.once("dialog", (dialog) => dialog.accept());

  const resetResPromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/records/accounting/customer-invoices") &&
      res.request().method() === "POST" &&
      res.status() < 500
  );

  await resetBtn.click();
  const resetRes = await resetResPromise;
  expect(resetRes.ok()).toBeTruthy();

  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(600);
  await stripDevToolbar(page);

  // Tras reset: aparece Publicar de nuevo
  await expect(
    page.locator('[data-record-confirm-btn]:has-text("Publicar")')
  ).toBeVisible({ timeout: 10_000 });
});

test("accounting: click Anular en FC", async ({ page }) => {
  await loginViaUi(page);
  const invoice = await seedPostedCustomerInvoice(page.context().request);

  await page.goto(invoice.detailPath);
  await stripDevToolbar(page);

  const cancelBtn = page.locator(
    '[data-record-confirm-btn][data-action="cancel_invoice"]'
  );
  await expect(cancelBtn).toBeVisible({ timeout: 15_000 });

  page.once("dialog", (dialog) => dialog.accept());

  const cancelResPromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/records/accounting/customer-invoices") &&
      res.request().method() === "POST" &&
      res.status() < 500
  );

  await cancelBtn.click();
  const cancelRes = await cancelResPromise;
  expect(cancelRes.ok()).toBeTruthy();

  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(600);
  await stripDevToolbar(page);

  await expect(cancelBtn).toHaveCount(0, { timeout: 10_000 });
  await expect(
    page.locator('[data-record-confirm-btn][data-action="reset_invoice_draft"]')
  ).toHaveCount(0);
});
