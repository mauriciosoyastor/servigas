/**
 * Auditoría E2E ciclo POS: caja abierta → catálogo → checkout → venta de caja.
 * Requiere Astro :4321 + Odoo. MUTA datos (abre caja si hace falta + crea pos.order).
 *
 * Uso:
 *   SMOKE_LOGIN=mauri SMOKE_PASSWORD=admin \
 *   node --experimental-strip-types --import ./scripts/test-env.mjs \
 *   scripts/audit-pos-cycle.mjs
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

async function ensureCashOpen() {
  const hub = await fetchJson("/api/caja");
  const openSession =
    hub.body.openSession || hub.body.session || hub.body.open || null;
  const alreadyOpen = Boolean(
    openSession?.id || hub.body.open === true || hub.body.isOpen
  );

  // Shape from getCashHub varies — also detect via nested session
  const sessionId =
    Number(openSession?.id) ||
    Number(hub.body.session?.id) ||
    Number(hub.body.openSession?.id) ||
    0;

  if (hub.res.ok && (alreadyOpen || sessionId > 0)) {
    add({
      Paso: "1. Caja",
      Accion: "GET /api/caja",
      Esperado: "sesión abierta (prereq POS)",
      Resultado: "OK",
      Evidencia: `ya abierta session=${sessionId || openSession?.id || "yes"}`,
    });
    return { openedByUs: false, sessionId };
  }

  const open = await fetchJson("/api/caja/open", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      openingBalance: 1000,
      shift: "manana",
      note: "audit-pos-cycle",
    }),
  });
  const newId =
    Number(open.body.session?.id) ||
    Number(open.body.id) ||
    0;
  const ok = open.res.ok && (newId > 0 || open.body.ok !== false);
  add({
    Paso: "1. Caja",
    Accion: "POST /api/caja/open",
    Esperado: "abrir caja para POS",
    Resultado: ok ? "OK" : "FAIL",
    Evidencia: `HTTP ${open.res.status} ${JSON.stringify(open.body).slice(0, 260)}`,
  });
  if (!ok) throw new Error("could not open cash session for POS");
  return { openedByUs: true, sessionId: newId };
}

async function checkPosUi() {
  const html = await fetchHtml("/pos");
  const ready =
    html.res.status === 200 &&
    /data-pos-checkout|data-pos-numpad|Mostrador/i.test(html.html);
  const blocked = /Abrí la caja primero/i.test(html.html);
  add({
    Paso: "2. UI Mostrador",
    Accion: "GET /pos",
    Esperado: "mostrador usable (no bloqueado por caja)",
    Resultado: ready && !blocked ? "OK" : blocked ? "FAIL" : "FAIL",
    Evidencia: `HTML ${html.res.status}, ready=${ready}, blocked=${blocked}`,
  });
  if (blocked) throw new Error("POS still blocked: cash not open");
}

async function loadCatalog() {
  const { res, body } = await fetchJson("/api/pos/catalog");
  const products = body.products || [];
  const methods = body.paymentMethods || [];
  const product = products[0];
  const pay =
    methods.find((m) => m.isCash || m.is_cash_count) || methods[0];
  const ok = res.ok && product?.id && pay?.id;
  add({
    Paso: "3. Catálogo",
    Accion: "GET /api/pos/catalog",
    Esperado: "producto + medio de pago",
    Resultado: ok ? "OK" : "FAIL",
    Evidencia: `HTTP ${res.status}, products=${products.length}, methods=${methods.length}, product=${product?.id}, pay=${pay?.id}`,
  });
  if (!ok) throw new Error("catalog missing product/payment method");
  return {
    productId: Number(product.id),
    price: Number(product.list_price) || 100,
    paymentMethodId: Number(pay.id),
    paymentMethodName: String(pay.name || ""),
  };
}

async function checkout(catalog) {
  const { res, body } = await fetchJson("/api/pos/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      paymentMethodId: catalog.paymentMethodId,
      lines: [
        {
          productId: catalog.productId,
          qty: 1,
          price: catalog.price,
          discount: 0,
        },
      ],
    }),
  });
  const orderId = Number(body.orderId);
  const ok = res.ok && orderId > 0 && body.orderName;
  add({
    Paso: "4. Checkout",
    Accion: "POST /api/pos/checkout",
    Esperado: "orderId + orderName + amountTotal",
    Resultado: ok ? "OK" : "FAIL",
    Evidencia: `HTTP ${res.status} ${JSON.stringify(body).slice(0, 320)}`,
  });
  if (!ok) throw new Error("checkout failed");

  const detailPath =
    body.detailPath || `/lists/sales/ventas-caja/${orderId}`;
  const html = await fetchHtml(detailPath);
  const looksOrder =
    /Venta|pos\.order|Mostrador|Facturar|amount|Total/i.test(html.html);
  add({
    Paso: "4b. Ficha venta caja",
    Accion: `GET ${detailPath}`,
    Esperado: "HTML 200 ficha",
    Resultado: html.res.status === 200 && looksOrder ? "OK" : "FAIL",
    Evidencia: `HTML ${html.res.status}, looksOrder=${looksOrder}`,
  });

  const list = await fetchJson("/api/lists/sales/ventas-caja");
  const inList = (list.body.rows || []).some(
    (r) => Number(r.id) === orderId
  );
  add({
    Paso: "4c. Lista ventas-caja",
    Accion: "GET /api/lists/sales/ventas-caja",
    Esperado: "orden en lista",
    Resultado: list.res.ok && inList ? "OK" : "FAIL",
    Evidencia: `HTTP ${list.res.status}, inList=${inList}, rows=${(list.body.rows || []).length}`,
  });

  return {
    orderId,
    orderName: String(body.orderName),
    amountTotal: Number(body.amountTotal),
    detailPath,
    html: html.html,
  };
}

async function maybeInvoice(order) {
  const hasCta = /Crear FC|create_invoice|Facturar|data-create-invoice/i.test(
    order.html
  );
  add({
    Paso: "5. CTA Facturar",
    Accion: "CTA en ficha venta caja",
    Esperado: "opción crear FC (si aplica)",
    Resultado: hasCta ? "OK" : "PARTIAL",
    Evidencia: `hasCta=${hasCta}`,
  });
  if (!hasCta) return null;

  const customers = await fetchJson("/api/lists/sales/customers");
  const partnerId = Number(customers.body.rows?.[0]?.id);
  if (!partnerId) {
    add({
      Paso: "5b. Crear FC desde POS",
      Accion: "skipped",
      Esperado: "partner para facturar",
      Resultado: "FAIL",
      Evidencia: "sin clientes en lista",
    });
    return null;
  }

  const { res, body } = await fetchJson("/api/records/sales/ventas-caja", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "create_invoice",
      id: order.orderId,
      partnerId,
    }),
  });
  const invoiceId = Number(body.id);
  const ok = res.ok && invoiceId > 0;
  add({
    Paso: "5b. Crear FC desde POS",
    Accion: "POST create_invoice ventas-caja",
    Esperado: "invoice id",
    Resultado: ok ? "OK" : "FAIL",
    Evidencia: `HTTP ${res.status} partner=${partnerId} ${JSON.stringify(body).slice(0, 280)}`,
  });
  return ok ? invoiceId : null;
}

async function main() {
  console.log(`POS cycle audit base=${base}`);
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
  await ensureCashOpen();
  await checkPosUi();
  const catalog = await loadCatalog();
  const order = await checkout(catalog);
  await maybeInvoice(order);

  const counts = rows.reduce((acc, r) => {
    acc[r.Resultado] = (acc[r.Resultado] || 0) + 1;
    return acc;
  }, {});
  console.log("\n=== RESUMEN ===");
  console.log(counts);
  console.log(
    `orderId=${order.orderId} orderName=${order.orderName} total=${order.amountTotal}`
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
