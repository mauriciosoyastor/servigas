/**
 * Smoke del camino feliz Astro BFF (ADR 0016 go/no-go).
 *
 * Requiere:
 *   - Astro en http://127.0.0.1:4321
 *   - Odoo alcanzable vía ODOO_URL / ODOO_DB del proceso Astro
 *   - Credenciales SMOKE_LOGIN / SMOKE_PASSWORD (default admin/admin)
 *
 * Exit 0 = camino OK. Exit 1 = fallo. Exit 2 = prereq down (Astro/Odoo).
 */
const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:4321";
const loginName = process.env.SMOKE_LOGIN || "admin";
const password = process.env.SMOKE_PASSWORD || "admin";
const jar = new Map();

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function absorb(res) {
  const raw = res.headers.getSetCookie?.() || [];
  for (const c of raw) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    if (i > 0) jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
}

async function step(name, fn) {
  try {
    await fn();
    console.log("ok", name);
  } catch (err) {
    console.error("fail", name, err?.message || err);
    process.exit(err?.code === "PREREQ" ? 2 : 1);
  }
}

await step("astro_up", async () => {
  try {
    const res = await fetch(`${base}/login`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok && res.status !== 302) {
      const err = new Error(`HTTP ${res.status}`);
      err.code = "PREREQ";
      throw err;
    }
  } catch (e) {
    const err = new Error(
      `Astro no responde en ${base}. Levantá: cd web && npm run dev. (${e.message})`
    );
    err.code = "PREREQ";
    throw err;
  }
});

await step("login", async () => {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ login: loginName, password }),
  });
  absorb(res);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (body?.error?.code === "odoo_unavailable") {
      const err = new Error(
        "Odoo no disponible para el BFF. Revisá ODOO_URL/ODOO_DB en web/.env"
      );
      err.code = "PREREQ";
      throw err;
    }
    throw new Error(`login ${res.status} ${JSON.stringify(body)}`);
  }
  if (!jar.has("sg_bff_sid")) {
    throw new Error("cookie sg_bff_sid ausente tras login");
  }
});

await step("launcher", async () => {
  const res = await fetch(`${base}/api/launcher`, {
    headers: { cookie: cookieHeader() },
  });
  absorb(res);
  const body = await res.json();
  if (!res.ok) throw new Error(`launcher ${res.status} ${JSON.stringify(body)}`);
  if (!Array.isArray(body.tiles) || body.tiles.length === 0) {
    throw new Error("launcher sin tiles");
  }
});

await step("hub_inventory", async () => {
  const res = await fetch(`${base}/api/hub/inventory?section=summary`, {
    headers: { cookie: cookieHeader() },
  });
  absorb(res);
  const body = await res.json();
  if (!res.ok) throw new Error(`hub ${res.status} ${JSON.stringify(body)}`);
});

await step("list_products", async () => {
  const res = await fetch(`${base}/api/lists/inventory/products`, {
    headers: { cookie: cookieHeader() },
  });
  absorb(res);
  const body = await res.json();
  if (!res.ok) throw new Error(`products ${res.status} ${JSON.stringify(body)}`);
  if (!Array.isArray(body.rows)) {
    throw new Error("products sin rows");
  }
});

await step("pos_page", async () => {
  const res = await fetch(`${base}/pos`, {
    headers: { cookie: cookieHeader() },
  });
  absorb(res);
  const html = await res.text();
  if (!res.ok) throw new Error(`pos ${res.status}`);
  if (!html.includes("data-pos-numpad") && !html.includes("pos")) {
    throw new Error("pos HTML inesperado");
  }
});

console.log("smoke-shell-path: PASS");
