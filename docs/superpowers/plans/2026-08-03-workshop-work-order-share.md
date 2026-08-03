# Taller OT — PDF / WhatsApp / Mail + logo Servigas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En la ficha de OT, generar PDF con logo Servigas, enviarlo por WhatsApp (`wa.me`) y por mail Odoo (con adjunto), y mostrar el logo Servigas en el formulario de alta y en la ficha digital.

**Architecture:** Mirror del flujo de pedidos: QWeb report + `mail.template` en `servigas_core`; BFF allowlist + proxy PDF + `send_mail`; panel Astro en la ficha OT. Contacto: email/phone del `partner_id`, con fallback de teléfono a `owner_phone`.

**Tech Stack:** Odoo 19 QWeb PDF, `mail.template`, Astro SSR BFF, Node test runner (`web/tests/*.test.mjs`).

**Spec:** `docs/superpowers/specs/2026-08-03-workshop-work-order-share-design.md`

## Global Constraints

- Flujo igual a pedidos: Ver/Descargar PDF + WhatsApp + mail Odoo con adjunto.
- Disponible en borrador y cerrada.
- Logo en PDF **y** UI (alta + ficha).
- Contacto: `partner.email` / `partner.phone` → `partner.mobile` → `owner_phone`. Mail solo con `partner.email`.
- PDF A4 branded (no clone papel). Sin foto de chapa en PDF.
- Report/template XMLIDs fijos server-side (nunca desde el browser).
- Worktree de trabajo: `servigas-workshop`, rama `feat/workshop-work-orders`.

---

## File map

| File | Responsibility |
|------|----------------|
| `web/src/lib/shell/workshop-order-share.ts` | Allowlists, paths, resolve contact, WA message/filename |
| `web/tests/workshop-order-share.test.mjs` | Unit + adapter/API smoke for share |
| `custom_addons/servigas_core/report/sg_work_order_report.xml` | QWeb PDF + `ir.actions.report` |
| `custom_addons/servigas_core/data/mail_template_sg_work_order.xml` | `mail.template` con report adjunto |
| `custom_addons/servigas_core/__manifest__.py` | Data files + version bump |
| `web/src/lib/bff/odoo-adapter.ts` | `fetchWorkshopOrderPdf`, `getWorkshopOrderShareMeta`, `sendWorkshopOrderEmail` |
| `web/src/lib/bff/backend-client.ts` | Interface methods |
| `web/src/pages/api/reports/workshop-order/[...slug].ts` | GET PDF proxy |
| `web/src/pages/api/workshop-orders/send-email.ts` | POST send mail |
| `web/src/components/RecordWorkOrderShareControl.astro` | Panel UI |
| `web/src/pages/lists/workshop/orders/[id].astro` | Wire share + logo |
| `web/src/components/WorkOrderCreateForm.astro` | Logo en header |
| `web/tests/shell-ui.test.mjs` | Assertions logo + share panel |
| `docs/proyecto/bitacora-cambios.md` | Entrada de cambio |

---

### Task 1: Helpers `workshop-order-share` (TDD)

**Files:**
- Create: `web/src/lib/shell/workshop-order-share.ts`
- Create: `web/tests/workshop-order-share.test.mjs`

**Interfaces:**
- Consumes: `normalizeWhatsappPhone`, `purchaseOrderWhatsappUrl` from `web/src/lib/shell/purchase-order-share.ts`
- Produces:
  - `WORKSHOP_ORDER_PDF_REPORT = "servigas_core.report_sg_work_order"`
  - `WORKSHOP_ORDER_EMAIL_TEMPLATE = "servigas_core.email_template_sg_work_order"`
  - `canFetchWorkshopOrderPdf(listKey: string): boolean`
  - `canSendWorkshopOrderEmail(listKey: string): boolean`
  - `workshopOrderPdfPath(listKey: string, id: number): string`
  - `parseWorkshopOrderPdfSlug(slug: string): { listKey: string; id: number } | null`
  - `workshopOrderPdfFilename(title: string | null | undefined, id: number): string`
  - `workshopOrderWhatsappMessage(orderName: string, displayName: string): string`
  - `workshopOrderWhatsappUrl(phone: string | null | undefined, message: string): string | null`
  - `resolveWorkshopShareContacts(input): { displayName: string; email: string | null; phone: string | null }`
  - `missingWorkshopContactHint(input: { phone: string | null; email: string | null }): string | null`
  - `type WorkshopOrderShareMeta`

- [ ] **Step 1: Write the failing test**

Create `web/tests/workshop-order-share.test.mjs`:

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  WORKSHOP_ORDER_EMAIL_TEMPLATE,
  WORKSHOP_ORDER_PDF_REPORT,
  canFetchWorkshopOrderPdf,
  canSendWorkshopOrderEmail,
  missingWorkshopContactHint,
  parseWorkshopOrderPdfSlug,
  resolveWorkshopShareContacts,
  workshopOrderPdfFilename,
  workshopOrderPdfPath,
  workshopOrderWhatsappMessage,
} from "../src/lib/shell/workshop-order-share.ts";

describe("workshop-order-share allowlist", () => {
  it("allows only workshop/orders", () => {
    assert.equal(canFetchWorkshopOrderPdf("workshop/orders"), true);
    assert.equal(canSendWorkshopOrderEmail("workshop/orders"), true);
    assert.equal(
      workshopOrderPdfPath("workshop/orders", 12),
      "/api/reports/workshop-order/workshop/orders/12"
    );
    assert.equal(canFetchWorkshopOrderPdf("sales/orders"), false);
    assert.equal(workshopOrderPdfPath("workshop/orders", 0), "");
  });

  it("parses slug and keeps report/template fixed", () => {
    assert.deepEqual(parseWorkshopOrderPdfSlug("workshop/orders/12"), {
      listKey: "workshop/orders",
      id: 12,
    });
    assert.equal(parseWorkshopOrderPdfSlug("workshop/orders"), null);
    assert.equal(
      WORKSHOP_ORDER_PDF_REPORT,
      "servigas_core.report_sg_work_order"
    );
    assert.equal(
      WORKSHOP_ORDER_EMAIL_TEMPLATE,
      "servigas_core.email_template_sg_work_order"
    );
  });

  it("builds filename, WA message and contact hints", () => {
    assert.equal(workshopOrderPdfFilename("OT/2026-08-03/0012", 12), "OT-2026-08-03-0012.pdf");
    assert.match(
      workshopOrderWhatsappMessage("OT/2026-08-03/0012", "Ana"),
      /orden de trabajo OT\/2026-08-03\/0012/
    );
    assert.equal(
      missingWorkshopContactHint({ phone: null, email: null }),
      "Cargá el teléfono/mail del cliente"
    );
    assert.equal(
      missingWorkshopContactHint({ phone: "54911", email: null }),
      "Cargá el mail del cliente"
    );
  });

  it("resolves partner phone/email with owner_phone fallback", () => {
    const a = resolveWorkshopShareContacts({
      partnerName: "Ana",
      partnerEmail: "ana@x.com",
      partnerPhone: "",
      partnerMobile: "1155551111",
      ownerName: "Papel",
      ownerPhone: "1144442222",
    });
    assert.equal(a.displayName, "Ana");
    assert.equal(a.email, "ana@x.com");
    assert.ok(a.phone); // normalized mobile

    const b = resolveWorkshopShareContacts({
      partnerName: null,
      partnerEmail: null,
      partnerPhone: null,
      partnerMobile: null,
      ownerName: "Papel",
      ownerPhone: "1144442222",
    });
    assert.equal(b.displayName, "Papel");
    assert.equal(b.email, null);
    assert.ok(b.phone);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && node --test tests/workshop-order-share.test.mjs`

Expected: FAIL (module not found / exports missing)

- [ ] **Step 3: Write minimal implementation**

Create `web/src/lib/shell/workshop-order-share.ts`:

```ts
import {
  normalizeWhatsappPhone,
  purchaseOrderWhatsappUrl,
} from "./purchase-order-share.ts";

export const WORKSHOP_ORDER_PDF_REPORT =
  "servigas_core.report_sg_work_order" as const;

export const WORKSHOP_ORDER_EMAIL_TEMPLATE =
  "servigas_core.email_template_sg_work_order" as const;

const WORKSHOP_ORDER_SHARE_LIST_KEYS = new Set(["workshop/orders"]);

export function canFetchWorkshopOrderPdf(listKey: string): boolean {
  return WORKSHOP_ORDER_SHARE_LIST_KEYS.has(listKey);
}

export function canSendWorkshopOrderEmail(listKey: string): boolean {
  return WORKSHOP_ORDER_SHARE_LIST_KEYS.has(listKey);
}

export function workshopOrderPdfPath(listKey: string, id: number): string {
  if (!canFetchWorkshopOrderPdf(listKey) || !Number.isFinite(id) || id <= 0) {
    return "";
  }
  return `/api/reports/workshop-order/${listKey}/${id}`;
}

export function parseWorkshopOrderPdfSlug(slug: string): {
  listKey: string;
  id: number;
} | null {
  const parts = slug.split("/").filter(Boolean);
  if (parts.length < 3) return null;
  const idRaw = parts[parts.length - 1];
  const listKey = parts.slice(0, -1).join("/");
  const id = Number(idRaw);
  if (!canFetchWorkshopOrderPdf(listKey) || !Number.isFinite(id) || id <= 0) {
    return null;
  }
  return { listKey, id };
}

export function workshopOrderPdfFilename(
  title: string | null | undefined,
  id: number
): string {
  const raw = String(title || "").trim() || `ot-${id}`;
  const safe = raw
    .replace(/[/\\]+/g, "-")
    .replace(/[^\w.\-áéíóúñÁÉÍÓÚÑ ]+/gi, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
  return `${safe || `ot-${id}`}.pdf`;
}

export function workshopOrderWhatsappMessage(
  orderName: string,
  displayName: string
): string {
  const name = String(displayName || "").trim() || "cliente";
  const order = String(orderName || "").trim() || "documento";
  return `Hola ${name}, te envío la orden de trabajo ${order}. Por favor revisá el PDF adjunto.`;
}

export function workshopOrderWhatsappUrl(
  phone: string | null | undefined,
  message: string
): string | null {
  return purchaseOrderWhatsappUrl(phone, message);
}

export function resolveWorkshopShareContacts(input: {
  partnerName: string | null;
  partnerEmail: string | null;
  partnerPhone: string | null;
  partnerMobile: string | null;
  ownerName: string | null;
  ownerPhone: string | null;
}): { displayName: string; email: string | null; phone: string | null } {
  const displayName =
    String(input.partnerName || "").trim() ||
    String(input.ownerName || "").trim() ||
    "cliente";
  const emailRaw = String(input.partnerEmail || "").trim();
  const email = emailRaw || null;
  const phone =
    normalizeWhatsappPhone(input.partnerPhone) ||
    normalizeWhatsappPhone(input.partnerMobile) ||
    normalizeWhatsappPhone(input.ownerPhone);
  return { displayName, email, phone };
}

export function missingWorkshopContactHint(input: {
  phone: string | null;
  email: string | null;
}): string | null {
  const hasPhone = Boolean(input.phone);
  const hasEmail = Boolean(input.email);
  if (hasPhone && hasEmail) return null;
  if (!hasPhone && !hasEmail) return "Cargá el teléfono/mail del cliente";
  if (!hasPhone) return "Cargá el teléfono del cliente";
  return "Cargá el mail del cliente";
}

export type WorkshopOrderShareMeta = {
  orderName: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  whatsappUrl: string | null;
  pdfPath: string;
  missingContactHint: string | null;
};

export { normalizeWhatsappPhone };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd web && node --test tests/workshop-order-share.test.mjs`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/shell/workshop-order-share.ts web/tests/workshop-order-share.test.mjs
git commit -m "feat(taller): allowlist y helpers de PDF/WA/mail OT."
```

---

### Task 2: QWeb report + mail.template en Odoo

**Files:**
- Create: `custom_addons/servigas_core/report/sg_work_order_report.xml`
- Create: `custom_addons/servigas_core/data/mail_template_sg_work_order.xml`
- Modify: `custom_addons/servigas_core/__manifest__.py` (version `19.0.1.20.47`, add both data files **before** hub XMLs is fine; put report + mail after `views/sg_workshop_views.xml`)

**Interfaces:**
- Consumes: model `sg.work.order` (+ related `appliance_id.*`)
- Produces: XMLIDs `servigas_core.report_sg_work_order`, `servigas_core.email_template_sg_work_order`

- [ ] **Step 1: Add QWeb report XML**

Locked IDs (avoid clash between QWeb template and `ir.actions.report`):

- QWeb template id: `report_sg_work_order_document`
- Report action id: `report_sg_work_order` → BFF uses `servigas_core.report_sg_work_order`
- `report_name` / `report_file`: `servigas_core.report_sg_work_order_document`

Create `custom_addons/servigas_core/report/sg_work_order_report.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<odoo>
  <template id="report_sg_work_order_document">
    <t t-call="web.html_container">
      <t t-foreach="docs" t-as="o">
        <div class="page" style="font-family: Montserrat, DejaVu Sans, sans-serif; color: #1a1a1a;">
          <div style="display:flex; align-items:center; gap:16px; margin-bottom:20px; border-bottom:2px solid #c45c26; padding-bottom:12px;">
            <img t-att-src="'/servigas_core/static/src/img/servigas_logo.png'"
                 style="height:56px; width:auto;" alt="Servigas"/>
            <div>
              <div style="font-size:20px; font-weight:700;">Orden de trabajo</div>
              <div style="font-size:13px; color:#555;">
                <span t-esc="o.name"/> ·
                <span t-esc="dict(o._fields['state'].selection).get(o.state)"/> ·
                <span t-field="o.date"/>
              </div>
            </div>
          </div>

          <h3 style="font-size:14px; margin:16px 0 8px;">Cliente</h3>
          <table style="width:100%; font-size:12px; border-collapse:collapse;">
            <tr>
              <td style="padding:4px 8px 4px 0; width:30%; color:#666;">Propietario</td>
              <td style="padding:4px 0;"><span t-esc="o.owner_name or '—'"/></td>
            </tr>
            <tr>
              <td style="padding:4px 8px 4px 0; color:#666;">Celular</td>
              <td style="padding:4px 0;"><span t-esc="o.owner_phone or '—'"/></td>
            </tr>
            <tr>
              <td style="padding:4px 8px 4px 0; color:#666;">Cliente Odoo</td>
              <td style="padding:4px 0;"><span t-esc="o.partner_id.display_name if o.partner_id else '—'"/></td>
            </tr>
          </table>

          <h3 style="font-size:14px; margin:16px 0 8px;">Artefacto</h3>
          <table style="width:100%; font-size:12px; border-collapse:collapse;">
            <tr>
              <td style="padding:4px 8px 4px 0; width:30%; color:#666;">Nº de serie</td>
              <td style="padding:4px 0;"><span t-esc="o.serial_number or '—'"/></td>
            </tr>
            <tr>
              <td style="padding:4px 8px 4px 0; color:#666;">Marca / modelo</td>
              <td style="padding:4px 0;">
                <span t-esc="o.brand or ''"/>
                <t t-if="o.model"> / <span t-esc="o.model"/></t>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 8px 4px 0; color:#666;">Descripción</td>
              <td style="padding:4px 0;"><span t-esc="o.appliance_id.name or '—'"/></td>
            </tr>
            <tr>
              <td style="padding:4px 8px 4px 0; color:#666;">Gas</td>
              <td style="padding:4px 0;">
                <span t-esc="dict(o.appliance_id._fields['gas_type'].selection).get(o.appliance_id.gas_type) if o.appliance_id.gas_type else '—'"/>
              </td>
            </tr>
          </table>

          <h3 style="font-size:14px; margin:16px 0 8px;">Detalle</h3>
          <div style="font-size:12px; margin-bottom:10px;">
            <div style="color:#666; margin-bottom:2px;">Problema</div>
            <div style="white-space:pre-wrap;" t-esc="o.problem or '—'"/>
          </div>
          <div style="font-size:12px; margin-bottom:10px;">
            <div style="color:#666; margin-bottom:2px;">Observación</div>
            <div style="white-space:pre-wrap;" t-esc="o.observation or '—'"/>
          </div>
          <div style="font-size:12px; margin-bottom:10px;">
            <div style="color:#666; margin-bottom:2px;">Trabajos realizados</div>
            <div style="white-space:pre-wrap;" t-esc="o.work_done or '—'"/>
          </div>
          <div style="font-size:12px; margin-bottom:10px;">
            <div style="color:#666; margin-bottom:2px;">Materiales</div>
            <div style="white-space:pre-wrap;" t-esc="o.materials or '—'"/>
          </div>
          <t t-if="o.amount">
            <div style="font-size:13px; margin-top:12px;">
              <strong>Importe:</strong>
              <span t-esc="'%.2f' % (o.amount,)"/>
            </div>
          </t>

          <div style="margin-top:28px; font-size:11px; color:#888; border-top:1px solid #ddd; padding-top:8px;">
            Servigas
          </div>
        </div>
      </t>
    </t>
  </template>

  <record id="report_sg_work_order" model="ir.actions.report">
    <field name="name">Orden de trabajo</field>
    <field name="model">sg.work.order</field>
    <field name="report_type">qweb-pdf</field>
    <field name="report_name">servigas_core.report_sg_work_order_document</field>
    <field name="report_file">servigas_core.report_sg_work_order_document</field>
    <field name="print_report_name">'OT-%s' % (object.name)</field>
    <field name="binding_model_id" ref="model_sg_work_order"/>
    <field name="binding_type">report</field>
  </record>
</odoo>
```

- [ ] **Step 2: Add mail template XML**

Create `custom_addons/servigas_core/data/mail_template_sg_work_order.xml` (Jinja body, no QWeb `t-out`):

```xml
<?xml version="1.0" encoding="utf-8"?>
<odoo>
  <record id="email_template_sg_work_order" model="mail.template">
    <field name="name">Servigas: Orden de trabajo</field>
    <field name="model_id" ref="model_sg_work_order"/>
    <field name="subject">Orden de trabajo {{ object.name }}</field>
    <field name="email_to">{{ object.partner_id.email or '' }}</field>
    <field name="partner_to">{{ object.partner_id.id or '' }}</field>
    <field name="body_html" type="html">
      <![CDATA[
      <div>
        <p>Hola {{ object.partner_id.name or object.owner_name or 'cliente' }},</p>
        <p>Adjuntamos la orden de trabajo <strong>{{ object.name }}</strong>.</p>
        <p>Saludos,<br/>Servigas</p>
      </div>
      ]]>
    </field>
    <field name="report_template_ids" eval="[(4, ref('report_sg_work_order'))]"/>
    <field name="auto_delete" eval="True"/>
  </record>
</odoo>
```

- [ ] **Step 3: Register in manifest + bump version**

In `__manifest__.py`:

- `"version": "19.0.1.20.47"`
- In `"data"` after `"views/sg_workshop_views.xml"`:

```python
"report/sg_work_order_report.xml",
"data/mail_template_sg_work_order.xml",
```

- [ ] **Step 4: Upgrade module (smoke)**

Run (from `web/`, with Odoo using this worktree addons path):

```bash
npm run odoo:ensure
# then upgrade, e.g. via existing odoo-workspace tooling:
# odoo-bin -c ... -u servigas_core --stop-after-init
```

Expected: module upgrades without XML errors; `ir.actions.report` xmlid `servigas_core.report_sg_work_order` exists.

- [ ] **Step 5: Commit**

```bash
git add custom_addons/servigas_core/report/sg_work_order_report.xml \
  custom_addons/servigas_core/data/mail_template_sg_work_order.xml \
  custom_addons/servigas_core/__manifest__.py
git commit -m "feat(taller): report PDF y mail.template de OT."
```

---

### Task 3: BFF adapter + API routes

**Files:**
- Modify: `web/src/lib/bff/backend-client.ts`
- Modify: `web/src/lib/bff/odoo-adapter.ts`
- Create: `web/src/pages/api/reports/workshop-order/[...slug].ts`
- Create: `web/src/pages/api/workshop-orders/send-email.ts`
- Modify: `web/tests/workshop-order-share.test.mjs` (add adapter + route tests)

**Interfaces:**
- Consumes: helpers from Task 1; Odoo report/template from Task 2
- Produces:
  - `fetchWorkshopOrderPdf(odooSessionId, listKey, id)`
  - `getWorkshopOrderShareMeta(odooSessionId, listKey, id): WorkshopOrderShareMeta`
  - `sendWorkshopOrderEmail(odooSessionId, listKey, id): { ok: true; email: string; orderName: string }`

- [ ] **Step 1: Extend failing tests for adapter + routes**

Append to `web/tests/workshop-order-share.test.mjs` (mirror `sale-order-share.test.mjs` patterns):

- `fetchWorkshopOrderPdf` hits `/report/pdf/servigas_core.report_sg_work_order/12`
- `getWorkshopOrderShareMeta` reads `sg.work.order` fields `name`, `partner_id`, `owner_name`, `owner_phone` then partner `email/phone/mobile`, applies `resolveWorkshopShareContacts`
- `sendWorkshopOrderEmail` resolves template xmlid and calls `mail.template` `send_mail`
- GET `/api/reports/workshop-order/...` returns PDF
- POST `/api/workshop-orders/send-email` returns `{ ok: true, email, orderName }`

- [ ] **Step 2: Run tests — expect FAIL** (methods/routes missing)

- [ ] **Step 3: Add BackendClient methods**

In `web/src/lib/bff/backend-client.ts`:

```ts
fetchWorkshopOrderPdf(
  odooSessionId: string,
  listKey: string,
  id: number
): Promise<{ body: ArrayBuffer; contentType: string; filename: string }>;
getWorkshopOrderShareMeta(
  odooSessionId: string,
  listKey: string,
  id: number
): Promise<import("../shell/workshop-order-share.ts").WorkshopOrderShareMeta>;
sendWorkshopOrderEmail(
  odooSessionId: string,
  listKey: string,
  id: number
): Promise<{ ok: true; email: string; orderName: string }>;
```

- [ ] **Step 4: Implement OdooAdapter methods**

Copy structure from `fetchSaleOrderPdf` / `getSaleOrderShareMeta` / `sendSaleOrderEmail` with these differences:

- Model: `sg.work.order`
- Report const: `WORKSHOP_ORDER_PDF_REPORT`
- Template const: `WORKSHOP_ORDER_EMAIL_TEMPLATE`
- Read fields for meta: `["name", "partner_id", "owner_name", "owner_phone"]`
- Partner read: `["name", "email", "phone", "mobile"]`
- Build contacts via `resolveWorkshopShareContacts(...)`
- Message via `workshopOrderWhatsappMessage(orderName, displayName)`
- `sendWorkshopOrderEmail`: require partnerId + email (same errors as sale: `"Cargá el mail del cliente"`); **do not** mark quotation sent
- Filename via `workshopOrderPdfFilename`

Import the new helpers at the top of `odoo-adapter.ts` alongside sale-order-share imports.

- [ ] **Step 5: Add API routes**

`web/src/pages/api/reports/workshop-order/[...slug].ts` — clone sale-order report route, swap parsers/`fetchWorkshopOrderPdf`.

`web/src/pages/api/workshop-orders/send-email.ts` — clone sale-orders send-email, swap `canSendWorkshopOrderEmail` / `sendWorkshopOrderEmail`; validation message `"OT inválida"`.

- [ ] **Step 6: Run tests — expect PASS**

```bash
cd web && node --test tests/workshop-order-share.test.mjs
```

- [ ] **Step 7: Commit**

```bash
git add web/src/lib/bff/backend-client.ts web/src/lib/bff/odoo-adapter.ts \
  web/src/pages/api/reports/workshop-order/[...slug].ts \
  web/src/pages/api/workshop-orders/send-email.ts \
  web/tests/workshop-order-share.test.mjs
git commit -m "feat(taller): BFF PDF y envío mail de OT."
```

---

### Task 4: Panel UI en ficha OT

**Files:**
- Create: `web/src/components/RecordWorkOrderShareControl.astro`
- Modify: `web/src/pages/lists/workshop/orders/[id].astro`
- Modify: `web/tests/shell-ui.test.mjs`

**Interfaces:**
- Consumes: `WorkshopOrderShareMeta`, backend `getWorkshopOrderShareMeta`
- Produces: panel with Ver/Descargar PDF, WhatsApp, Enviar por mail

- [ ] **Step 1: Extend shell-ui test (failing)**

In the existing workshop test in `web/tests/shell-ui.test.mjs`, add:

```js
assert.match(orderDetail, /RecordWorkOrderShareControl/);
assert.match(orderDetail, /Enviar al cliente|data-wo-share/);
const shareCtrl = await source("components/RecordWorkOrderShareControl.astro");
assert.match(shareCtrl, /data-wo-share/);
assert.match(shareCtrl, /\/api\/workshop-orders\/send-email/);
assert.match(shareCtrl, /WhatsApp/);
assert.match(shareCtrl, /Descargar PDF/);
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Create `RecordWorkOrderShareControl.astro`**

Clone `RecordSaleOrderShareControl.astro` with these renames:

- Root: `data-wo-share`, classes `sg-wo-share*` (can reuse SO CSS values)
- Props: `listKey`, `recordId`, `share: WorkshopOrderShareMeta`
- Email API: `/api/workshop-orders/send-email`
- Confirm copy: `¿Enviar la orden de trabajo por mail al cliente (con PDF adjunto)?`
- Success: `Mail enviado a …` (no `markedSent` reload)
- Keep `InvoicePdfModalHost` + `data-invoice-pdf-*` attributes (same modal host as pedidos)
- Tip WA: same as SO (“WhatsApp abre el chat… adjuntarlo a mano”)

- [ ] **Step 4: Wire ficha `[id].astro`**

Mirror `sales/orders/[id].astro` share block:

```astro
import RecordWorkOrderShareControl from '../../../../components/RecordWorkOrderShareControl.astro';
import { getBackend } from '../../../../lib/bff/get-backend.ts';
import { requireOdooSession } from '../../../../lib/bff/http.ts';
import {
  missingWorkshopContactHint,
  workshopOrderPdfPath,
  type WorkshopOrderShareMeta,
} from '../../../../lib/shell/workshop-order-share.ts';

const pdfPath = workshopOrderPdfPath(listKey, id);
const fallbackShare: WorkshopOrderShareMeta = {
  orderName: detail?.title || `OT-${id}`,
  displayName: fieldValue('owner_name') || fieldValue('partner_id') || 'cliente',
  email: null,
  phone: null,
  whatsappUrl: null,
  pdfPath,
  missingContactHint: missingWorkshopContactHint({ phone: null, email: null }),
};
let share: WorkshopOrderShareMeta | null = pdfPath ? fallbackShare : null;
if (detail && !error && share) {
  try {
    const { odooSessionId } = requireOdooSession(Astro.cookies);
    share = await getBackend().getWorkshopOrderShareMeta(odooSessionId, listKey, id);
  } catch (cause) {
    console.warn('[workshop/orders] share meta fallback', cause);
    share = fallbackShare;
  }
}
```

In `slot="secondary"` **before** close/delete actions:

```astro
{share ? (
  <RecordWorkOrderShareControl listKey={listKey} recordId={id} share={share} />
) : null}
```

Keep existing close/delete controls.

- [ ] **Step 5: Run shell-ui + workshop-order-share tests — PASS**

```bash
cd web && node --test tests/shell-ui.test.mjs tests/workshop-order-share.test.mjs
```

- [ ] **Step 6: Commit**

```bash
git add web/src/components/RecordWorkOrderShareControl.astro \
  web/src/pages/lists/workshop/orders/[id].astro \
  web/tests/shell-ui.test.mjs
git commit -m "feat(taller): panel PDF/WhatsApp/mail en ficha OT."
```

---

### Task 5: Logo Servigas en UI digital

**Files:**
- Modify: `web/src/components/WorkOrderCreateForm.astro`
- Modify: `web/src/pages/lists/workshop/orders/[id].astro` (and/or pass branded eyebrow via layout around `RecordDetailBody`)
- Modify: `web/tests/shell-ui.test.mjs`

**Interfaces:**
- Consumes: static asset `/servigas-logo.png` (`web/public/servigas-logo.png`)
- Produces: visible logo in create form header + OT detail header

- [ ] **Step 1: Extend shell-ui assertions**

```js
assert.match(form, /servigas-logo\.png/);
assert.match(form, /alt=["']Servigas["']/);
assert.match(orderDetail, /servigas-logo\.png/);
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Brand create form**

In `WorkOrderCreateForm.astro`, replace the plain `<strong>Orden de trabajo</strong>` header with:

```astro
<header class="sg-wo-brand">
  <img src="/servigas-logo.png" alt="Servigas" width="40" height="40" />
  <div>
    <strong>Orden de trabajo</strong>
    <p>Completá como en el papel. La serie identifica el artefacto y arma el historial.</p>
  </div>
</header>
```

Add CSS (scoped):

```css
.sg-wo-brand {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  margin-bottom: 0.75rem;
}
.sg-wo-brand img {
  width: 40px;
  height: 40px;
  object-fit: contain;
  flex-shrink: 0;
}
.sg-wo-brand strong {
  display: block;
  font-size: 1.05rem;
}
.sg-wo-brand p {
  margin: 0.2rem 0 0;
  color: var(--sg-text-muted-dark, #c5d0dc);
  font-size: 0.88rem;
}
```

Remove the duplicate standalone `<strong>` / `<p>` that the header replaces.

- [ ] **Step 4: Brand OT detail**

In `orders/[id].astro`, wrap or extend the secondary/header area so the ficha shows the logo. Prefer a small brand strip above `RecordDetailBody` or inside `slot="secondary"` top:

```astro
<div class="sg-wo-detail-brand">
  <img src="/servigas-logo.png" alt="Servigas" width="28" height="28" />
  <span>Servigas · Taller</span>
</div>
```

If `RecordDetailBody` always owns the eyebrow, place the brand strip as the first child in `slot="secondary"` (visible next to actions) **and** keep `eyebrow="Ficha de orden de trabajo"`.

Add minimal CSS either inline in the page `<style>` or reuse a class from the share control file — keep it local to the page:

```css
.sg-wo-detail-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  font-size: 0.82rem;
  font-weight: 650;
  color: var(--sg-text-muted-dark, #c5d0dc);
}
.sg-wo-detail-brand img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}
```

- [ ] **Step 5: Run tests — PASS**

```bash
cd web && node --test tests/shell-ui.test.mjs
```

- [ ] **Step 6: Commit**

```bash
git add web/src/components/WorkOrderCreateForm.astro \
  web/src/pages/lists/workshop/orders/[id].astro \
  web/tests/shell-ui.test.mjs
git commit -m "feat(taller): logo Servigas en alta y ficha OT."
```

---

### Task 6: Bitácora + verificación final

**Files:**
- Modify: `docs/proyecto/bitacora-cambios.md`

- [ ] **Step 1: Add bitácora entry** (top of file, after title), dated 2026-08-03:

```markdown
### 2026-08-03 — Taller: PDF / WhatsApp / mail de OT + logo

- PDF QWeb `servigas_core.report_sg_work_order` con logo Servigas
- Panel en ficha OT: Ver/Descargar PDF, WhatsApp, mail Odoo (template)
- Logo Servigas en formulario de alta y ficha digital
- Spec: `docs/superpowers/specs/2026-08-03-workshop-work-order-share-design.md`
```

- [ ] **Step 2: Full test suite**

```bash
cd web && npm test
```

Expected: all green (including new workshop-order-share tests).

- [ ] **Step 3: Manual smoke** (with stack up, module upgraded)

1. Abrir OT draft → Ver PDF → logo + campos
2. WhatsApp con `owner_phone` o partner phone → abre chat
3. Mail con partner email → envía
4. Alta OT → logo visible en el form

- [ ] **Step 4: Commit**

```bash
git add docs/proyecto/bitacora-cambios.md
git commit -m "docs(taller): bitácora PDF/WhatsApp/mail OT."
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| PDF Odoo con logo | 2, 3, 4 |
| WhatsApp wa.me + tip adjuntar | 1, 3, 4 |
| Mail Odoo con adjunto | 2, 3, 4 |
| Draft + done | 3, 4 (no state gate) |
| Contact partner → owner_phone fallback | 1, 3 |
| Logo UI alta + ficha | 5 |
| Sin foto chapa / no clone papel | 2 (omitted) |
| Errors/hints/503 | 1, 3, 4 |
| Tests unit + shell-ui | 1, 3, 4, 5, 6 |

## Self-review notes

- XMLID report locked to `servigas_core.report_sg_work_order` (action) with QWeb template `report_sg_work_order_document` to avoid id clash.
- No `markedSent` path for OT (unlike quotations).
- Logo UI uses `/servigas-logo.png` (web public); PDF uses module static `servigas_logo.png`.
