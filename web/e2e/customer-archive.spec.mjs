/**
 * Tracer: click Archivar en ficha de cliente.
 */
import { test, expect } from "@playwright/test";
import { loginViaUi, stripDevToolbar } from "./helpers/auth.mjs";
import { createCustomerWithEmail } from "./helpers/api.mjs";

test("sales: click Archivar cliente", async ({ page }) => {
  await loginViaUi(page);
  const customer = await createCustomerWithEmail(page.context().request, "arch");

  await page.goto(`/lists/sales/customers/${customer.id}`);
  await stripDevToolbar(page);

  const archiveBtn = page.locator("[data-record-archive-btn]");
  await expect(archiveBtn).toBeVisible({ timeout: 15_000 });

  page.once("dialog", (dialog) => dialog.accept());

  const archiveResPromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/records/sales/customers") &&
      res.request().method() === "POST" &&
      res.status() < 500
  );

  await archiveBtn.click();
  const archiveRes = await archiveResPromise;
  expect(archiveRes.ok()).toBeTruthy();

  await page.waitForURL(/\/lists\/sales\/customers\/?$/, { timeout: 15_000 });
});
