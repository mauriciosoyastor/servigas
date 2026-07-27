/**
 * Auth UI helpers for Playwright shell e2e.
 * Creds: SMOKE_LOGIN / SMOKE_PASSWORD (defaults admin/admin).
 */

/** Removes Astro Dev Toolbar so it cannot steal clicks (astro-dev-toolbar). */
export async function stripDevToolbar(page) {
  await page.addInitScript(() => {
    const kill = () => {
      for (const el of document.querySelectorAll("astro-dev-toolbar")) {
        el.remove();
      }
    };
    kill();
    const obs = new MutationObserver(kill);
    obs.observe(document.documentElement, { childList: true, subtree: true });
  });
  await page.evaluate(() => {
    for (const el of document.querySelectorAll("astro-dev-toolbar")) {
      el.remove();
    }
  }).catch(() => {});
}

/** Dismiss onboarding tour overlay so it cannot steal clicks. */
export async function dismissOnboarding(page) {
  const never = page.locator("[data-tour-never]");
  const skip = page.locator("[data-tour-skip]");
  const tip = page.locator("[data-tour-tip]");
  if (!(await tip.isVisible().catch(() => false))) return;
  if (await never.isVisible().catch(() => false)) {
    await never.click();
  } else if (await skip.isVisible().catch(() => false)) {
    await skip.click();
  }
  await tip.waitFor({ state: "hidden", timeout: 5_000 }).catch(() => {});
}

/**
 * Login via /login form. Leaves session cookie `sg_bff_sid` on the context.
 * @param {import('@playwright/test').Page} page
 */
export async function loginViaUi(page) {
  const login = process.env.SMOKE_LOGIN || "admin";
  const password = process.env.SMOKE_PASSWORD || "admin";

  await stripDevToolbar(page);
  await page.goto("/login");
  await stripDevToolbar(page);

  await page.locator('[data-login-form] input[name="login"]').fill(login);
  await page.locator('[data-login-form] input[name="password"]').fill(password);

  await Promise.all([
    page.waitForURL((url) => !url.pathname.includes("/login"), {
      timeout: 30_000,
    }),
    page.locator('[data-login-form] button[type="submit"]').click(),
  ]);

  const cookies = await page.context().cookies();
  if (!cookies.some((c) => c.name === "sg_bff_sid")) {
    throw new Error("loginViaUi: missing sg_bff_sid cookie after login");
  }

  await dismissOnboarding(page);
}
