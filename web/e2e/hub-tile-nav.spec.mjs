/**
 * Regresión toolbar: click tile hub Ventas → /hubs/sales.
 */
import { test, expect } from "@playwright/test";
import {
  loginViaUi,
  stripDevToolbar,
  dismissOnboarding,
} from "./helpers/auth.mjs";

test("hub tile Ventas navega a /hubs/sales", async ({ page }) => {
  await loginViaUi(page);
  await page.goto("/");
  await stripDevToolbar(page);
  await dismissOnboarding(page);

  const salesTile = page.locator(
    '[data-tile][data-client-tag="servigas_sales_hub"]'
  );
  await expect(salesTile).toBeVisible();
  await salesTile.scrollIntoViewIfNeeded();

  await Promise.all([
    page.waitForURL(/\/hubs\/sales\/?$/, { timeout: 15_000 }),
    salesTile.click(),
  ]);

  await expect(page).toHaveURL(/\/hubs\/sales\/?$/);
});
