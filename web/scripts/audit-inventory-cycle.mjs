/**
 * Auditoría E2E ciclo Inventario:
 * listas → alta producto → editar precio → import CSV (template/preview/apply).
 * Requiere Astro :4321 + Odoo. MUTA datos.
 *
 * Uso:
 *   SMOKE_LOGIN=mauri SMOKE_PASSWORD=admin \
 *   node --experimental-strip-types --import ./scripts/test-env.mjs \
 *   scripts/audit-inventory-cycle.mjs
 */
const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:4321";
const loginName = process.env.SMOKE_LOGIN || "admin";
const password = process.env.SMOKE_PASSWORD || "admin";
const stamp = Date.now();

const jar = new Map();
/** @type {Array<Record<string, string>>} */
const rows = [];

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function absorb(res) {
  for (const c of res.headers.getSetCookie?.() || []) {
    const [pair] = c.split(";");
    const i = pair.indexOf("=");
    if (i > 0) jar.set(pair.slice(0, i), pair.slice(i + 1));
  }
}

function add(row) {
  rows.push(row);
  const icon =
    row.Resultado === "OK"
      ? "OK"
      : row.Resultado === "EMPTY"
        ? "EMPTY"
        : row.Resultado === "PARTIAL"
          ? "PARTIAL"
          : "FAIL";
  console.log(
    `[${icon}] ${row.Paso} | ${row.Accion} → ${row.Esperado} | ${row.Resultado} | ${row.Evidencia}`
  );
}

async function fetchJson(path, opts = {}) {
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      cookie: cookieHeader(),
    },
  });
  absorb(res);
  const body = await res.json().catch(() => ({}));
  return { res, body };
}

async function fetchHtml(path) {
  const res = await fetch(`${base}${path}`, {
    headers: { cookie: cookieHeader() },
    redirect: "manual",
  });
  absorb(res);
  const html = await res.text().catch(() => "");
  return { res, html };
}

async function login() {
  const { res, body } = await fetchJson("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ login: loginName, password }),
  });
  if (!res.ok || !jar.has("sg_bff_sid")) {
    throw new Error(`login failed ${res.status} ${JSON.stringify(body)}`);
  }
  add({
    Paso: "0. Login",
    Accion: "POST /api/auth/login",
    Esperado: "sesión BFF",
    Resultado: "OK",
    Evidencia: `HTTP ${res.status}`,
  });
}

async function checkLists() {
  const keys = [
    "inventory/products",
    "inventory/variants",
    "inventory/existencias",
    "inventory/transfers",
  ];
  for (const key of keys) {
    const api = await fetchJson(`/api/lists/${key}`);
    const html = await fetchHtml(`/lists/${key}`);
    const rowsCount = (api.body.rows || []).length;
    const ok = api.res.ok && html.res.status === 200;
    add({
      Paso: `1. Lista ${key}`,
      Accion: `GET api+html`,
      Esperado: "200 (vacío permitido)",
      Resultado: ok ? (rowsCount ? "OK" : "EMPTY") : "FAIL",
      Evidencia: `API ${api.res.status} rows=${rowsCount}, HTML ${html.res.status}`,
    });
  }
}

async function createProduct() {
  const name = `AUDIT Prod ${stamp}`;
  const code = `AUD-${stamp}`;
  const newPage = await fetchHtml("/lists/inventory/products/new");
  add({
    Paso: "2. UI nuevo producto",
    Accion: "GET /lists/inventory/products/new",
    Esperado: "form alta",
    Resultado:
      newPage.res.status === 200 && /Nombre|list_price|Producto/i.test(newPage.html)
        ? "OK"
        : "FAIL",
    Evidencia: `HTML ${newPage.res.status}`,
  });

  const { res, body } = await fetchJson("/api/records/inventory/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "create",
      values: {
        name,
        default_code: code,
        list_price: 1234.5,
      },
    }),
  });
  const id = Number(body.id);
  const ok = res.ok && id > 0;
  add({
    Paso: "2b. Crear producto",
    Accion: "POST create inventory/products",
    Esperado: "id + detailPath",
    Resultado: ok ? "OK" : "FAIL",
    Evidencia: `HTTP ${res.status} ${JSON.stringify(body).slice(0, 240)}`,
  });
  if (!ok) throw new Error("create product failed");

  const detailPath = body.detailPath || `/lists/inventory/products/${id}`;
  const html = await fetchHtml(detailPath);
  const looks =
    html.res.status === 200 &&
    (html.html.includes(name) || /Ficha de producto|list_price|Archivar/i.test(html.html));
  add({
    Paso: "2c. Ficha producto",
    Accion: `GET ${detailPath}`,
    Esperado: "HTML 200 ficha",
    Resultado: looks ? "OK" : "FAIL",
    Evidencia: `HTML ${html.res.status}`,
  });

  return { id, name, code };
}

async function updateProduct(id) {
  const { res, body } = await fetchJson("/api/records/inventory/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "update",
      id,
      values: { list_price: "1500", default_code: `AUD-${stamp}-U` },
    }),
  });
  add({
    Paso: "3. Editar precio",
    Accion: "POST update inventory/products",
    Esperado: "ok",
    Resultado: res.ok && (body.ok === true || body.id === id || !body.error) ? "OK" : "FAIL",
    Evidencia: `HTTP ${res.status} ${JSON.stringify(body).slice(0, 220)}`,
  });
  if (!res.ok) throw new Error("update product failed");

  // La lista products no expone list_price en columns (sí en ficha).
  const detail = await fetchHtml(`/lists/inventory/products/${id}`);
  const priceOk =
    detail.res.status === 200 &&
    (/\b1500(\.0+)?\b/.test(detail.html) ||
      /value=["']1500/.test(detail.html));
  const codeOk = detail.html.includes(`AUD-${stamp}-U`);
  add({
    Paso: "3b. Precio en ficha",
    Accion: `GET /lists/inventory/products/${id}`,
    Esperado: "precio 1500 + ref actualizada",
    Resultado: priceOk && codeOk ? "OK" : "FAIL",
    Evidencia: `HTML ${detail.res.status}, priceOk=${priceOk}, codeOk=${codeOk}`,
  });
}

async function importCycle() {
  const importPage = await fetchHtml("/lists/inventory/products/import");
  add({
    Paso: "4. UI import",
    Accion: "GET /lists/inventory/products/import",
    Esperado: "página CSV",
    Resultado:
      importPage.res.status === 200 &&
      /price-list-import|lista de precios|CSV/i.test(importPage.html)
        ? "OK"
        : "FAIL",
    Evidencia: `HTML ${importPage.res.status}`,
  });

  const tpl = await fetchJson("/api/inventory/price-list-import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "template" }),
  });
  add({
    Paso: "4b. Plantilla",
    Accion: "POST action=template",
    Esperado: "CSV content",
    Resultado:
      tpl.res.ok &&
      String(tpl.body.content || "").includes("list_price")
        ? "OK"
        : "FAIL",
    Evidencia: `HTTP ${tpl.res.status}, bytes=${String(tpl.body.content || "").length}`,
  });

  const sku = `IMP-${stamp}`;
  const barcode = `779${String(stamp).slice(-10)}`;
  const csv =
    "barcode,default_code,name,list_price,standard_price\n" +
    `${barcode},${sku},AUDIT Import ${stamp},2200.00,1100.00\n`;

  const preview = await fetchJson("/api/inventory/price-list-import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "preview",
      filename: "audit.csv",
      content: csv,
    }),
  });
  const lines = preview.body.preview?.lines || [];
  const createLine = lines.find((l) => l.status === "create");
  add({
    Paso: "4c. Preview",
    Accion: "POST action=preview",
    Esperado: "línea create seleccionable",
    Resultado:
      preview.res.ok && createLine?.selected ? "OK" : "FAIL",
    Evidencia: `HTTP ${preview.res.status} counts=${JSON.stringify(preview.body.preview?.counts || {})}`,
  });
  if (!createLine) throw new Error("preview missing create line");

  const apply = await fetchJson("/api/inventory/price-list-import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "apply",
      lines: [
        {
          selected: true,
          status: "create",
          barcode: createLine.barcode,
          default_code: createLine.default_code,
          name: createLine.name,
          list_price: createLine.list_price,
          standard_price: createLine.standard_price,
          productId: null,
        },
      ],
    }),
  });
  const created = Number(apply.body.created);
  add({
    Paso: "4d. Apply create",
    Accion: "POST action=apply",
    Esperado: "created>=1",
    Resultado: apply.res.ok && created >= 1 ? "OK" : "FAIL",
    Evidencia: `HTTP ${apply.res.status} ${JSON.stringify(apply.body).slice(0, 220)}`,
  });
  if (!apply.res.ok || created < 1) throw new Error("apply failed");

  // Second preview should classify as update
  const preview2 = await fetchJson("/api/inventory/price-list-import", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "preview",
      filename: "audit-update.csv",
      content:
        "barcode,default_code,name,list_price,standard_price\n" +
        `${barcode},${sku},AUDIT Import ${stamp},2500.00,1200.00\n`,
    }),
  });
  const updateLine = (preview2.body.preview?.lines || []).find(
    (l) => l.status === "update"
  );
  add({
    Paso: "4e. Preview update",
    Accion: "POST preview mismo SKU",
    Esperado: "status=update",
    Resultado: preview2.res.ok && updateLine ? "OK" : "PARTIAL",
    Evidencia: `status=${updateLine?.status || (preview2.body.preview?.lines || [])[0]?.status}`,
  });

  if (updateLine) {
    const applyUp = await fetchJson("/api/inventory/price-list-import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "apply",
        lines: [
          {
            selected: true,
            status: "update",
            productId: updateLine.productId,
            barcode: updateLine.barcode,
            default_code: updateLine.default_code,
            name: updateLine.name,
            list_price: 2500,
            standard_price: 1200,
          },
        ],
      }),
    });
    add({
      Paso: "4f. Apply update",
      Accion: "POST apply update precio",
      Esperado: "updated>=1",
      Resultado:
        applyUp.res.ok && Number(applyUp.body.updated) >= 1 ? "OK" : "FAIL",
      Evidencia: `HTTP ${applyUp.res.status} ${JSON.stringify(applyUp.body).slice(0, 200)}`,
    });
  }

  return { sku, barcode };
}

async function archiveProduct(id) {
  const { res, body } = await fetchJson("/api/records/inventory/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "archive", id }),
  });
  add({
    Paso: "5. Archivar producto alta",
    Accion: "POST archive",
    Esperado: "ok (cleanup)",
    Resultado: res.ok ? "OK" : "PARTIAL",
    Evidencia: `HTTP ${res.status} ${JSON.stringify(body).slice(0, 160)}`,
  });
}

async function main() {
  console.log(`Inventory cycle audit base=${base}`);
  try {
    const up = await fetch(`${base}/login`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!up.ok && up.status !== 302) throw new Error(`HTTP ${up.status}`);
  } catch (e) {
    console.error("PREREQ Astro down:", e.message);
    process.exit(2);
  }

  await login();
  await checkLists();
  const product = await createProduct();
  await updateProduct(product.id);
  const imported = await importCycle();
  await archiveProduct(product.id);

  const counts = rows.reduce((acc, r) => {
    acc[r.Resultado] = (acc[r.Resultado] || 0) + 1;
    return acc;
  }, {});
  console.log("\n=== RESUMEN ===");
  console.log(counts);
  console.log(
    `productId=${product.id} importSku=${imported.sku} barcode=${imported.barcode}`
  );

  const fails = rows.filter((r) => r.Resultado === "FAIL");
  if (fails.length) {
    console.log("\n=== FAILS ===");
    for (const f of fails) {
      console.log(`${f.Paso} | ${f.Accion} | ${f.Evidencia}`);
    }
  }
  process.exit(fails.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
