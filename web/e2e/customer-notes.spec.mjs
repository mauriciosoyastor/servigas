/**
 * Tracer: agregar nota en ficha de cliente.
 */
import { test, expect } from "@playwright/test";
import { loginViaUi, stripDevToolbar } from "./helpers/auth.mjs";
import { createCustomerWithEmail } from "./helpers/api.mjs";

test("sales: click Agregar nota en ficha cliente", async ({ page }) => {
  await loginViaUi(page);
  const customer = await createCustomerWithEmail(page.context().request, "note");
  const body = `E2E nota ${Date.now()}`;

  await page.goto(`/lists/sales/customers/${customer.id}`);
  await stripDevToolbar(page);

  const notes = page.locator("[data-record-notes]");
  await expect(notes).toBeVisible({ timeout: 15_000 });

  await notes.locator("[data-note-input]").fill(body);

  const noteResPromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/notes") &&
      res.request().method() === "POST" &&
      res.status() < 500
  );

  await notes.locator('[data-note-form] button[type="submit"]').click();
  const noteRes = await noteResPromise;
  expect(noteRes.ok()).toBeTruthy();

  await expect(notes.locator("[data-note-list]")).toContainText(body, {
    timeout: 10_000,
  });
});
