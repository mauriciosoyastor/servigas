/**
 * Auditoría E2E ciclo Compras:
 * solicitud → confirmar OC → validar recepción → FP (adjunto) → publicar.
 * Requiere Astro :4321 + Odoo. MUTA datos.
 *
 * Uso:
 *   SMOKE_LOGIN=mauri SMOKE_PASSWORD=admin \
 *   node --experimental-strip-types --import ./scripts/test-env.mjs \
 *   scripts/audit-purchase-cycle.mjs
 */
const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:4321";
const loginName = process.env.SMOKE_LOGIN || "admin";
const password = process.env.SMOKE_PASSWORD || "admin";

/** 1×1 PNG (mismo fixture que tests de FP). */
const TINY_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

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

async function pickVendorAndProduct() {
  const vendors = await fetchJson("/api/lists/purchase/vendors");
  let products = await fetchJson("/api/lists/inventory/variants");
  if (!products.res.ok || !(products.body.rows || []).length) {
    products = await fetchJson("/api/lists/inventory/products");
  }
  const partnerId = Number(vendors.body.rows?.[0]?.id);
  const row = products.body.rows?.[0];
  const productId = Number(
    row?.product_variant_id || row?.product_id || row?.id
  );
  add({
    Paso: "1. Pickers",
    Accion: "Proveedor + producto",
    Esperado: "ids válidos",
    Resultado: partnerId && productId ? "OK" : "FAIL",
    Evidencia: `partner=${partnerId} product=${productId}`,
  });
  if (!partnerId || !productId) throw new Error("missing vendor or product");
  return { partnerId, productId };
}

async function createRfq(partnerId, productId) {
  const { res, body } = await fetchJson("/api/records/purchase/solicitudes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "create",
      values: {
        partnerId,
        lines: [{ productId, qty: 1, price: 50 }],
      },
    }),
  });
  const id = Number(body.id);
  const ok = res.ok && id > 0;
  add({
    Paso: "2. Crear solicitud",
    Accion: "POST create purchase/solicitudes",
    Esperado: "id + detailPath OC",
    Resultado: ok ? "OK" : "FAIL",
    Evidencia: `HTTP ${res.status} ${JSON.stringify(body).slice(0, 260)}`,
  });
  if (!ok) throw new Error("create RFQ failed");

  const detailPath = body.detailPath || `/lists/purchase/orders/${id}`;
  const html = await fetchHtml(detailPath);
  const hasConfirm = /Confirmar OC|data-record-confirm/i.test(html.html);
  add({
    Paso: "2b. Ficha solicitud",
    Accion: `GET ${detailPath}`,
    Esperado: "CTA Confirmar OC",
    Resultado: html.res.status === 200 && hasConfirm ? "OK" : "FAIL",
    Evidencia: `HTML ${html.res.status}, confirmCTA=${hasConfirm}`,
  });

  const newPage = await fetchHtml("/lists/purchase/solicitudes/new");
  add({
    Paso: "2c. UI nueva solicitud",
    Accion: "GET /lists/purchase/solicitudes/new",
    Esperado: "form OK",
    Resultado:
      newPage.res.status === 200 &&
      /OrderCreate|Proveedor|Producto/i.test(newPage.html)
        ? "OK"
        : "FAIL",
    Evidencia: `HTML ${newPage.res.status}`,
  });

  return id;
}

async function confirmPo(id) {
  const { res, body } = await fetchJson("/api/records/purchase/solicitudes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "confirm", id }),
  });
  const ok = res.ok && (body.state === "purchase" || body.ok === true);
  add({
    Paso: "3. Confirmar OC",
    Accion: "POST confirm purchase/solicitudes",
    Esperado: "state=purchase",
    Resultado: ok ? "OK" : "FAIL",
    Evidencia: `HTTP ${res.status} ${JSON.stringify(body).slice(0, 220)}`,
  });
  if (!ok) throw new Error("confirm PO failed");

  const html = await fetchHtml(`/lists/purchase/orders/${id}`);
  const hasReceipts = /Recepciones de inventario|data-po-receipts/i.test(
    html.html
  );
  const pickingIds = [
    ...html.html.matchAll(/\/lists\/inventory\/transfers\/(\d+)/g),
  ].map((m) => Number(m[1]));
  const uniquePickings = [...new Set(pickingIds)];
  add({
    Paso: "3b. Recepciones en ficha",
    Accion: `GET /lists/purchase/orders/${id}`,
    Esperado: "bloque recepciones + picking(s)",
    Resultado:
      html.res.status === 200 && hasReceipts && uniquePickings.length
        ? "OK"
        : hasReceipts
          ? "PARTIAL"
          : "FAIL",
    Evidencia: `receipts=${hasReceipts}, pickings=${uniquePickings.join(",") || "none"}`,
  });

  return { pickingIds: uniquePickings, html: html.html };
}

async function validateReceipt(pickingId) {
  const html = await fetchHtml(`/lists/inventory/transfers/${pickingId}`);
  const hasValidate = /Validar recepción|data-record-confirm/i.test(html.html);
  add({
    Paso: "4. Ficha transferencia",
    Accion: `GET /lists/inventory/transfers/${pickingId}`,
    Esperado: "CTA Validar recepción",
    Resultado: html.res.status === 200 && hasValidate ? "OK" : "PARTIAL",
    Evidencia: `HTML ${html.res.status}, validateCTA=${hasValidate}`,
  });

  const { res, body } = await fetchJson("/api/records/inventory/transfers", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "confirm", id: pickingId }),
  });
  const ok = res.ok && (body.state === "done" || body.ok === true);
  add({
    Paso: "4b. Validar recepción",
    Accion: "POST confirm inventory/transfers",
    Esperado: "state=done",
    Resultado: ok ? "OK" : "FAIL",
    Evidencia: `HTTP ${res.status} ${JSON.stringify(body).slice(0, 260)}`,
  });
  if (!ok) throw new Error("validate receipt failed");
}

async function createAndPostVendorBill(partnerId, productId) {
  const { res, body } = await fetchJson(
    "/api/records/accounting/vendor-bills",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "create",
        values: {
          partnerId,
          billSource: "whatsapp",
          lines: [{ productId, qty: 1, price: 50 }],
          attachment: {
            filename: "fp-audit.png",
            mimetype: "image/png",
            content: TINY_PNG,
          },
        },
      }),
    }
  );
  const billId = Number(body.id);
  const ok = res.ok && billId > 0;
  add({
    Paso: "5. Crear FP",
    Accion: "POST create accounting/vendor-bills",
    Esperado: "id + detailPath (con adjunto)",
    Resultado: ok ? "OK" : "FAIL",
    Evidencia: `HTTP ${res.status} ${JSON.stringify(body).slice(0, 260)}`,
  });
  if (!ok) throw new Error("create vendor bill failed");

  const detailPath =
    body.detailPath || `/lists/accounting/vendor-bills/${billId}`;
  const html = await fetchHtml(detailPath);
  const hasPublish = /Publicar|data-record-confirm/i.test(html.html);
  add({
    Paso: "5b. Ficha FP",
    Accion: `GET ${detailPath}`,
    Esperado: "CTA Publicar",
    Resultado: html.res.status === 200 && hasPublish ? "OK" : "FAIL",
    Evidencia: `HTML ${html.res.status}, publish=${hasPublish}`,
  });

  const pub = await fetchJson("/api/records/accounting/vendor-bills", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "confirm", id: billId }),
  });
  const posted =
    pub.res.ok && (pub.body.state === "posted" || pub.body.ok === true);
  add({
    Paso: "5c. Publicar FP",
    Accion: "POST confirm vendor-bills",
    Esperado: "state=posted",
    Resultado: posted ? "OK" : "FAIL",
    Evidencia: `HTTP ${pub.res.status} ${JSON.stringify(pub.body).slice(0, 220)}`,
  });

  return billId;
}

async function checkPoPdf(orderId) {
  const path = `/api/reports/purchase-order/purchase/orders/${orderId}`;
  const res = await fetch(`${base}${path}`, {
    headers: { cookie: cookieHeader() },
  });
  absorb(res);
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get("content-type") || "";
  const isPdf =
    res.ok &&
    buf.length > 100 &&
    (ct.includes("pdf") || buf.slice(0, 4).toString() === "%PDF");
  add({
    Paso: "6. PDF OC",
    Accion: `GET ${path}`,
    Esperado: "stream PDF",
    Resultado: isPdf ? "OK" : res.status === 502 ? "PARTIAL" : "FAIL",
    Evidencia: `HTTP ${res.status}, ct=${ct}, bytes=${buf.length}`,
  });
}

async function main() {
  console.log(`Purchase cycle audit base=${base}`);
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
  const { partnerId, productId } = await pickVendorAndProduct();
  const orderId = await createRfq(partnerId, productId);
  const { pickingIds } = await confirmPo(orderId);
  if (pickingIds.length) {
    await validateReceipt(pickingIds[0]);
    const after = await fetchHtml(`/lists/purchase/orders/${orderId}`);
    const statusDone = /Complet|full|done|Recibido/i.test(after.html);
    add({
      Paso: "4c. Estado recepción OC",
      Accion: "ficha OC post-validate",
      Esperado: "recepción reflejada",
      Resultado: after.res.status === 200 ? (statusDone ? "OK" : "PARTIAL") : "FAIL",
      Evidencia: `statusDoneHint=${statusDone}`,
    });
  } else {
    add({
      Paso: "4. Validar recepción",
      Accion: "skipped",
      Esperado: "picking desde OC",
      Resultado: "FAIL",
      Evidencia: "sin pickings en ficha tras confirmar",
    });
  }
  const billId = await createAndPostVendorBill(partnerId, productId);
  await checkPoPdf(orderId);

  const counts = rows.reduce((acc, r) => {
    acc[r.Resultado] = (acc[r.Resultado] || 0) + 1;
    return acc;
  }, {});
  console.log("\n=== RESUMEN ===");
  console.log(counts);
  console.log(`orderId=${orderId} billId=${billId}`);

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
