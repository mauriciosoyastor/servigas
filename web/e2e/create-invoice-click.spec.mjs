/**
 * Tracer: click Crear FC en pedido confirmado.
 * Seed: cotización + confirm vía API; solo create_invoice va por browser.
 */
import { test, expect } from "@playwright/test";
import { loginViaUi, stripDevToolbar } from "./helpers/auth.mjs";
import { seedConfirmedSaleOrder } from "./helpers/api.mjs";

test("sales: click Crear FC en pedido", async ({ page }) => {
  await loginViaUi(page);
  const order = await seedConfirmedSaleOrder(page.context().request);

  await page.goto(order.detailPath);
  await stripDevToolbar(page);

  const createBtn = page.locator("[data-create-invoice-btn]");
  await expect(createBtn).toBeVisible({ timeout: 15_000 });

  page.once("dialog", (dialog) => dialog.accept());

  const createResPromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/records/sales/orders") &&
      res.request().method() === "POST" &&
      res.status() < 500
  );

  await createBtn.click();
  const createRes = await createResPromise;
  expect(createRes.ok()).toBeTruthy();
  const body = await createRes.json().catch(() => ({}));
  expect(Number(body.id) > 0).toBeTruthy();

  await page.waitForURL(/\/lists\/accounting\/customer-invoices\/\d+/, {
    timeout: 15_000,
  });
});
