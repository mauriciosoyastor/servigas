/**
 * Prereq check + Playwright runner.
 * Exit 0 OK · 1 fail · 2 Astro/Odoo down.
 */
const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:4321";

async function checkPrereq() {
  try {
    const res = await fetch(`${base}/login`, {
      signal: AbortSignal.timeout(4000),
      redirect: "manual",
    });
    if (!res.ok && res.status !== 302) {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    console.error(
      "PREREQ Astro down:",
      err instanceof Error ? err.message : err
    );
    console.error(
      `Levantá stack (Odoo :8070 + Astro :4321). Preferí ASTRO_TOOLBAR=0.`
    );
    process.exit(2);
  }
}

await checkPrereq();

const { spawnSync } = await import("node:child_process");
const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["playwright", "test", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  }
);
process.exit(result.status == null ? 1 : result.status);
