/**
 * Tracer Caja: clicks reales Abrir (si hace falta) + Ingreso refuerzo.
 * No cierra la sesión (deja POS usable para otros e2e).
 */
import { test, expect } from "@playwright/test";
import {
  loginViaUi,
  stripDevToolbar,
  dismissOnboarding,
} from "./helpers/auth.mjs";
import { getCashHub } from "./helpers/api.mjs";

test("caja: click Abrir (si cerrada) + Ingreso refuerzo", async ({ page }) => {
  await loginViaUi(page);
  const request = page.context().request;

  await page.goto("/caja");
  await stripDevToolbar(page);
  await dismissOnboarding(page);

  const openForm = page.locator("[data-caja-open]");
  const moveIn = page.locator('[data-caja-move][data-kind="in"]');

  if (await openForm.isVisible().catch(() => false)) {
    await openForm.locator('input[name="openingBalance"]').fill("1000");
    await openForm.locator('select[name="shift"]').selectOption("tarde");
    await openForm.locator('input[name="note"]').fill("e2e-caja-open");

    const openResPromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/caja/open") &&
        res.request().method() === "POST" &&
        res.status() < 500
    );
    await openForm.locator('button[type="submit"]').click();
    const openRes = await openResPromise;
    expect(openRes.ok()).toBeTruthy();
    await page.waitForURL(/\/caja\/?$/, { timeout: 15_000 });
    await stripDevToolbar(page);
  }

  await expect(moveIn).toBeVisible({ timeout: 15_000 });

  const before = await getCashHub(request);
  const amount = 50;

  await moveIn.locator('input[name="amount"]').fill(String(amount));
  await moveIn.locator("[data-caja-motive]").selectOption("refuerzo");

  const moveResPromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/caja/move") &&
      res.request().method() === "POST" &&
      res.status() < 500
  );
  await moveIn.locator('button[type="submit"]').click();
  const moveRes = await moveResPromise;
  expect(moveRes.ok()).toBeTruthy();

  await page.waitForURL(/\/caja\/?$/, { timeout: 15_000 });
  await stripDevToolbar(page);

  const after = await getCashHub(request);
  expect(after.isOpen).toBeTruthy();
  expect(after.expectedCash).toBeCloseTo(before.expectedCash + amount, 1);

  await expect(page.locator("[data-caja-expected]")).toBeVisible();
});
