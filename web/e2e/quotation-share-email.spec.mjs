/**
 * Tracer: click Enviar por mail en cotización ([data-so-share-email]).
 * Seed: cliente con email + cotización vía API.
 */
import { test, expect } from "@playwright/test";
import { loginViaUi, stripDevToolbar } from "./helpers/auth.mjs";
import { seedQuotationWithCustomerEmail } from "./helpers/api.mjs";

test("sales: click Enviar por mail en cotización", async ({ page }) => {
  await loginViaUi(page);
  const quotation = await seedQuotationWithCustomerEmail(
    page.context().request
  );

  await page.goto(quotation.detailPath);
  await stripDevToolbar(page);

  const mailBtn = page.locator("[data-so-share-email]");
  await expect(mailBtn).toBeVisible({ timeout: 15_000 });
  await expect(mailBtn).toBeEnabled();
  await expect(mailBtn).toHaveAttribute("data-has-email", "1");

  page.once("dialog", (dialog) => dialog.accept());

  const mailResPromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/sale-orders/send-email") &&
      res.request().method() === "POST" &&
      res.status() < 500
  );

  await mailBtn.click();
  const mailRes = await mailResPromise;
  expect(mailRes.ok()).toBeTruthy();
  const body = await mailRes.json().catch(() => ({}));
  expect(Boolean(body.email) || body.ok === true || body.markedSent).toBeTruthy();

  const status = page.locator("[data-so-share-status]");
  await expect(status).toBeVisible();
  await expect(status).toHaveAttribute("data-state", "ok");
  await expect(status).toContainText(/Mail enviado/i);
});
