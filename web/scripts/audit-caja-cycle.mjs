/**
 * Auditoría E2E ciclo Caja:
 * pre-close → abrir → POS desbloquea → ingreso/egreso → cerrar (validación) → historial.
 * Requiere Astro :4321 + Odoo. MUTA datos.
 *
 * Uso:
 *   SMOKE_LOGIN=mauri SMOKE_PASSWORD=admin \
 *   node --experimental-strip-types --import ./scripts/test-env.mjs \
 *   scripts/audit-caja-cycle.mjs
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

async function ensureClosed() {
  const hub = await fetchJson("/api/caja");
  if (!hub.res.ok) {
    add({
      Paso: "1. Pre-close",
      Accion: "GET /api/caja",
      Esperado: "hub OK",
      Resultado: "FAIL",
      Evidencia: `HTTP ${hub.res.status}`,
    });
    throw new Error("caja hub failed");
  }

  if (!hub.body.session) {
    add({
      Paso: "1. Pre-close",
      Accion: "GET /api/caja",
      Esperado: "sin sesión abierta (o cerrar)",
      Resultado: "OK",
      Evidencia: "ya cerrada",
    });
  } else {
    const expected =
      hub.body.summary?.expectedCash ?? hub.body.session.openingBalance ?? 0;
    const close = await fetchJson("/api/caja/close", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        countedAmount: expected,
        bankDeposit: 0,
        leaveFloat: expected,
        differenceNote: "",
      }),
    });
    add({
      Paso: "1. Pre-close",
      Accion: "POST /api/caja/close",
      Esperado: "cerrar sesión previa",
      Resultado: close.res.ok ? "OK" : "FAIL",
      Evidencia: `HTTP ${close.res.status} expected=${expected} ${JSON.stringify(close.body).slice(0, 200)}`,
    });
    if (!close.res.ok) throw new Error("pre-close failed");
  }

  const pos = await fetchHtml("/pos");
  const blocked = /Abrí la caja primero/i.test(pos.html);
  add({
    Paso: "1b. POS bloqueado",
    Accion: "GET /pos sin caja",
    Esperado: "mensaje Abrí la caja primero",
    Resultado: pos.res.status === 200 && blocked ? "OK" : "FAIL",
    Evidencia: `HTML ${pos.res.status}, blocked=${blocked}`,
  });
}

async function openCash() {
  const { res, body } = await fetchJson("/api/caja/open", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      openingBalance: 1000,
      shift: "tarde",
      note: "audit-caja-cycle",
    }),
  });
  const sessionId = Number(body.session?.id);
  const ok =
    res.ok && sessionId > 0 && body.session?.shift === "tarde";
  add({
    Paso: "2. Abrir",
    Accion: "POST /api/caja/open",
    Esperado: "sesión shift=tarde balance=1000",
    Resultado: ok ? "OK" : "FAIL",
    Evidencia: `HTTP ${res.status} ${JSON.stringify(body).slice(0, 280)}`,
  });
  if (!ok) throw new Error("open failed");

  const caja = await fetchHtml("/caja");
  const cajaOk =
    caja.res.status === 200 && /Caja|Abrir|Cerrar|Efectivo/i.test(caja.html);
  add({
    Paso: "2b. UI Caja",
    Accion: "GET /caja",
    Esperado: "hub HTML usable",
    Resultado: cajaOk ? "OK" : "FAIL",
    Evidencia: `HTML ${caja.res.status}`,
  });

  const pos = await fetchHtml("/pos");
  const blocked = /Abrí la caja primero/i.test(pos.html);
  add({
    Paso: "2c. POS desbloqueado",
    Accion: "GET /pos con caja abierta",
    Esperado: "mostrador usable",
    Resultado: pos.res.status === 200 && !blocked ? "OK" : "FAIL",
    Evidencia: `HTML ${pos.res.status}, blocked=${blocked}`,
  });

  return sessionId;
}

async function movements() {
  const income = await fetchJson("/api/caja/move", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      kind: "in",
      amount: 100,
      motiveCode: "refuerzo",
    }),
  });
  add({
    Paso: "3. Ingreso",
    Accion: "POST move in refuerzo 100",
    Esperado: "movimiento OK",
    Resultado: income.res.ok ? "OK" : "FAIL",
    Evidencia: `HTTP ${income.res.status} ${JSON.stringify(income.body).slice(0, 220)}`,
  });
  if (!income.res.ok) throw new Error("income move failed");

  const out = await fetchJson("/api/caja/move", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      kind: "out",
      amount: 200,
      motiveCode: "retiro_banco",
    }),
  });
  add({
    Paso: "3b. Egreso",
    Accion: "POST move out retiro_banco 200",
    Esperado: "movimiento OK",
    Resultado: out.res.ok ? "OK" : "FAIL",
    Evidencia: `HTTP ${out.res.status} ${JSON.stringify(out.body).slice(0, 220)}`,
  });
  if (!out.res.ok) throw new Error("out move failed");

  // 1000 + 100 - 200 = 900
  const hub = await fetchJson("/api/caja");
  const expected = Number(hub.body.summary?.expectedCash);
  const feed = hub.body.feed || [];
  const hasIn = feed.some(
    (item) =>
      (item.kind === "manual_in" || item.kind === "in") &&
      Number(item.amount) === 100
  );
  const hasOut = feed.some(
    (item) =>
      (item.kind === "manual_out" || item.kind === "out") &&
      Number(item.amount) === 200
  );
  add({
    Paso: "3c. Expected cash",
    Accion: "GET /api/caja summary",
    Esperado: "expectedCash=900 + feed in/out",
    Resultado:
      hub.res.ok && expected === 900 && hasIn && hasOut ? "OK" : "FAIL",
    Evidencia: `expected=${expected}, hasIn=${hasIn}, hasOut=${hasOut}, feed=${feed.length}`,
  });
  if (expected !== 900) throw new Error(`expected cash ${expected} != 900`);
  return expected;
}

async function closeCash(expectedCash) {
  const bad = await fetchJson("/api/caja/close", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      countedAmount: expectedCash - 10,
      bankDeposit: 0,
      leaveFloat: expectedCash - 10,
    }),
  });
  add({
    Paso: "4. Close sin nota",
    Accion: "POST close con diferencia sin note",
    Esperado: "HTTP 400 validation",
    Resultado: !bad.res.ok && bad.res.status === 400 ? "OK" : "FAIL",
    Evidencia: `HTTP ${bad.res.status} ${JSON.stringify(bad.body).slice(0, 200)}`,
  });

  const counted = expectedCash - 10;
  const bankDeposit = 300;
  const leaveFloat = counted - bankDeposit;
  const close = await fetchJson("/api/caja/close", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      countedAmount: counted,
      bankDeposit,
      leaveFloat,
      differenceNote: "Faltante audit-caja-cycle",
    }),
  });
  const session = close.body.session || {};
  const ok =
    close.res.ok &&
    session.state === "closed" &&
    Number(session.difference) === -10 &&
    Number(session.bankDeposit) === bankDeposit &&
    Number(session.leaveFloat) === leaveFloat;
  add({
    Paso: "4b. Cerrar",
    Accion: "POST /api/caja/close",
    Esperado: "state=closed difference=-10",
    Resultado: ok ? "OK" : "FAIL",
    Evidencia: `HTTP ${close.res.status} ${JSON.stringify(close.body).slice(0, 320)}`,
  });
  if (!ok) throw new Error("close failed");

  const pos = await fetchHtml("/pos");
  const blocked = /Abrí la caja primero/i.test(pos.html);
  add({
    Paso: "4c. POS bloqueado post-close",
    Accion: "GET /pos",
    Esperado: "bloqueado otra vez",
    Resultado: blocked ? "OK" : "FAIL",
    Evidencia: `blocked=${blocked}`,
  });

  return Number(session.id);
}

async function historyAndDetail(sessionId) {
  const history = await fetchJson("/api/caja/history");
  const inHistory = (history.body.history || []).some(
    (item) => Number(item.id) === sessionId
  );
  add({
    Paso: "5. Historial API",
    Accion: "GET /api/caja/history",
    Esperado: "sesión cerrada listada",
    Resultado: history.res.ok && inHistory ? "OK" : "FAIL",
    Evidencia: `HTTP ${history.res.status}, inHistory=${inHistory}`,
  });

  const detail = await fetchJson(`/api/caja/${sessionId}`);
  add({
    Paso: "5b. Detalle API",
    Accion: `GET /api/caja/${sessionId}`,
    Esperado: "session + feed",
    Resultado:
      detail.res.ok &&
      Number(detail.body.session?.id) === sessionId &&
      Array.isArray(detail.body.feed)
        ? "OK"
        : "FAIL",
    Evidencia: `HTTP ${detail.res.status} id=${detail.body.session?.id}`,
  });

  const html = await fetchHtml(`/caja/${sessionId}`);
  const hasNote = /Faltante audit-caja-cycle/i.test(html.html);
  const hasPrint = /data-caja-print/i.test(html.html);
  add({
    Paso: "5c. Detalle UI",
    Accion: `GET /caja/${sessionId}`,
    Esperado: "nota diferencia + print",
    Resultado: html.res.status === 200 && hasNote && hasPrint ? "OK" : "FAIL",
    Evidencia: `HTML ${html.res.status}, note=${hasNote}, print=${hasPrint}`,
  });
}

async function reopenForDev() {
  const open = await fetchJson("/api/caja/open", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      openingBalance: 1000,
      shift: "tarde",
      note: "audit-caja-cycle reopen",
    }),
  });
  add({
    Paso: "6. Reabrir (dev)",
    Accion: "POST open post-audit",
    Esperado: "dejar caja usable para POS",
    Resultado: open.res.ok ? "OK" : "PARTIAL",
    Evidencia: `HTTP ${open.res.status} ${JSON.stringify(open.body).slice(0, 180)}`,
  });
}

async function main() {
  console.log(`Caja cycle audit base=${base}`);
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
  await ensureClosed();
  const openId = await openCash();
  const expected = await movements();
  const closedId = await closeCash(expected);
  await historyAndDetail(closedId);
  await reopenForDev();

  const counts = rows.reduce((acc, r) => {
    acc[r.Resultado] = (acc[r.Resultado] || 0) + 1;
    return acc;
  }, {});
  console.log("\n=== RESUMEN ===");
  console.log(counts);
  console.log(`openId=${openId} closedId=${closedId}`);

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
