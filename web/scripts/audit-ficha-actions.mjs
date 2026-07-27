/**
 * Auditoría E2E acciones de ficha:
 * notas · archivar · share PDF/WA/mail · lifecycle FC · adjuntos FP · mark FW.
 * Requiere Astro :4321 + Odoo. MUTA datos.
 *
 * Uso:
 *   SMOKE_LOGIN=mauri SMOKE_PASSWORD=admin \
 *   node --experimental-strip-types --import ./scripts/test-env.mjs \
 *   scripts/audit-ficha-actions.mjs
 */
const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:4321";
const loginName = process.env.SMOKE_LOGIN || "admin";
const password = process.env.SMOKE_PASSWORD || "admin";
const stamp = Date.now();
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

async function fetchBinary(path) {
  const res = await fetch(`${base}${path}`, {
    headers: { cookie: cookieHeader() },
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

async function pickProduct() {
  const products = await fetchJson("/api/lists/inventory/products");
  const row = products.body.rows?.[0];
  const productId = Number(
    row?.product_variant_id || row?.product_id || row?.id
  );
  if (!productId) throw new Error("no product");
  return productId;
}

async function notesAndArchive(productId) {
  const create = await fetchJson("/api/records/sales/customers", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "create",
      values: {
        name: `AUDIT Ficha ${stamp}`,
        phone: "11 5555-9988",
        email: `audit.ficha.${stamp}@example.com`,
        sg_invoice_dest: "cf",
      },
    }),
  });
  const partnerId = Number(create.body.id);
  add({
    Paso: "1. Cliente audit",
    Accion: "POST create sales/customers",
    Esperado: "id",
    Resultado: create.res.ok && partnerId ? "OK" : "FAIL",
    Evidencia: `HTTP ${create.res.status} id=${partnerId}`,
  });
  if (!partnerId) throw new Error("customer create failed");

  const ficha = await fetchHtml(`/lists/sales/customers/${partnerId}`);
  const hasNotes = /data-record-notes|Agregar una nota/i.test(ficha.html);
  const hasArchive = /Archivar|data-record-archive/i.test(ficha.html);
  add({
    Paso: "1b. CTAs ficha cliente",
    Accion: "GET ficha",
    Esperado: "Notas + Archivar",
    Resultado: ficha.res.status === 200 && hasNotes && hasArchive ? "OK" : "FAIL",
    Evidencia: `notes=${hasNotes}, archive=${hasArchive}`,
  });

  const noteBody = `Nota audit ${stamp}`;
  const created = await fetchJson("/api/notes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      listKey: "sales/customers",
      recordId: partnerId,
      body: noteBody,
    }),
  });
  const noteId = Number(created.body.note?.id);
  add({
    Paso: "1c. Crear nota",
    Accion: "POST /api/notes",
    Esperado: "note.id",
    Resultado: created.res.ok && noteId ? "OK" : "FAIL",
    Evidencia: `HTTP ${created.res.status} ${JSON.stringify(created.body).slice(0, 200)}`,
  });

  const listed = await fetchJson(
    `/api/notes?listKey=sales/customers&recordId=${partnerId}`
  );
  const found = (listed.body.notes || []).some((n) => Number(n.id) === noteId);
  add({
    Paso: "1d. Listar notas",
    Accion: "GET /api/notes",
    Esperado: "nota listada",
    Resultado: listed.res.ok && found ? "OK" : "FAIL",
    Evidencia: `HTTP ${listed.res.status}, found=${found}`,
  });

  const patched = await fetchJson("/api/notes", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      id: noteId,
      body: `${noteBody} editada`,
    }),
  });
  add({
    Paso: "1e. Editar nota",
    Accion: "PATCH /api/notes",
    Esperado: "ok",
    Resultado: patched.res.ok ? "OK" : "FAIL",
    Evidencia: `HTTP ${patched.res.status}`,
  });

  const deleted = await fetchJson("/api/notes", {
    method: "DELETE",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: noteId }),
  });
  add({
    Paso: "1f. Borrar nota",
    Accion: "DELETE /api/notes",
    Esperado: "ok",
    Resultado: deleted.res.ok ? "OK" : "FAIL",
    Evidencia: `HTTP ${deleted.res.status}`,
  });

  // Keep partner for share tests; create a disposable one to archive
  const disposable = await fetchJson("/api/records/sales/customers", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "create",
      values: {
        name: `AUDIT Archive ${stamp}`,
        sg_invoice_dest: "cf",
      },
    }),
  });
  const archId = Number(disposable.body.id);
  const arch = await fetchJson("/api/records/sales/customers", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "archive", id: archId }),
  });
  add({
    Paso: "1g. Archivar",
    Accion: "POST archive sales/customers",
    Esperado: "ok",
    Resultado: arch.res.ok ? "OK" : "FAIL",
    Evidencia: `HTTP ${arch.res.status} id=${archId}`,
  });

  return { partnerId, productId };
}

async function shareActions({ partnerId, productId }) {
  const q = await fetchJson("/api/records/sales/quotations", {
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
  const orderId = Number(q.body.id);
  add({
    Paso: "2. Cotización share",
    Accion: "POST create quotation",
    Esperado: "id",
    Resultado: q.res.ok && orderId ? "OK" : "FAIL",
    Evidencia: `HTTP ${q.res.status} id=${orderId}`,
  });
  if (!orderId) throw new Error("quotation failed");

  const html = await fetchHtml(`/lists/sales/quotations/${orderId}`);
  const hasPdf = /Descargar PDF|data-invoice-pdf-download|data-pdf-url/i.test(
    html.html
  );
  const hasWa = /wa\.me\/|WhatsApp/i.test(html.html);
  const hasMail = /Enviar por mail|data-so-share-email/i.test(html.html);
  const waEnabled = /href="https:\/\/wa\.me\//i.test(html.html);
  const mailEnabled = /data-has-email=["']1["']/i.test(html.html);
  add({
    Paso: "2b. CTAs share",
    Accion: "GET ficha cotización",
    Esperado: "PDF + WA + mail",
    Resultado: html.res.status === 200 && hasPdf && hasWa && hasMail ? "OK" : "FAIL",
    Evidencia: `pdf=${hasPdf}, wa=${hasWa}, mail=${hasMail}, waEnabled=${waEnabled}, mailEnabled=${mailEnabled}`,
  });

  const pdf = await fetchBinary(
    `/api/reports/sale-order/sales/quotations/${orderId}`
  );
  const isPdf =
    pdf.res.ok &&
    pdf.buf.length > 100 &&
    (pdf.res.headers.get("content-type") || "").includes("pdf");
  add({
    Paso: "2c. PDF cotización",
    Accion: "GET report sale-order",
    Esperado: "stream PDF",
    Resultado: isPdf ? "OK" : pdf.res.status === 502 ? "PARTIAL" : "FAIL",
    Evidencia: `HTTP ${pdf.res.status}, bytes=${pdf.buf.length}`,
  });

  const mail = await fetchJson("/api/sale-orders/send-email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ listKey: "sales/quotations", id: orderId }),
  });
  // SMTP puede no estar configurado en dev → PARTIAL si falla envío real
  const mailOk = mail.res.ok && mail.body.ok === true;
  const mailPartial =
    !mailOk &&
    (mail.res.status === 503 ||
      /mail|smtp|correo|template/i.test(
        JSON.stringify(mail.body.error || mail.body)
      ));
  add({
    Paso: "2d. Enviar mail",
    Accion: "POST /api/sale-orders/send-email",
    Esperado: "ok (o PARTIAL sin SMTP)",
    Resultado: mailOk ? "OK" : mailPartial ? "PARTIAL" : "FAIL",
    Evidencia: `HTTP ${mail.res.status} ${JSON.stringify(mail.body).slice(0, 240)}`,
  });

  // notes on order ficha
  const noteUi = /data-record-notes/i.test(html.html);
  add({
    Paso: "2e. Notas en pedido",
    Accion: "CTA notas en cotización",
    Esperado: "bloque notas",
    Resultado: noteUi ? "OK" : "FAIL",
    Evidencia: `noteUi=${noteUi}`,
  });

  return orderId;
}

async function invoiceLifecycle(partnerId, productId) {
  const create = await fetchJson(
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
  const invId = Number(create.body.id);
  add({
    Paso: "3. FC lifecycle",
    Accion: "POST create FC",
    Esperado: "id",
    Resultado: create.res.ok && invId ? "OK" : "FAIL",
    Evidencia: `HTTP ${create.res.status} id=${invId}`,
  });
  if (!invId) throw new Error("invoice create failed");

  const pub = await fetchJson("/api/records/accounting/customer-invoices", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "confirm", id: invId }),
  });
  add({
    Paso: "3b. Publicar",
    Accion: "POST confirm",
    Esperado: "posted",
    Resultado: pub.res.ok && pub.body.state === "posted" ? "OK" : "FAIL",
    Evidencia: `HTTP ${pub.res.status} ${JSON.stringify(pub.body).slice(0, 160)}`,
  });

  const postedHtml = await fetchHtml(
    `/lists/accounting/customer-invoices/${invId}`
  );
  const hasReset = /Volver a borrador|reset_invoice_draft/i.test(
    postedHtml.html
  );
  const hasCancel = /Anular|cancel_invoice/i.test(postedHtml.html);
  const hasFw = /Factura Web|mark_fw|data-mark-fw/i.test(postedHtml.html);
  add({
    Paso: "3c. CTAs lifecycle",
    Accion: "GET ficha posted",
    Esperado: "reset + anular (+ FW si aplica)",
    Resultado: hasReset && hasCancel ? "OK" : "FAIL",
    Evidencia: `reset=${hasReset}, cancel=${hasCancel}, fw=${hasFw}`,
  });

  const reset = await fetchJson("/api/records/accounting/customer-invoices", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "reset_invoice_draft", id: invId }),
  });
  add({
    Paso: "3d. Volver a borrador",
    Accion: "POST reset_invoice_draft",
    Esperado: "state=draft",
    Resultado:
      reset.res.ok && (reset.body.state === "draft" || reset.body.ok)
        ? "OK"
        : "FAIL",
    Evidencia: `HTTP ${reset.res.status} ${JSON.stringify(reset.body).slice(0, 180)}`,
  });

  const pub2 = await fetchJson("/api/records/accounting/customer-invoices", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "confirm", id: invId }),
  });
  add({
    Paso: "3e. Re-publicar",
    Accion: "POST confirm",
    Esperado: "posted",
    Resultado: pub2.res.ok && pub2.body.state === "posted" ? "OK" : "FAIL",
    Evidencia: `HTTP ${pub2.res.status}`,
  });

  if (hasFw || /sg_fw|Factura Web/i.test(postedHtml.html)) {
    const fw = await fetchJson("/api/records/accounting/customer-invoices", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "mark_fw_loaded",
        id: invId,
        values: { fwNumber: `FW-${stamp}` },
      }),
    });
    add({
      Paso: "3f. Marcar Factura Web",
      Accion: "POST mark_fw_loaded",
      Esperado: "ok",
      Resultado: fw.res.ok ? "OK" : "PARTIAL",
      Evidencia: `HTTP ${fw.res.status} ${JSON.stringify(fw.body).slice(0, 200)}`,
    });
  } else {
    add({
      Paso: "3f. Marcar Factura Web",
      Accion: "CTA ausente",
      Esperado: "opcional según estado",
      Resultado: "EMPTY",
      Evidencia: "sin CTA FW en ficha",
    });
  }

  // Fresh unpaid FC for cancel (if FW marked previous as paid-ish, cancel may fail)
  const create2 = await fetchJson(
    "/api/records/accounting/customer-invoices",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "create",
        values: {
          partnerId,
          lines: [{ productId, qty: 1, price: 55 }],
        },
      }),
    }
  );
  const cancelId = Number(create2.body.id);
  await fetchJson("/api/records/accounting/customer-invoices", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "confirm", id: cancelId }),
  });
  const cancel = await fetchJson("/api/records/accounting/customer-invoices", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "cancel_invoice", id: cancelId }),
  });
  add({
    Paso: "3g. Anular FC",
    Accion: "POST cancel_invoice",
    Esperado: "state=cancel",
    Resultado:
      cancel.res.ok &&
      (cancel.body.state === "cancel" ||
        cancel.body.state === "cancelled" ||
        cancel.body.ok)
        ? "OK"
        : "FAIL",
    Evidencia: `HTTP ${cancel.res.status} id=${cancelId} ${JSON.stringify(cancel.body).slice(0, 180)}`,
  });

  return invId;
}

async function vendorBillAttachments(productId) {
  const vendors = await fetchJson("/api/lists/purchase/vendors");
  const partnerId = Number(vendors.body.rows?.[0]?.id);
  if (!partnerId) {
    add({
      Paso: "4. Adjuntos FP",
      Accion: "skipped",
      Esperado: "proveedor",
      Resultado: "FAIL",
      Evidencia: "sin vendors",
    });
    return;
  }

  const create = await fetchJson("/api/records/accounting/vendor-bills", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      action: "create",
      values: {
        partnerId,
        billSource: "whatsapp",
        lines: [{ productId, qty: 1, price: 80 }],
        attachment: {
          filename: `fp-ficha-${stamp}.png`,
          mimetype: "image/png",
          content: TINY_PNG,
        },
      },
    }),
  });
  const billId = Number(create.body.id);
  add({
    Paso: "4. Crear FP adjunto",
    Accion: "POST vendor-bills",
    Esperado: "id",
    Resultado: create.res.ok && billId ? "OK" : "FAIL",
    Evidencia: `HTTP ${create.res.status} id=${billId}`,
  });
  if (!billId) return;

  const html = await fetchHtml(`/lists/accounting/vendor-bills/${billId}`);
  const hasAtt =
    /sg-detail-attachments|Comprobante|\/api\/attachments\//i.test(html.html);
  add({
    Paso: "4b. Adjunto en ficha",
    Accion: "GET ficha FP",
    Esperado: "bloque comprobante / link",
    Resultado: html.res.status === 200 && hasAtt ? "OK" : "FAIL",
    Evidencia: `hasAtt=${hasAtt}`,
  });

  const attMatch = html.html.match(/\/api\/attachments\/(\d+)/);
  if (attMatch) {
    const att = await fetchBinary(`/api/attachments/${attMatch[1]}`);
    add({
      Paso: "4c. Descargar adjunto",
      Accion: `GET /api/attachments/${attMatch[1]}`,
      Esperado: "bytes > 0",
      Resultado: att.res.ok && att.buf.length > 0 ? "OK" : "FAIL",
      Evidencia: `HTTP ${att.res.status}, bytes=${att.buf.length}`,
    });
  } else {
    add({
      Paso: "4c. Descargar adjunto",
      Accion: "link ausente",
      Esperado: "/api/attachments/:id",
      Resultado: "FAIL",
      Evidencia: "no match in HTML",
    });
  }
}

async function purchaseShareUi() {
  const orders = await fetchJson("/api/lists/purchase/orders");
  const id = Number(orders.body.rows?.[0]?.id);
  if (!id) {
    add({
      Paso: "5. Share OC",
      Accion: "skipped",
      Esperado: "OC existente",
      Resultado: "EMPTY",
      Evidencia: "sin órdenes",
    });
    return;
  }
  const html = await fetchHtml(`/lists/purchase/orders/${id}`);
  const hasShare = /data-po-share|Enviar|Descargar PDF|WhatsApp/i.test(
    html.html
  );
  const hasNotes = /data-record-notes/i.test(html.html);
  const hasReceipts = /data-po-receipts|Recepciones/i.test(html.html);
  add({
    Paso: "5. Acciones ficha OC",
    Accion: `GET /lists/purchase/orders/${id}`,
    Esperado: "share + notas + recepciones",
    Resultado:
      html.res.status === 200 && hasShare && hasNotes ? "OK" : "FAIL",
    Evidencia: `share=${hasShare}, notes=${hasNotes}, receipts=${hasReceipts}`,
  });
}

async function main() {
  console.log(`Ficha actions audit base=${base}`);
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
  const productId = await pickProduct();
  const { partnerId } = await notesAndArchive(productId);
  await shareActions({ partnerId, productId });
  await invoiceLifecycle(partnerId, productId);
  await vendorBillAttachments(productId);
  await purchaseShareUi();

  const counts = rows.reduce((acc, r) => {
    acc[r.Resultado] = (acc[r.Resultado] || 0) + 1;
    return acc;
  }, {});
  console.log("\n=== RESUMEN ===");
  console.log(counts);

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
