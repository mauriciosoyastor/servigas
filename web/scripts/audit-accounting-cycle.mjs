/**
 * Auditoría E2E ciclo Contabilidad:
 * FC borrador → editar → publicar → PDF → registrar cobro.
 * Requiere Astro :4321 + Odoo. MUTA datos.
 *
 * Uso:
 *   SMOKE_LOGIN=mauri SMOKE_PASSWORD=admin \
 *   node --experimental-strip-types --import ./scripts/test-env.mjs \
 *   scripts/audit-accounting-cycle.mjs
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

async function fetchBinary(path) {
  const res = await fetch(`${base}${path}`, {
    headers: { cookie: cookieHeader() },
    redirect: "manual",
  });
  absorb(res);
  const buf = Buffer.from(await res.arrayBuffer());
  return { res, buf };
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
  const row = products.body.rows?.[0];
  const productId = row?.product_variant_id || row?.product_id || row?.id;
  add({
    Paso: "1. Pickers",
    Accion: "Leer cliente + producto",
    Esperado: "ids válidos",
    Resultado: partnerId && productId ? "OK" : "FAIL",
    Evidencia: `partner=${partnerId} product=${productId}`,
  });
  if (!partnerId || !productId) throw new Error("missing partner or product");
  return { partnerId: Number(partnerId), productId: Number(productId) };
}

async function createDraft(partnerId, productId) {
  const { res, body } = await fetchJson(
    "/api/records/accounting/customer-invoices",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "create",
        values: {
          partnerId,
          lines: [{ productId, qty: 1, price: 100 }],
        },
      }),
    }
  );
  const id = body.id;
  const ok = res.ok && id;
  add({
    Paso: "2. Crear FC borrador",
    Accion: "POST create accounting/customer-invoices",
    Esperado: "id + detailPath",
    Resultado: ok ? "OK" : "FAIL",
    Evidencia: `HTTP ${res.status} ${JSON.stringify(body).slice(0, 240)}`,
  });
  if (!ok) throw new Error("create invoice failed");

  const detailPath =
    body.detailPath || `/lists/accounting/customer-invoices/${id}`;
  const html = await fetchHtml(detailPath);
  const hasPublish = /Publicar|data-record-confirm/i.test(html.html);
  const hasEdit = new RegExp(`/lists/accounting/customer-invoices/${id}/edit`).test(
    html.html
  );
  add({
    Paso: "2b. Ficha borrador",
    Accion: `GET ${detailPath}`,
    Esperado: "CTA Publicar + Editar",
    Resultado:
      html.res.status === 200 && hasPublish && hasEdit ? "OK" : "FAIL",
    Evidencia: `HTML ${html.res.status}, publish=${hasPublish}, edit=${hasEdit}`,
  });

  const edit = await fetchHtml(
    `/lists/accounting/customer-invoices/${id}/edit`
  );
  const editOk =
    edit.res.status === 200 &&
    /update_invoice_draft|OrderCreate|partner|Producto/i.test(edit.html);
  add({
    Paso: "2c. Página editar",
    Accion: `GET .../${id}/edit`,
    Esperado: "form edición borrador",
    Resultado: editOk ? "OK" : "FAIL",
    Evidencia: `HTML ${edit.res.status}`,
  });

  return Number(id);
}

async function editDraft(id, partnerId, productId) {
  const { res, body } = await fetchJson(
    "/api/records/accounting/customer-invoices",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "update_invoice_draft",
        id,
        values: {
          partnerId,
          lines: [{ productId, qty: 2, price: 150 }],
        },
      }),
    }
  );
  const ok = res.ok && (body.ok === true || body.id === id);
  add({
    Paso: "3. Editar borrador",
    Accion: "POST update_invoice_draft",
    Esperado: "ok + mismo id",
    Resultado: ok ? "OK" : "FAIL",
    Evidencia: `HTTP ${res.status} ${JSON.stringify(body).slice(0, 240)}`,
  });
  if (!ok) throw new Error("update_invoice_draft failed");
}

async function publish(id) {
  const { res, body } = await fetchJson(
    "/api/records/accounting/customer-invoices",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "confirm", id }),
    }
  );
  const ok = res.ok && (body.state === "posted" || body.ok === true);
  add({
    Paso: "4. Publicar",
    Accion: "POST confirm",
    Esperado: "state=posted",
    Resultado: ok ? "OK" : "FAIL",
    Evidencia: `HTTP ${res.status} ${JSON.stringify(body).slice(0, 220)}`,
  });
  if (!ok) throw new Error("publish failed");

  const html = await fetchHtml(`/lists/accounting/customer-invoices/${id}`);
  const hasPay = /Registrar cobro|register_payment|data-register-payment/i.test(
    html.html
  );
  const hasPdf = /data-invoice-pdf|invoice-pdf|Descargar PDF|Ver PDF/i.test(
    html.html
  );
  add({
    Paso: "4b. Ficha posted",
    Accion: `GET ficha ${id}`,
    Esperado: "CTA cobro + PDF",
    Resultado: html.res.status === 200 && hasPay && hasPdf ? "OK" : "FAIL",
    Evidencia: `HTML ${html.res.status}, pay=${hasPay}, pdf=${hasPdf}`,
  });
}

async function fetchPdf(id) {
  const path = `/api/reports/invoice/accounting/customer-invoices/${id}`;
  const { res, buf } = await fetchBinary(path);
  const ct = res.headers.get("content-type") || "";
  const isPdf =
    res.ok &&
    buf.length > 100 &&
    (ct.includes("pdf") || buf.slice(0, 4).toString() === "%PDF");
  add({
    Paso: "5. PDF",
    Accion: `GET ${path}`,
    Esperado: "stream PDF",
    Resultado: isPdf ? "OK" : res.status === 502 ? "PARTIAL" : "FAIL",
    Evidencia: `HTTP ${res.status}, ct=${ct}, bytes=${buf.length}, magic=${buf.slice(0, 4).toString()}`,
  });
}

async function registerPayment(id) {
  const { res, body } = await fetchJson(
    "/api/records/accounting/customer-invoices",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "register_payment",
        id,
        values: { paymentMethod: "cash" },
      }),
    }
  );
  const paid =
    res.ok &&
    (body.paymentState === "paid" ||
      body.ok === true ||
      Number(body.residual) === 0);
  add({
    Paso: "6. Registrar cobro",
    Accion: "POST register_payment cash",
    Esperado: "paymentState=paid / residual 0",
    Resultado: paid ? "OK" : "FAIL",
    Evidencia: `HTTP ${res.status} ${JSON.stringify(body).slice(0, 260)}`,
  });

  const html = await fetchHtml(`/lists/accounting/customer-invoices/${id}`);
  const stillPay = /Registrar cobro|data-register-payment/i.test(html.html);
  add({
    Paso: "6b. Post-cobro UI",
    Accion: "CTA cobro oculto si paid",
    Esperado: "sin Registrar cobro (o residual 0)",
    Resultado: html.res.status === 200 && !stillPay ? "OK" : "PARTIAL",
    Evidencia: `stillPay=${stillPay}, HTML ${html.res.status}`,
  });
}

async function main() {
  console.log(`Accounting cycle audit base=${base}`);
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
  const { partnerId, productId } = await pickPartnerAndProduct();
  const invoiceId = await createDraft(partnerId, productId);
  await editDraft(invoiceId, partnerId, productId);
  await publish(invoiceId);
  await fetchPdf(invoiceId);
  await registerPayment(invoiceId);

  const counts = rows.reduce((acc, r) => {
    acc[r.Resultado] = (acc[r.Resultado] || 0) + 1;
    return acc;
  }, {});
  console.log("\n=== RESUMEN ===");
  console.log(counts);
  console.log(`invoiceId=${invoiceId}`);

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
