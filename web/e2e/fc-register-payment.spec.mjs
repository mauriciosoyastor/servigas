/**
 * Tracer: click Registrar cobro en ficha FC publicada.
 * Seed vía API (crear + publicar); solo el cobro va por browser.
 */
import { test, expect } from "@playwright/test";
import { loginViaUi, stripDevToolbar } from "./helpers/auth.mjs";
import { seedPostedCustomerInvoice } from "./helpers/api.mjs";

test("accounting: click Registrar cobro en FC", async ({ page }) => {
  await loginViaUi(page);
  const invoice = await seedPostedCustomerInvoice(page.context().request);

  await page.goto(invoice.detailPath);
  await stripDevToolbar(page);

  const payRoot = page.locator("[data-record-register-payment]");
  await expect(payRoot).toBeVisible({ timeout: 15_000 });

  // Medio cash por default; monto vacío = saldo completo
  const cash = payRoot.locator('[data-pay-method][value="cash"]');
  if (await cash.count()) {
    await cash.check({ force: true });
  }

  page.once("dialog", (dialog) => dialog.accept());

  const payResPromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/records/accounting/customer-invoices") &&
      res.request().method() === "POST" &&
      res.status() < 500
  );

  await payRoot.locator("[data-pay-btn]").click();
  const payRes = await payResPromise;
  expect(payRes.ok()).toBeTruthy();
  const body = await payRes.json().catch(() => ({}));
  expect(
    body.paymentState === "paid" ||
      body.ok === true ||
      Number(body.residual) === 0
  ).toBeTruthy();

  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(600);
  await stripDevToolbar(page);

  // Post-cobro: control de cobro desaparece (paid)
  await expect(page.locator("[data-record-register-payment]")).toHaveCount(0, {
    timeout: 10_000,
  });
});
