# Layout PDF Servigas unificado — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar el membrete Servigas (logo + borde naranja + pie) en los PDFs de OT, pedidos/cotizaciones, OC/RFQ y facturas/NC/bills, sin cambiar XMLIDs ni endpoints BFF.

**Architecture:** Nuevo QWeb `servigas_core.report_servigas_layout` que cumple el contrato de `web.external_layout` (slots `address` / `information_block` / `layout_document_title` + `t-out="0"`). OT migra a ese layout. Sale, purchase e invoice heredan y cambian `t-call="web.external_layout"` → layout Servigas. Marca vía AbstractModel + helpers PNG→data-URI existentes.

**Tech Stack:** Odoo 19 QWeb PDF (`servigas_core`), helpers Python puros, unittest de assets, smoke manual PDF vía BFF/Odoo. Sin cambios de contrato en Astro.

**Spec:** `docs/superpowers/specs/2026-08-05-servigas-pdf-layout-design.md`

## Global Constraints

- Alcance: OT + SO/cotización + OC/RFQ + facturas/NC/bills/drafts.
- Profundidad: membrete + retoque tipográfico; sin campos nuevos ni reescritura de líneas/impuestos.
- Layout compartido; OT deja de pintar header/pie propios.
- No heredar/cambiar `web.external_layout` global.
- BFF XMLIDs fijos: `servigas_core.report_sg_work_order`, `sale.report_saleorder`, `purchase.report_purchaseorder`, `account.report_invoice_with_payments`.
- Marca: `servigas_mark_print.png` data-URI; si falta → PDF sin logo.
- Pie v1: “Servigas” (mínimo).
- Encoding UTF-8 wkhtmltopdf ya forzado en `ir_actions_report.py` — no tocar salvo regresión.

---

## File map

| File | Responsibility |
|------|----------------|
| `custom_addons/servigas_core/models/sg_work_order_report_assets.py` | Helpers puros PNG→data-URI (sin cambios de API) |
| `custom_addons/servigas_core/models/report_servigas_brand.py` | AbstractModel `report.servigas.brand` → `get_mark_src()` |
| `custom_addons/servigas_core/models/__init__.py` | Import del AbstractModel |
| `custom_addons/servigas_core/models/sg_work_order.py` | `get_report_brand_mark_src` delega al AbstractModel (compat) |
| `custom_addons/servigas_core/report/sg_servigas_layout.xml` | Layout QWeb compartido |
| `custom_addons/servigas_core/report/sg_work_order_report.xml` | OT usa layout compartido |
| `custom_addons/servigas_core/report/sg_report_document_inherits.xml` | Inherit SO / PO / PO quotation / invoice |
| `custom_addons/servigas_core/__manifest__.py` | Data files + bump versión |
| `custom_addons/servigas_core/tests/test_sg_work_order_report_assets.py` | Tests helpers (siguen verdes) |
| `docs/proyecto/bitacora-cambios.md` | Entrada de cambio |

**Referencia Odoo 19 (solo lectura, no editar):**

- `odoo-workspace/odoo-19/addons/sale/report/ir_actions_report_templates.xml` → `sale.report_saleorder_document`
- `odoo-workspace/odoo-19/addons/purchase/report/purchase_order_templates.xml` → `purchase.report_purchaseorder_document`
- `odoo-workspace/odoo-19/addons/purchase/report/purchase_quotation_templates.xml` → `purchase.report_purchasequotation_document`
- `odoo-workspace/odoo-19/addons/account/views/report_invoice.xml` → `account.report_invoice_document` (usado por `report_invoice_with_payments`)
- `odoo-workspace/odoo-19/addons/web/views/report_templates.xml` → `web.external_layout` / `web.address_layout` / `external_layout_standard`

---

### Task 1: AbstractModel marca Servigas

**Files:**
- Create: `custom_addons/servigas_core/models/report_servigas_brand.py`
- Modify: `custom_addons/servigas_core/models/__init__.py`
- Modify: `custom_addons/servigas_core/models/sg_work_order.py` (delegación)
- Test: `custom_addons/servigas_core/tests/test_sg_work_order_report_assets.py` (sin cambios de asserts; re-run)

**Interfaces:**
- Consumes: `mark_data_uri_or_empty`, `MARK_PRINT_RELATIVE` from `sg_work_order_report_assets`
- Produces:
  - Model `report.servigas.brand`
  - `@api.model def get_mark_src(self) -> str` — data-URI o `""`
  - `SgWorkOrder.get_report_brand_mark_src()` sigue existiendo y delega a `env["report.servigas.brand"].get_mark_src()`

- [ ] **Step 1: Re-run existing helper tests (baseline green)**

```bash
cd custom_addons/servigas_core
python -m unittest tests.test_sg_work_order_report_assets -v
```

Expected: PASS (todos los tests actuales).

- [ ] **Step 2: Create AbstractModel**

Create `custom_addons/servigas_core/models/report_servigas_brand.py`:

```python
from odoo import api, models
from odoo.tools import file_open

from . import sg_work_order_report_assets as report_assets


class ReportServigasBrand(models.AbstractModel):
    _name = "report.servigas.brand"
    _description = "Servigas PDF brand helpers"

    @api.model
    def get_mark_src(self):
        """Data-URI del símbolo Servigas para QWeb PDF (sin HTTP static)."""
        try:
            with file_open(report_assets.MARK_PRINT_RELATIVE, "rb") as handle:
                raw = handle.read()
        except (FileNotFoundError, OSError, ValueError):
            return ""
        return report_assets.mark_data_uri_or_empty(raw)
```

- [ ] **Step 3: Register import**

In `custom_addons/servigas_core/models/__init__.py`, add after existing imports:

```python
from . import report_servigas_brand
```

- [ ] **Step 4: Delegate OT method**

Replace `get_report_brand_mark_src` body in `sg_work_order.py` so it no longer opens the file itself:

```python
def get_report_brand_mark_src(self):
    """Data-URI del símbolo Servigas para el PDF (no depende de HTTP static)."""
    self.ensure_one()
    return self.env["report.servigas.brand"].get_mark_src()
```

Remove unused `file_open` / `report_assets` imports from `sg_work_order.py` **only if** nothing else in that file uses them. Keep `report_assets` import removed; keep `file_open` only if still used elsewhere in the file.

- [ ] **Step 5: Re-run helper tests**

```bash
cd custom_addons/servigas_core
python -m unittest tests.test_sg_work_order_report_assets -v
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add custom_addons/servigas_core/models/report_servigas_brand.py \
  custom_addons/servigas_core/models/__init__.py \
  custom_addons/servigas_core/models/sg_work_order.py
git commit -m "feat(reports): AbstractModel report.servigas.brand para marca PDF."
```

---

### Task 2: Layout QWeb compartido

**Files:**
- Create: `custom_addons/servigas_core/report/sg_servigas_layout.xml`
- Modify: `custom_addons/servigas_core/__manifest__.py` (data entry + version bump)

**Interfaces:**
- Consumes: `env['report.servigas.brand'].get_mark_src()`, `web.address_layout`, variables Odoo `address` / `information_block` / `layout_document_title` / `o`/`doc` / `company`
- Produces: QWeb xmlid `servigas_core.report_servigas_layout` callable vía `t-call`

- [ ] **Step 1: Create layout template**

Create `custom_addons/servigas_core/report/sg_servigas_layout.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<odoo>
  <!--
    Drop-in replacement for web.external_layout on Servigas customer-facing PDFs.
    Honors address / information_block / layout_document_title like external_layout_standard,
    but brands with Servigas mark instead of company.external_report_layout.
  -->
  <template id="report_servigas_layout">
    <t t-if="not o" t-set="o" t-value="doc"/>
    <t t-if="not company">
      <t t-if="company_id">
        <t t-set="company" t-value="company_id"/>
      </t>
      <t t-elif="o and 'company_id' in o and o.company_id.sudo()">
        <t t-set="company" t-value="o.company_id.sudo()"/>
      </t>
      <t t-else="">
        <t t-set="company" t-value="res_company"/>
      </t>
    </t>

    <div class="page sg-report"
         style="font-family: DejaVu Sans, sans-serif; color: #1a1a1a;">
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>

      <div style="display:flex; align-items:center; gap:16px; margin-bottom:16px; border-bottom:2px solid #c45c26; padding-bottom:12px;">
        <t t-set="sg_mark" t-value="env['report.servigas.brand'].get_mark_src()"/>
        <img t-if="sg_mark"
             t-att-src="sg_mark"
             style="height:56px; width:auto;"
             alt="Servigas"/>
        <div style="flex:1;">
          <div style="font-size:18px; font-weight:700; line-height:1.3;"
               t-out="layout_document_title"/>
        </div>
      </div>

      <t t-call="web.address_layout"/>

      <div class="sg-report-body" style="font-size:12px;">
        <t t-out="0"/>
      </div>

      <div style="margin-top:28px; font-size:11px; color:#888; border-top:1px solid #ddd; padding-top:8px;">
        Servigas
      </div>
    </div>
  </template>
</odoo>
```

- [ ] **Step 2: Register in manifest (before OT report)**

In `__manifest__.py` `data` list, insert **before** `"report/sg_work_order_report.xml"`:

```python
"report/sg_servigas_layout.xml",
```

Bump `"version"` patch (e.g. current → next patch: if `19.0.1.20.63` then `19.0.1.20.64`).

- [ ] **Step 3: Commit**

```bash
git add custom_addons/servigas_core/report/sg_servigas_layout.xml \
  custom_addons/servigas_core/__manifest__.py
git commit -m "feat(reports): layout QWeb Servigas compartido para PDFs."
```

---

### Task 3: Migrar OT al layout compartido

**Files:**
- Modify: `custom_addons/servigas_core/report/sg_work_order_report.xml`

**Interfaces:**
- Consumes: `servigas_core.report_servigas_layout`
- Produces: mismo `ir.actions.report` `servigas_core.report_sg_work_order` (XMLID sin cambio)

- [ ] **Step 1: Rewrite OT document template**

Replace the body of `report_sg_work_order_document` so it calls the shared layout. Keep the same fields (Cliente / Artefacto / Detalle / Importe). Set `layout_document_title` and drop the old inline header/footer.

Full template (keep the existing `<record id="report_sg_work_order" ...>` unchanged):

```xml
  <template id="report_sg_work_order_document">
    <t t-call="web.html_container">
      <t t-foreach="docs" t-as="o">
        <t t-set="layout_document_title">
          <span>Orden de trabajo</span>
          <span> · </span>
          <span t-esc="o.name"/>
          <span> · </span>
          <span t-esc="dict(o._fields['state'].selection).get(o.state)"/>
          <span> · </span>
          <span t-field="o.date"/>
        </t>
        <t t-call="servigas_core.report_servigas_layout">
          <h3 style="font-size:14px; margin:16px 0 8px;">Cliente</h3>
          <table style="width:100%; font-size:12px; border-collapse:collapse;">
            <tr>
              <td style="padding:4px 8px 4px 0; width:30%; color:#666;">Propietario</td>
              <td style="padding:4px 0;"><span t-esc="o.owner_name or '-'"/></td>
            </tr>
            <tr>
              <td style="padding:4px 8px 4px 0; color:#666;">Celular</td>
              <td style="padding:4px 0;"><span t-esc="o.owner_phone or '-'"/></td>
            </tr>
            <tr>
              <td style="padding:4px 8px 4px 0; color:#666;">Cliente</td>
              <td style="padding:4px 0;"><span t-esc="o.partner_id.display_name if o.partner_id else '-'"/></td>
            </tr>
          </table>

          <h3 style="font-size:14px; margin:16px 0 8px;">Artefacto</h3>
          <table style="width:100%; font-size:12px; border-collapse:collapse;">
            <tr>
              <td style="padding:4px 8px 4px 0; width:30%; color:#666;">N&#186; de serie</td>
              <td style="padding:4px 0;"><span t-esc="o.serial_number or '-'"/></td>
            </tr>
            <tr>
              <td style="padding:4px 8px 4px 0; color:#666;">Marca / modelo</td>
              <td style="padding:4px 0;">
                <span t-esc="o.brand or ''"/>
                <t t-if="o.model"> / <span t-esc="o.model"/></t>
              </td>
            </tr>
            <tr>
              <td style="padding:4px 8px 4px 0; color:#666;">Descripci&#243;n</td>
              <td style="padding:4px 0;"><span t-esc="o.appliance_id.name or '-'"/></td>
            </tr>
            <tr>
              <td style="padding:4px 8px 4px 0; color:#666;">Gas</td>
              <td style="padding:4px 0;">
                <span t-esc="dict(o.appliance_id._fields['gas_type'].selection).get(o.appliance_id.gas_type) if o.appliance_id.gas_type else '-'"/>
              </td>
            </tr>
          </table>

          <h3 style="font-size:14px; margin:16px 0 8px;">Detalle</h3>
          <div style="font-size:12px; margin-bottom:10px;">
            <div style="color:#666; margin-bottom:2px;">Problema</div>
            <div style="white-space:pre-wrap;" t-esc="o.problem or '-'"/>
          </div>
          <div style="font-size:12px; margin-bottom:10px;">
            <div style="color:#666; margin-bottom:2px;">Observaci&#243;n</div>
            <div style="white-space:pre-wrap;" t-esc="o.observation or '-'"/>
          </div>
          <div style="font-size:12px; margin-bottom:10px;">
            <div style="color:#666; margin-bottom:2px;">Trabajos realizados</div>
            <div style="white-space:pre-wrap;" t-esc="o.work_done or '-'"/>
          </div>
          <div style="font-size:12px; margin-bottom:10px;">
            <div style="color:#666; margin-bottom:2px;">Materiales</div>
            <div style="white-space:pre-wrap;" t-esc="o.materials or '-'"/>
          </div>
          <t t-if="o.amount">
            <div style="font-size:13px; margin-top:12px;">
              <strong>Importe:</strong>
              <span t-esc="'%.2f' % (o.amount,)"/>
            </div>
          </t>
        </t>
      </t>
    </t>
  </template>
```

- [ ] **Step 2: Commit**

```bash
git add custom_addons/servigas_core/report/sg_work_order_report.xml
git commit -m "refactor(reports): OT PDF usa layout Servigas compartido."
```

---

### Task 4: Inherit sale / purchase / invoice documents

**Files:**
- Create: `custom_addons/servigas_core/report/sg_report_document_inherits.xml`
- Modify: `custom_addons/servigas_core/__manifest__.py` (add data file after layout)

**Interfaces:**
- Consumes: `servigas_core.report_servigas_layout`
- Produces: inherits that swap `web.external_layout` → Servigas on:
  - `sale.report_saleorder_document`
  - `purchase.report_purchaseorder_document`
  - `purchase.report_purchasequotation_document`
  - `account.report_invoice_document`

- [ ] **Step 1: Create inherits XML**

Create `custom_addons/servigas_core/report/sg_report_document_inherits.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<odoo>
  <!-- Swap Odoo company layout for Servigas brand on shell-facing PDFs. -->

  <template id="report_saleorder_document_servigas"
            inherit_id="sale.report_saleorder_document">
    <xpath expr="//t[@t-call='web.external_layout']" position="attributes">
      <attribute name="t-call">servigas_core.report_servigas_layout</attribute>
    </xpath>
    <xpath expr="//div[contains(@class,'page')]" position="attributes">
      <attribute name="style">font-family: DejaVu Sans, sans-serif; color: #1a1a1a; font-size: 12px;</attribute>
    </xpath>
  </template>

  <template id="report_purchaseorder_document_servigas"
            inherit_id="purchase.report_purchaseorder_document">
    <xpath expr="//t[@t-call='web.external_layout']" position="attributes">
      <attribute name="t-call">servigas_core.report_servigas_layout</attribute>
    </xpath>
    <xpath expr="//div[contains(@class,'page')]" position="attributes">
      <attribute name="style">font-family: DejaVu Sans, sans-serif; color: #1a1a1a; font-size: 12px;</attribute>
    </xpath>
  </template>

  <template id="report_purchasequotation_document_servigas"
            inherit_id="purchase.report_purchasequotation_document">
    <xpath expr="//t[@t-call='web.external_layout']" position="attributes">
      <attribute name="t-call">servigas_core.report_servigas_layout</attribute>
    </xpath>
    <xpath expr="//div[contains(@class,'page')]" position="attributes">
      <attribute name="style">font-family: DejaVu Sans, sans-serif; color: #1a1a1a; font-size: 12px;</attribute>
    </xpath>
  </template>

  <template id="report_invoice_document_servigas"
            inherit_id="account.report_invoice_document">
    <xpath expr="//t[@t-call='web.external_layout']" position="attributes">
      <attribute name="t-call">servigas_core.report_servigas_layout</attribute>
    </xpath>
    <xpath expr="//div[contains(@class,'page')]" position="attributes">
      <attribute name="style">font-family: DejaVu Sans, sans-serif; color: #1a1a1a; font-size: 12px;</attribute>
    </xpath>
  </template>
</odoo>
```

Note: `account.report_invoice_with_payments` wraps `account.report_invoice` → `report_invoice_document`; branding the document template covers the BFF XMLID without changing it.

- [ ] **Step 2: Register in manifest**

After `"report/sg_work_order_report.xml"`, add:

```python
"report/sg_report_document_inherits.xml",
```

Bump version patch again if Task 2 already bumped in a prior commit on the same branch without this file — otherwise one bump covering Tasks 2–4 is fine if implementing sequentially before upgrade.

- [ ] **Step 3: Commit**

```bash
git add custom_addons/servigas_core/report/sg_report_document_inherits.xml \
  custom_addons/servigas_core/__manifest__.py
git commit -m "feat(reports): SO/PO/factura PDFs usan layout Servigas."
```

---

### Task 5: Upgrade módulo + smoke PDF

**Files:**
- Modify: `docs/proyecto/bitacora-cambios.md` (entrada breve)
- No BFF code changes expected

**Interfaces:**
- Consumes: módulo actualizado en Odoo `servigas_dev`
- Produces: evidencia visual de PDFs branded

- [ ] **Step 1: Upgrade servigas_core**

From `web/` (stack Odoo en `:8070`):

```bash
npm run odoo:ensure
```

Then upgrade the module (use the project’s usual path — Apps → Update, or CLI `-u servigas_core` against `servigas_dev`). Confirm no XML/QWeb load errors in Odoo log.

- [ ] **Step 2: Smoke checklist (manual)**

For each, open Ver PDF in the shell (or `/report/pdf/<xmlid>/<id>`):

| Doc | Expect |
|-----|--------|
| OT | Header Servigas + título “Orden de trabajo…” + cuerpo OT + pie Servigas; sin bloque “My Company” |
| Pedido o cotización | Header Servigas + título Odoo (Quotation # / Order #) + líneas + pie; sin “My Company” |
| OC (ej. P00009) | Header Servigas + “Request for Quotation #…” / Purchase Order + pie |
| Factura | Header Servigas + título Invoice/… + pie |

Also confirm totals/taxes unchanged vs pre-change expectation for one known document.

- [ ] **Step 3: BFF regression (XMLIDs unchanged)**

```bash
cd web
node --test tests/sale-order-share.test.mjs tests/purchase-order-share.test.mjs tests/invoice-pdf.test.mjs tests/workshop-order-share.test.mjs
```

Expected: PASS (si algún archivo no existe, correr los que existan que asserten los XMLIDs de report).

- [ ] **Step 4: Bitácora**

Append a short entry to `docs/proyecto/bitacora-cambios.md` describing unified Servigas PDF layout for OT/SO/PO/invoice.

- [ ] **Step 5: Commit bitácora**

```bash
git add docs/proyecto/bitacora-cambios.md
git commit -m "docs: bitacora layout PDF Servigas unificado."
```

---

## Self-review (plan vs spec)

| Spec requirement | Task |
|------------------|------|
| Layout compartido OT+SO+PO+INV | Tasks 2–4 |
| No cambiar BFF XMLIDs | Task 5 regression; no BFF file edits |
| Marca data-URI + degrade sin logo | Task 1 |
| OT migra a layout | Task 3 |
| Inherit no global external_layout | Task 4 (document-level only) |
| Pie mínimo “Servigas” | Task 2 |
| Purchase quotation also branded | Task 4 (`report_purchasequotation_document`) |
| Invoice via with_payments chain | Task 4 brands `report_invoice_document` |
| Encoding UTF-8 | Global constraint; untouched |
| Fuera de alcance cobros/WhatsApp auto/pixel tests | Not in tasks |

**Risk note:** Nested `.page` div (layout + Odoo document body both use `page`) may double-wrap; if wkhtmltopdf page-breaks look wrong in smoke, remove `class="page"` from the layout root and keep only `sg-report` ( titling/header still outside Odoo’s inner page). Fix in Task 5 if observed — do not pre-optimize.
