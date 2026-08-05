/**
 * Tracer Caja: cerrar con diferencia (faltante) + nota de justificación.
 * Corre alfabéticamente cerca de caja-close; otros specs reabren si hace falta.
 */
import { test, expect } from "@playwright/test";
import {
  loginViaUi,
  stripDevToolbar,
  dismissOnboarding,
} from "./helpers/auth.mjs";
import { ensureCashOpen, getCashHub } from "./helpers/api.mjs";
import { fillMoneyInput } from "./helpers/money.mjs";

test("caja: click Cerrar con diferencia + nota", async ({ page }) => {
  await loginViaUi(page);
  const request = page.context().request;

  const open = await ensureCashOpen(request);
  const expected = open.expectedCash;
  const counted = Math.max(0, expected - 10);

  await page.goto("/caja");
  await stripDevToolbar(page);
  await dismissOnboarding(page);

  const closeForm = page.locator("[data-caja-close]");
  await expect(closeForm).toBeVisible({ timeout: 15_000 });

  await fillMoneyInput(closeForm.locator("[data-caja-counted]"), counted);
  await fillMoneyInput(closeForm.locator("[data-caja-deposit]"), 0);
  await fillMoneyInput(closeForm.locator("[data-caja-float]"), counted);

  await expect(closeForm.locator("[data-caja-diff-note-wrap]")).toBeVisible();
  await closeForm
    .locator("[data-caja-diff-note]")
    .fill("Faltante e2e caja-diff");

  page.once("dialog", (dialog) => dialog.accept());

  const closeResPromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/caja/close") &&
      res.request().method() === "POST" &&
      res.status() < 500
  );

  await closeForm.locator('button[type="submit"]').click();
  const closeRes = await closeResPromise;
  expect(closeRes.ok()).toBeTruthy();
  const body = await closeRes.json().catch(() => ({}));
  const session = body.session || {};
  expect(session.state === "closed" || body.ok !== false).toBeTruthy();
  if (session.difference != null) {
    expect(Number(session.difference)).toBeCloseTo(counted - expected, 1);
  }

  await page.waitForURL(/\/caja\/?$/, { timeout: 15_000 });
  await stripDevToolbar(page);

  const hub = await getCashHub(request);
  expect(hub.isOpen).toBeFalsy();
  await expect(page.locator("[data-caja-open]")).toBeVisible({
    timeout: 10_000,
  });
});
