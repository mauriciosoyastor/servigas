/**
 * Tracer POS: click producto + Cobrar → POST /api/pos/checkout.
 * Prereq caja abierta vía API (no cierra sesión).
 */
import { test, expect } from "@playwright/test";
import {
  loginViaUi,
  stripDevToolbar,
  dismissOnboarding,
} from "./helpers/auth.mjs";
import { ensureCashOpen } from "./helpers/api.mjs";

test("pos: click producto + checkout registra venta", async ({ page }) => {
  await loginViaUi(page);
  await ensureCashOpen(page.context().request);

  await page.goto("/pos");
  await stripDevToolbar(page);
  await dismissOnboarding(page);

  // Mostrador usable (no bloqueado)
  await expect(page.locator("[data-pos-caja]")).toBeVisible();
  await expect(page.getByText(/Abrí la caja primero/i)).toHaveCount(0);

  const product = page.locator("[data-pos-add]").first();
  await expect(product).toBeVisible({ timeout: 20_000 });
  await product.click();

  // Ticket deja de estar vacío
  await expect(page.locator("[data-pos-empty]")).toBeHidden();
  await expect(page.locator("[data-pos-checkout]")).toBeEnabled();

  const pay = page.locator("[data-pos-pay-method]").first();
  if ((await pay.count()) > 0) {
    await pay.check({ force: true }).catch(async () => {
      await pay.click({ force: true });
    });
  }

  const checkout = page.locator("[data-pos-checkout]");
  await expect(checkout).toBeEnabled();

  const checkoutResponse = page.waitForResponse(
    (res) =>
      res.url().includes("/api/pos/checkout") &&
      res.request().method() === "POST" &&
      res.status() < 500
  );

  await checkout.click();
  const res = await checkoutResponse;
  expect(res.ok()).toBeTruthy();
  const body = await res.json().catch(() => ({}));
  expect(Number(body.orderId) > 0 || Boolean(body.orderName)).toBeTruthy();

  await expect(page.locator("[data-pos-receipt]")).toBeVisible({
    timeout: 10_000,
  });
});
