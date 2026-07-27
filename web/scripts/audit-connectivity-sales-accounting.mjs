/**
 * Auditoría de conectividad Ventas + Contabilidad (UI map → BFF → Odoo).
 * Requiere Astro :4321 + Odoo vía BFF. No muta datos salvo AUDIT_MUTATE=1.
 *
 * Uso: node --experimental-strip-types --import ./scripts/test-env.mjs scripts/audit-connectivity-sales-accounting.mjs
 */
import { resolveTileNavigation } from "../src/lib/shell/tile-nav.ts";
import {
  buildDetailPath,
  getRecordListDef,
} from "../src/lib/shell/record-lists.ts";
import { canCreateRecord } from "../src/lib/shell/record-writes.ts";

const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:4321";
const loginName = process.env.SMOKE_LOGIN || "admin";
const password = process.env.SMOKE_PASSWORD || "admin";
const mutate = process.env.AUDIT_MUTATE === "1";

const APPS = [
  {
    app: "sales",
    sections: [
      "summary",
      "quotations",
      "orders",
      "customers",
      "reporting",
      "config",
    ],
  },
  {
    app: "accounting",
    sections: ["summary", "receivables", "payables", "reporting", "config"],
  },
  {
    app: "inventory",
    sections: ["summary", "products", "operations", "reporting", "config"],
  },
  {
    app: "purchase",
    sections: ["summary", "orders", "vendors", "reporting", "config"],
  },
];

const EXTRA_ROUTES = [
  { pantalla: "Home atajo", accion: "Mostrador", path: "/pos" },
  { pantalla: "Home atajo", accion: "Caja", path: "/caja" },
  { pantalla: "Home atajo", accion: "Settings", path: "/settings" },
  { pantalla: "Home atajo", accion: "Apps", path: "/apps" },
  {
    pantalla: "Home atajo",
    accion: "Nueva cotización",
    path: "/lists/sales/quotations/new",
  },
  {
    pantalla: "Home atajo",
    accion: "Nuevo pedido proveedor",
    path: "/lists/purchase/solicitudes/new",
  },
  { pantalla: "API", accion: "POS catalog", path: "/api/pos/catalog", json: true },
  { pantalla: "API", accion: "Caja index", path: "/api/caja", json: true },
];

const jar = new Map();
/** @type {Array<Record<string, string>>} */
const rows = [];

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

function add(row) {
  rows.push(row);
  const icon =
    row.Resultado === "OK"
      ? "OK"
      : row.Resultado === "COMING_SOON"
        ? "SOON"
        : row.Resultado === "EMPTY"
          ? "EMPTY"
          : row.Resultado === "PARTIAL"
            ? "PARTIAL"
            : "FAIL";
  console.log(
    `[${icon}] ${row.Pantalla} | ${row.Accion} → ${row["Destino esperado"]} | ${row.Resultado} | ${row.Severidad}`
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

function severityFor(result) {
  if (result === "OK" || result === "EMPTY") return "info";
  if (result === "COMING_SOON") return "media";
  if (result === "PARTIAL") return "media";
  return "alta";
}

async function login() {
  const { res, body } = await fetchJson("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ login: loginName, password }),
  });
  if (!res.ok) {
    throw new Error(`login ${res.status} ${JSON.stringify(body)}`);
  }
  if (!jar.has("sg_bff_sid")) throw new Error("cookie sg_bff_sid ausente");
  add({
    Pantalla: "Login",
    Accion: "POST /api/auth/login",
    "Destino esperado": "sesión BFF",
    Resultado: "OK",
    Evidencia: `HTTP ${res.status}, cookie ok`,
    Severidad: "info",
  });
}

async function auditLauncher() {
  const { res, body } = await fetchJson("/api/launcher");
  if (!res.ok || !Array.isArray(body.tiles)) {
    add({
      Pantalla: "Home/Launcher",
      Accion: "GET /api/launcher",
      "Destino esperado": "tiles",
      Resultado: "FAIL",
      Evidencia: `HTTP ${res.status}`,
      Severidad: "alta",
    });
    return;
  }
  const hubs = [
    ["Ventas", "sales"],
    ["Stock", "inventory"],
    ["Compras", "purchase"],
    ["Cobros", "accounting"],
  ];
  for (const [label, tag] of hubs) {
    const tile = body.tiles.find((t) =>
      String(t.client_tag || "").includes(tag)
    );
    if (!tile) {
      add({
        Pantalla: "Home/Launcher",
        Accion: `Tile ${label}`,
        "Destino esperado": `/hubs/${tag}`,
        Resultado: "FAIL",
        Evidencia: "tile ausente en launcher",
        Severidad: "alta",
      });
      continue;
    }
    const nav = resolveTileNavigation({
      target_type: tile.target_type,
      client_tag: tile.client_tag,
      label: tile.label,
      action: tile.action || undefined,
    });
    const path =
      nav.kind === "hub" || nav.kind === "route" || nav.kind === "list"
        ? nav.path
        : null;
    const html = path ? await fetchHtml(path) : null;
    const ok = path && html && (html.res.status === 200 || html.res.status === 304);
    add({
      Pantalla: "Home/Launcher",
      Accion: `Click tile ${label}`,
      "Destino esperado": path || nav.kind,
      Resultado: ok ? "OK" : nav.kind === "coming_soon" ? "COMING_SOON" : "FAIL",
      Evidencia: path
        ? `nav=${nav.kind} HTML ${html?.res.status}`
        : `nav=${nav.kind}`,
      Severidad: severityFor(
        ok ? "OK" : nav.kind === "coming_soon" ? "COMING_SOON" : "FAIL"
      ),
    });
  }
}

async function auditCard(app, section, card) {
  const nav = resolveTileNavigation({
    target_type: "action",
    client_tag: "",
    label: card.label,
    action: card.action || undefined,
  });

  const pantalla = `Hub ${app} / ${section}`;
  const accion = `Card «${card.label}»`;

  if (nav.kind === "coming_soon") {
    add({
      Pantalla: pantalla,
      Accion: accion,
      "Destino esperado": "lista Astro",
      Resultado: "COMING_SOON",
      Evidencia: "resolveTileNavigation → coming_soon (huérfano UI)",
      Severidad: "media",
    });
    return null;
  }

  const path = nav.path;

  // Dedicated Astro routes (import wizard, POS, settings…) — HTML only.
  if (nav.kind === "route" || nav.kind === "hub") {
    const html = await fetchHtml(path);
    const ok = html.res.status === 200;
    add({
      Pantalla: pantalla,
      Accion: accion,
      "Destino esperado": path,
      Resultado: ok ? "OK" : "FAIL",
      Evidencia: `${nav.kind} HTML ${html.res.status}`,
      Severidad: severityFor(ok ? "OK" : "FAIL"),
    });
    return null;
  }

  const listKey = path.startsWith("/lists/")
    ? path.replace(/^\/lists\//, "")
    : null;

  // API list (only allowlisted keys)
  if (listKey && getRecordListDef(listKey)) {
    const { res, body } = await fetchJson(`/api/lists/${listKey}`);
    const rowsOk = Array.isArray(body.rows);
    let result = "OK";
    let evidence = `API ${res.status}, rows=${rowsOk ? body.rows.length : "n/a"}`;
    if (!res.ok) {
      result = "FAIL";
      evidence = `API ${res.status} ${JSON.stringify(body).slice(0, 180)}`;
    } else if (rowsOk && body.rows.length === 0) {
      result = "EMPTY";
    }

    const html = await fetchHtml(path);
    if (html.res.status !== 200) {
      result = "FAIL";
      evidence += `; HTML ${html.res.status}`;
    } else if (
      /No pudimos cargar|no se pudo cargar/i.test(html.html) &&
      !/sg-list|data-list|sg-record/i.test(html.html)
    ) {
      result = result === "OK" ? "PARTIAL" : result;
      evidence += "; HTML con error de carga";
    }

    add({
      Pantalla: pantalla,
      Accion: accion,
      "Destino esperado": path,
      Resultado: result,
      Evidencia: evidence,
      Severidad: severityFor(result),
    });

    return { listKey, path, rows: rowsOk ? body.rows : [], apiOk: res.ok };
  }

  // Fallback: HTML page under /lists that is not a record-list API
  if (path.startsWith("/lists/")) {
    const html = await fetchHtml(path);
    const ok = html.res.status === 200;
    add({
      Pantalla: pantalla,
      Accion: accion,
      "Destino esperado": path,
      Resultado: ok ? "OK" : "FAIL",
      Evidencia: `page HTML ${html.res.status}`,
      Severidad: severityFor(ok ? "OK" : "FAIL"),
    });
    return null;
  }

  // other route (pos/settings/etc)
  const html = await fetchHtml(path);
  const ok = html.res.status === 200;
  add({
    Pantalla: pantalla,
    Accion: accion,
    "Destino esperado": path,
    Resultado: ok ? "OK" : "FAIL",
    Evidencia: `route HTML ${html.res.status}`,
    Severidad: severityFor(ok ? "OK" : "FAIL"),
  });
  return null;
}

async function auditDetailAndCreate(listMeta) {
  if (!listMeta?.listKey) return;
  const { listKey, rows: listRows, apiOk } = listMeta;
  if (!apiOk) return;

  const def = getRecordListDef(listKey);
  const firstId = listRows[0]?.id;
  if (firstId != null && def?.detailPath) {
    const detailPath = buildDetailPath(def, Number(firstId));
    if (detailPath) {
      const html = await fetchHtml(detailPath);
      const ok = html.res.status === 200;
      const hasError =
        /No pudimos cargar|no se pudo cargar|Registro no encontrado/i.test(
          html.html
        );
      let result = "OK";
      if (!ok) result = "FAIL";
      else if (hasError) result = "PARTIAL";
      add({
        Pantalla: `Lista ${listKey}`,
        Accion: `Abrir detalle id=${firstId}`,
        "Destino esperado": detailPath,
        Resultado: result,
        Evidencia: `HTML ${html.res.status}${hasError ? " + mensaje error" : ""}`,
        Severidad: severityFor(result),
      });

      // Typed invoice edit lives on customer-invoices/…/edit, not drafts/…/edit.
      if (/customer-invoices|vendor-bills|credit-notes|vendor-refunds/.test(listKey)) {
        const editPath = `${detailPath}/edit`;
        const edit = await fetchHtml(editPath);
        if (edit.res.status === 200) {
          add({
            Pantalla: `Detalle ${listKey}/${firstId}`,
            Accion: "Abrir /edit",
            "Destino esperado": editPath,
            Resultado: "OK",
            Evidencia: `HTML ${edit.res.status}`,
            Severidad: "info",
          });
        } else if (edit.res.status === 404) {
          add({
            Pantalla: `Detalle ${listKey}/${firstId}`,
            Accion: "Abrir /edit",
            "Destino esperado": editPath,
            Resultado: "FAIL",
            Evidencia: `HTML ${edit.res.status}`,
            Severidad: "media",
          });
        }
      } else if (listKey === "accounting/drafts") {
        const hasTypedEdit = /\/lists\/accounting\/[^/]+\/\d+\/edit|Editar borrador/i.test(
          html.html
        );
        add({
          Pantalla: `Detalle ${listKey}/${firstId}`,
          Accion: "CTA Editar borrador (tipado)",
          "Destino esperado": "…/customer-invoices|vendor-bills/…/edit",
          Resultado: hasTypedEdit ? "OK" : "FAIL",
          Evidencia: hasTypedEdit ? "link tipado en ficha" : "sin CTA edit tipado",
          Severidad: hasTypedEdit ? "info" : "media",
        });
      }
    }
  } else if (def?.detailPath && listRows.length === 0) {
    add({
      Pantalla: `Lista ${listKey}`,
      Accion: "Abrir detalle",
      "Destino esperado": def.detailPath,
      Resultado: "EMPTY",
      Evidencia: "sin filas para probar detalle",
      Severidad: "info",
    });
  }

  if (canCreateRecord(listKey)) {
    const newPath = `/lists/${listKey}/new`;
    const html = await fetchHtml(newPath);
    const ok = html.res.status === 200;
    const looksForm =
      /form|sg-form|order-create|OrderCreate|name=|type="submit"|Nueva|Nuevo/i.test(
        html.html
      );
    let result = "OK";
    if (!ok) result = "FAIL";
    else if (!looksForm) result = "PARTIAL";
    add({
      Pantalla: `Lista ${listKey}`,
      Accion: "CTA Nuevo → /new",
      "Destino esperado": newPath,
      Resultado: result,
      Evidencia: `HTML ${html.res.status}, formish=${looksForm}`,
      Severidad: severityFor(result),
    });

    if (mutate && listKey === "sales/customers" && ok) {
      const name = `AUDIT Cliente ${Date.now()}`;
      const { res, body } = await fetchJson(`/api/records/${listKey}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          values: { name, sg_invoice_dest: "cf" },
        }),
      });
      const createdId = body.id || body.record?.id;
      const writeOk = res.ok && createdId;
      add({
        Pantalla: `Crear ${listKey}`,
        Accion: "POST create (AUDIT_MUTATE)",
        "Destino esperado": "id Odoo",
        Resultado: writeOk ? "OK" : "FAIL",
        Evidencia: `HTTP ${res.status} ${JSON.stringify(body).slice(0, 200)}`,
        Severidad: severityFor(writeOk ? "OK" : "FAIL"),
      });
      if (writeOk) {
        const detailPath = `/lists/sales/customers/${createdId}`;
        const detail = await fetchHtml(detailPath);
        const list = await fetchJson(`/api/lists/sales/customers?q=${encodeURIComponent(name)}`);
        const inList =
          Array.isArray(list.body.rows) &&
          list.body.rows.some((r) => Number(r.id) === Number(createdId));
        add({
          Pantalla: `Crear ${listKey}`,
          Accion: "Verificar aparece en detalle/lista",
          "Destino esperado": detailPath,
          Resultado:
            detail.res.status === 200 && inList
              ? "OK"
              : detail.res.status === 200
                ? "PARTIAL"
                : "FAIL",
          Evidencia: `detail ${detail.res.status}, inList=${inList}`,
          Severidad: severityFor(
            detail.res.status === 200 && inList ? "OK" : "FAIL"
          ),
        });
      }
    }
    if (mutate && listKey === "purchase/vendors" && ok) {
      const name = `AUDIT Proveedor ${Date.now()}`;
      const { res, body } = await fetchJson(`/api/records/${listKey}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ values: { name } }),
      });
      const createdId = body.id || body.record?.id;
      const writeOk = res.ok && createdId;
      add({
        Pantalla: `Crear ${listKey}`,
        Accion: "POST create (AUDIT_MUTATE)",
        "Destino esperado": "id Odoo",
        Resultado: writeOk ? "OK" : "FAIL",
        Evidencia: `HTTP ${res.status} ${JSON.stringify(body).slice(0, 200)}`,
        Severidad: severityFor(writeOk ? "OK" : "FAIL"),
      });
    }
  }
}

async function auditHub(appCfg) {
  const seenLists = new Set();
  for (const section of appCfg.sections) {
    const { res, body } = await fetchJson(
      `/api/hub/${appCfg.app}?section=${encodeURIComponent(section)}`
    );
    if (!res.ok) {
      add({
        Pantalla: `Hub ${appCfg.app}`,
        Accion: `GET section=${section}`,
        "Destino esperado": "payload hub",
        Resultado: "FAIL",
        Evidencia: `HTTP ${res.status}`,
        Severidad: "alta",
      });
      continue;
    }

    const html = await fetchHtml(
      `/hubs/${appCfg.app}?section=${encodeURIComponent(section)}`
    );
    add({
      Pantalla: `Hub ${appCfg.app}`,
      Accion: `Página section=${section}`,
      "Destino esperado": `/hubs/${appCfg.app}?section=${section}`,
      Resultado: html.res.status === 200 ? "OK" : "FAIL",
      Evidencia: `API ${res.status}, HTML ${html.res.status}, cards=${(body.cards || body.groups?.flatMap((g) => g.cards) || []).length}`,
      Severidad: severityFor(html.res.status === 200 ? "OK" : "FAIL"),
    });

    const cards = body.groups?.length
      ? body.groups.flatMap((g) => g.cards)
      : body.cards || [];

    for (const card of cards) {
      const meta = await auditCard(appCfg.app, section, card);
      if (meta?.listKey && !seenLists.has(meta.listKey)) {
        seenLists.add(meta.listKey);
        await auditDetailAndCreate(meta);
      }
    }
  }
}

async function auditExtras() {
  for (const route of EXTRA_ROUTES) {
    if (route.json) {
      const { res, body } = await fetchJson(route.path);
      const ok = res.ok;
      add({
        Pantalla: route.pantalla,
        Accion: route.accion,
        "Destino esperado": route.path,
        Resultado: ok ? "OK" : "FAIL",
        Evidencia: `API ${res.status} ${ok ? "" : JSON.stringify(body).slice(0, 120)}`,
        Severidad: severityFor(ok ? "OK" : "FAIL"),
      });
      continue;
    }
    const html = await fetchHtml(route.path);
    const ok = html.res.status === 200;
    add({
      Pantalla: route.pantalla,
      Accion: route.accion,
      "Destino esperado": route.path,
      Resultado: ok ? "OK" : "FAIL",
      Evidencia: `HTML ${html.res.status}`,
      Severidad: severityFor(ok ? "OK" : "FAIL"),
    });
  }
}

async function main() {
  console.log(`Audit base=${base} mutate=${mutate}`);
  // prereq
  try {
    const res = await fetch(`${base}/login`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok && res.status !== 302) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    console.error("PREREQ Astro down:", e.message);
    process.exit(2);
  }

  await login();
  await auditLauncher();
  for (const app of APPS) {
    await auditHub(app);
  }
  await auditExtras();

  const counts = rows.reduce((acc, r) => {
    acc[r.Resultado] = (acc[r.Resultado] || 0) + 1;
    return acc;
  }, {});

  console.log("\n=== RESUMEN ===");
  console.log(counts);
  console.log(`Total checks: ${rows.length}`);

  // CSV-ish for matrix
  console.log("\n=== MATRIZ ===");
  console.log(
    "Pantalla|Accion|Destino esperado|Resultado|Evidencia|Severidad"
  );
  for (const r of rows) {
    console.log(
      [r.Pantalla, r.Accion, r["Destino esperado"], r.Resultado, r.Evidencia, r.Severidad]
        .map((x) => String(x).replace(/\|/g, "/"))
        .join("|")
    );
  }

  const fails = rows.filter((r) => r.Resultado === "FAIL");
  if (fails.length) {
    console.log("\n=== FAILS ===");
    for (const f of fails) {
      console.log(
        `${f.Pantalla} | ${f.Accion} | ${f["Destino esperado"]} | ${f.Evidencia}`
      );
    }
  }

  process.exit(fails.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
