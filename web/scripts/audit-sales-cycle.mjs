/**
 * Auditoría E2E ciclo Ventas: cotización → confirm → pedido → FC.
 * Requiere Astro :4321 + Odoo. MUTA datos (crea SO + FC borrador).
 *
 * Uso:
 *   SMOKE_LOGIN=mauri SMOKE_PASSWORD=admin \
 *   node --experimental-strip-types --import ./scripts/test-env.mjs \
 *   scripts/audit-sales-cycle.mjs
 */
const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:4321";
const loginName = process.env.SMOKE_LOGIN || "admin";
const password = process.env.SMOKE_PASSWORD || "admin";

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

async function pickPartnerAndProduct() {
  const customers = await fetchJson("/api/lists/sales/customers");
  const products = await fetchJson("/api/lists/inventory/products");
  const partnerId = customers.body.rows?.[0]?.id;
  const productId =
    products.body.rows?.[0]?.id ||
    products.body.rows?.[0]?.product_variant_id;
  // Prefer variant id if present on product.template list
  let resolvedProductId = productId;
  if (products.body.rows?.[0]) {
    const row = products.body.rows[0];
    resolvedProductId =
      row.product_variant_id ||
      row.product_id ||
      row.id;
  }
  add({
    Paso: "1. Pickers",
    Accion: "Leer cliente + producto",
    Esperado: "ids válidos",
    Resultado: partnerId && resolvedProductId ? "OK" : "FAIL",
    Evidencia: `partner=${partnerId} product=${resolvedProductId}`,
  });
  if (!partnerId || !resolvedProductId) {
    throw new Error("missing partner or product for cycle");
  }
  return { partnerId: Number(partnerId), productId: Number(resolvedProductId) };
}

async function createQuotation(partnerId, productId) {
  const { res, body } = await fetchJson("/api/records/sales/quotations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "create",
      values: {
        partnerId,
        lines: [{ productId, qty: 1 }],
      },
    }),
  });
  const id = body.id;
  const ok = res.ok && id;
  add({
    Paso: "2. Crear cotización",
    Accion: "POST create sales/quotations",
    Esperado: "id + detailPath",
    Resultado: ok ? "OK" : "FAIL",
    Evidencia: `HTTP ${res.status} ${JSON.stringify(body).slice(0, 220)}`,
  });
  if (!ok) throw new Error("create quotation failed");

  const detailPath = body.detailPath || `/lists/sales/quotations/${id}`;
  const html = await fetchHtml(detailPath);
  const hasConfirm = /Confirmar pedido|data-record-confirm|confirm/i.test(
    html.html
  );
  add({
    Paso: "2b. Ficha cotización",
    Accion: `GET ${detailPath}`,
    Esperado: "HTML 200 + CTA confirmar",
    Resultado: html.res.status === 200 && hasConfirm ? "OK" : "FAIL",
    Evidencia: `HTML ${html.res.status}, confirmCTA=${hasConfirm}`,
  });
  return Number(id);
}

async function confirmQuotation(id) {
  const { res, body } = await fetchJson("/api/records/sales/quotations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "confirm", id }),
  });
  const ok = res.ok && (body.state === "sale" || body.ok);
  add({
    Paso: "3. Confirmar",
    Accion: "POST confirm sales/quotations",
    Esperado: "state=sale",
    Resultado: ok ? "OK" : "FAIL",
    Evidencia: `HTTP ${res.status} ${JSON.stringify(body).slice(0, 220)}`,
  });
  if (!ok) throw new Error("confirm failed");

  const orderHtml = await fetchHtml(`/lists/sales/orders/${id}`);
  add({
    Paso: "3b. Ficha pedido",
    Accion: `GET /lists/sales/orders/${id}`,
    Esperado: "HTML 200",
    Resultado: orderHtml.res.status === 200 ? "OK" : "FAIL",
    Evidencia: `HTML ${orderHtml.res.status}`,
  });

  // invoice_status via list search or detail fields in HTML/API
  const orders = await fetchJson("/api/lists/sales/orders");
  const row = (orders.body.rows || []).find((r) => Number(r.id) === id);
  const toInvoiceList = await fetchJson("/api/lists/sales/to-invoice");
  const inToInvoice = (toInvoiceList.body.rows || []).some(
    (r) => Number(r.id) === id
  );
  add({
    Paso: "3c. Por facturar",
    Accion: "Lista sales/to-invoice contiene SO",
    Esperado: "pedido listo para FC",
    Resultado: inToInvoice ? "OK" : "PARTIAL",
    Evidencia: `inToInvoice=${inToInvoice}, invoice_status=${row?.invoice_status ?? "n/a"}`,
  });

  const hasCreateFc =
    /Crear FC|create_invoice|data-create-invoice/i.test(orderHtml.html);
  add({
    Paso: "3d. CTA Crear FC",
    Accion: "CTA en ficha pedido",
    Esperado: "botón Crear FC visible si to invoice",
    Resultado: inToInvoice ? (hasCreateFc ? "OK" : "FAIL") : "EMPTY",
    Evidencia: `hasCreateFc=${hasCreateFc}`,
  });

  return { inToInvoice, orderHtml };
}

async function createInvoice(orderId) {
  const { res, body } = await fetchJson("/api/records/sales/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "create_invoice", id: orderId }),
  });
  const invoiceId = body.id;
  const ok = res.ok && invoiceId;
  add({
    Paso: "4. Crear FC",
    Accion: "POST create_invoice sales/orders",
    Esperado: "invoice id + detailPath",
    Resultado: ok ? "OK" : "FAIL",
    Evidencia: `HTTP ${res.status} ${JSON.stringify(body).slice(0, 280)}`,
  });
  if (!ok) throw new Error("create_invoice failed");

  const detailPath =
    body.detailPath || `/lists/accounting/customer-invoices/${invoiceId}`;
  const html = await fetchHtml(detailPath);
  const looksInvoice =
    /Factura|customer-invoice|Publicar|Borrador|account\.move/i.test(html.html);
  add({
    Paso: "4b. Ficha FC",
    Accion: `GET ${detailPath}`,
    Esperado: "HTML 200 ficha factura",
    Resultado: html.res.status === 200 && looksInvoice ? "OK" : "FAIL",
    Evidencia: `HTML ${html.res.status}, looksInvoice=${looksInvoice}`,
  });

  const hasPublish = /Publicar|data-record-confirm/i.test(html.html);
  add({
    Paso: "4c. CTA Publicar",
    Accion: "CTA en ficha FC",
    Esperado: "botón Publicar visible",
    Resultado: hasPublish ? "OK" : "FAIL",
    Evidencia: `hasPublish=${hasPublish}`,
  });

  const pub = await fetchJson("/api/records/accounting/customer-invoices", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "confirm", id: invoiceId }),
  });
  const posted =
    pub.res.ok &&
    (pub.body.state === "posted" || pub.body.ok === true);
  add({
    Paso: "4d. Publicar FC",
    Accion: "POST confirm accounting/customer-invoices",
    Esperado: "state=posted",
    Resultado: posted ? "OK" : "FAIL",
    Evidencia: `HTTP ${pub.res.status} ${JSON.stringify(pub.body).slice(0, 220)}`,
  });

  // optional: new page still works
  const newQ = await fetchHtml("/lists/sales/quotations/new");
  add({
    Paso: "5. UI nueva cotización",
    Accion: "GET /lists/sales/quotations/new",
    Esperado: "form OK",
    Resultado:
      newQ.res.status === 200 && /OrderCreate|partner|Producto/i.test(newQ.html)
        ? "OK"
        : "FAIL",
    Evidencia: `HTML ${newQ.res.status}`,
  });

  return Number(invoiceId);
}

async function main() {
  console.log(`Sales cycle audit base=${base}`);
  try {
    const up = await fetch(`${base}/login`, { signal: AbortSignal.timeout(4000) });
    if (!up.ok && up.status !== 302) throw new Error(`HTTP ${up.status}`);
  } catch (e) {
    console.error("PREREQ Astro down:", e.message);
    process.exit(2);
  }

  await login();
  const { partnerId, productId } = await pickPartnerAndProduct();
  const quotationId = await createQuotation(partnerId, productId);
  const { inToInvoice } = await confirmQuotation(quotationId);
  if (inToInvoice) {
    await createInvoice(quotationId);
  } else {
    add({
      Paso: "4. Crear FC",
      Accion: "skipped",
      Esperado: "invoice_status=to invoice",
      Resultado: "FAIL",
      Evidencia: "pedido confirmado pero no aparece en to-invoice",
    });
  }

  const counts = rows.reduce((acc, r) => {
    acc[r.Resultado] = (acc[r.Resultado] || 0) + 1;
    return acc;
  }, {});
  console.log("\n=== RESUMEN ===");
  console.log(counts);
  console.log(`quotationId=${quotationId}`);

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
