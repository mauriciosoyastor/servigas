/**
 * Playwright config — auditoría de clicks reales (shell Astro + Odoo).
 *
 * Prereq:
 *   - Odoo en :8070 (npm run odoo:ensure)
 *   - Astro en :4321 (preferí `ASTRO_TOOLBAR=0` en `astro dev`, o `astro preview`
 *     tras build — la Dev Toolbar intercepta clicks)
 *   - SMOKE_LOGIN / SMOKE_PASSWORD (default admin/admin)
 *
 * Uso: npm run e2e:shell
 */
import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.SMOKE_BASE_URL || "http://127.0.0.1:4321";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // native confirm()/alert used by RecordConfirmControl
    // handled per-test via page.on('dialog')
  },
  // Do not start a webServer here: stack is managed outside (odoo:ensure + astro).
});
