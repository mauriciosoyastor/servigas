/**
 * Tracer Caja: click Cerrar caja (confirm dialog + POST /api/caja/close).
 * Abre vía API si hace falta; cierra solo con click UI (sin diferencia).
 * Corre antes de caja-move / pos (alfabético) — esos reabren si hace falta.
 */
import { test, expect } from "@playwright/test";
import {
  loginViaUi,
  stripDevToolbar,
  dismissOnboarding,
} from "./helpers/auth.mjs";
import { ensureCashOpen, getCashHub } from "./helpers/api.mjs";

test("caja: click Cerrar caja cierra la sesión", async ({ page }) => {
  await loginViaUi(page);
  const request = page.context().request;

  const open = await ensureCashOpen(request);
  const expected = open.expectedCash;

  await page.goto("/caja");
  await stripDevToolbar(page);
  await dismissOnboarding(page);

  const closeForm = page.locator("[data-caja-close]");
  await expect(closeForm).toBeVisible({ timeout: 15_000 });

  // Sin diferencia: contado = esperado; depósito 0; fondo = contado
  await closeForm.locator("[data-caja-counted]").fill(String(expected));
  await closeForm.locator("[data-caja-deposit]").fill("0");
  await closeForm.locator("[data-caja-float]").fill(String(expected));

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

  await page.waitForURL(/\/caja\/?$/, { timeout: 15_000 });
  await stripDevToolbar(page);

  const hub = await getCashHub(request);
  expect(hub.isOpen).toBeFalsy();

  // UI vuelve al formulario de apertura
  await expect(page.locator("[data-caja-open]")).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator("[data-caja-close]")).toHaveCount(0);
});
