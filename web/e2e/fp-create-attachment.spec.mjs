/**
 * Tracer: crear FP desde UI con adjunto (file input + pickers).
 */
import { test, expect } from "@playwright/test";
import path from "node:path";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { loginViaUi, stripDevToolbar } from "./helpers/auth.mjs";
import { tinyPngBuffer } from "./helpers/api.mjs";

async function pickFirstResult(page, kind) {
  const picker = page.locator(`[data-picker-kind="${kind}"]`);
  await picker.locator("[data-picker-query]").fill("a");
  const results = picker.locator("[data-picker-results] button");
  await expect(results.first()).toBeVisible({ timeout: 15_000 });
  await results.first().click();
  await expect(picker.locator("[data-picker-selected]")).toBeVisible();
}

test("accounting: crear FP con adjunto desde UI", async ({ page }) => {
  await loginViaUi(page);

  const dir = mkdtempSync(path.join(tmpdir(), "e2e-fp-"));
  const filePath = path.join(dir, "fp-e2e.png");
  writeFileSync(filePath, tinyPngBuffer());

  await page.goto("/lists/accounting/vendor-bills/new");
  await stripDevToolbar(page);

  const form = page.locator("[data-order-create]");
  await expect(form).toBeVisible();

  // Origen WhatsApp (default suele estar; asegurar valor)
  const sourceTrigger = form.locator("[data-bill-source-trigger]");
  if (await sourceTrigger.isVisible().catch(() => false)) {
    await sourceTrigger.click();
    const wa = form.locator('[data-bill-source-list] [data-value="whatsapp"]');
    if (await wa.isVisible().catch(() => false)) {
      await wa.click();
    } else {
      await page.keyboard.press("Escape");
    }
  }

  await form.locator("[data-bill-attachment]").setInputFiles(filePath);

  await pickFirstResult(page, "partner");
  await pickFirstResult(page, "product");
  await form.locator("[data-draft-price]").fill("50");
  await form.locator("[data-add-line]").click();
  await expect(form.locator("[data-lines-list]")).toBeVisible();

  const createResPromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/records/accounting/vendor-bills") &&
      res.request().method() === "POST" &&
      res.status() < 500
  );

  await form.locator('[data-order-create-form] button[type="submit"]').click();
  const createRes = await createResPromise;
  expect(createRes.ok()).toBeTruthy();
  const body = await createRes.json().catch(() => ({}));
  expect(Number(body.id) > 0).toBeTruthy();

  await page.waitForURL(/\/lists\/accounting\/vendor-bills\/\d+/, {
    timeout: 15_000,
  });
});
