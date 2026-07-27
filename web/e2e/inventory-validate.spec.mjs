/**
 * Tracer inventario: click Validar recepción en picking de OC.
 * Seed: RFQ + confirm OC vía API; solo el validate va por browser.
 */
import { test, expect } from "@playwright/test";
import { loginViaUi, stripDevToolbar } from "./helpers/auth.mjs";
import { seedConfirmedPurchaseWithPicking } from "./helpers/api.mjs";

test("inventory: click Validar recepción", async ({ page }) => {
  await loginViaUi(page);
  const seeded = await seedConfirmedPurchaseWithPicking(
    page.context().request
  );

  await page.goto(`/lists/inventory/transfers/${seeded.pickingId}`);
  await stripDevToolbar(page);

  const validateBtn = page.locator("[data-record-confirm-btn]");
  await expect(validateBtn).toBeVisible({ timeout: 15_000 });
  await expect(validateBtn).toContainText(/Validar recepción/i);

  page.once("dialog", (dialog) => dialog.accept());

  const validateResPromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/records/inventory/transfers") &&
      res.request().method() === "POST" &&
      res.status() < 500
  );

  await validateBtn.click();
  const validateRes = await validateResPromise;
  expect(validateRes.ok()).toBeTruthy();
  const body = await validateRes.json().catch(() => ({}));
  expect(body.state === "done" || body.ok === true).toBeTruthy();

  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(600);
  await stripDevToolbar(page);

  await expect(
    page.locator('[data-record-confirm-btn]:has-text("Validar recepción")')
  ).toHaveCount(0, { timeout: 10_000 });
});
