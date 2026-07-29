/**
 * Tracer: import CSV lista de precios (preview + apply) vía UI.
 */
import { test, expect } from "@playwright/test";
import path from "node:path";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { loginViaUi, stripDevToolbar } from "./helpers/auth.mjs";
import { uniqueCreateProductCsv } from "./helpers/api.mjs";

test("inventory: upload CSV precios preview + apply", async ({ page }) => {
  await loginViaUi(page);

  const { csv, name } = uniqueCreateProductCsv();
  const dir = mkdtempSync(path.join(tmpdir(), "e2e-csv-"));
  const filePath = path.join(dir, "e2e-precios.csv");
  writeFileSync(filePath, csv, "utf8");

  await page.goto("/lists/inventory/products/import");
  await stripDevToolbar(page);

  await expect(page.locator("[data-price-import]")).toBeVisible();

  const previewResPromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/inventory/price-list-import") &&
      res.request().method() === "POST" &&
      res.status() < 500
  );

  await page.locator("[data-file-input]").setInputFiles(filePath);
  const previewRes = await previewResPromise;
  expect(previewRes.ok()).toBeTruthy();
  const previewBody = await previewRes.json().catch(() => ({}));
  expect(previewBody.preview?.counts?.create >= 1 || previewBody.preview).toBeTruthy();

  await expect(page.locator('[data-step="preview"]')).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.locator("[data-preview-body]")).toContainText(name);

  const applyResPromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/inventory/price-list-import") &&
      res.request().method() === "POST" &&
      res.status() < 500
  );

  await page.locator("[data-apply]").click();
  const applyRes = await applyResPromise;
  expect(applyRes.ok()).toBeTruthy();
  const applyBody = await applyRes.json().catch(() => ({}));
  expect(Number(applyBody.created) >= 1).toBeTruthy();

  await expect(page.locator('[data-step="done"]')).toBeVisible({
    timeout: 10_000,
  });
});
