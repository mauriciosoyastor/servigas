/**
 * Smoke Taller: rail → hub → Nueva OT (superficie Astro).
 */
import { test, expect } from "@playwright/test";
import {
  loginViaUi,
  stripDevToolbar,
  dismissOnboarding,
} from "./helpers/auth.mjs";

test("taller: rail hub y alta OT cargan", async ({ page }) => {
  await loginViaUi(page);
  await page.goto("/");
  await stripDevToolbar(page);
  await dismissOnboarding(page);

  const rail = page.locator('[data-tour="rail-workshop"]');
  await expect(rail).toBeVisible();
  await Promise.all([
    page.waitForURL(/\/hubs\/workshop\/?$/, { timeout: 15_000 }),
    rail.click(),
  ]);
  await expect(page).toHaveURL(/\/hubs\/workshop\/?$/);
  await expect(page.getByRole("heading", { name: "Taller" })).toBeVisible();

  await page.goto("/lists/workshop/orders/new");
  await stripDevToolbar(page);
  await dismissOnboarding(page);
  await expect(page).toHaveURL(/\/lists\/workshop\/orders\/new\/?$/);
  await expect(page.locator("[data-tour='workshop-create']")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Nueva orden de trabajo/i })
  ).toBeVisible();
});
