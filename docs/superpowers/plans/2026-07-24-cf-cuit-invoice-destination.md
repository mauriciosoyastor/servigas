# Destino fiscal CF vs CUIT (fase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clasificar clientes como Consumidor final (CF) o Con CUIT, validar CUIT al guardar, y mostrar badge en lista/ficha/POS sin bloquear el cobro.

**Architecture:** Campo `sg_invoice_dest` en `res.partner` (`servigas_core`) + allowlist/validación BFF en Astro + selector en forms de cliente + badge en POS. Default `cf`. Cobro POS nunca se bloquea.

**Tech Stack:** Odoo 19 (`servigas_core`), Astro BFF (`web/`), node:test

## Global Constraints

- Copy ES-AR; mensajes exactos de la spec
- Sin AFIP / sin crear FC / sin bloquear POS
- Proveedores fuera de fase 1 (solo clientes)
- Campo `sg_invoice_dest` con valores `cf` | `cuit`
- Mensaje bloqueo: `Este cliente es Con CUIT: cargá el CUIT para guardar.`
- Aviso POS: `Falta CUIT; completá la ficha antes de facturar.`
- Spec: `docs/superpowers/specs/2026-07-24-cf-cuit-invoice-destination-design.md`

---

### Task 1: Helper + validación BFF + allowlists

**Files:**
- Create: `web/src/lib/shell/invoice-dest.ts`
- Modify: `web/src/lib/shell/record-writes.ts`
- Modify: `web/src/lib/shell/record-lists.ts` (customers fields/columns)
- Modify: `web/src/lib/bff/odoo-adapter.ts` (validate on create/update; label CF/CUIT in cells/detail)
- Test: `web/tests/record-writes.test.mjs`
- Test: `web/tests/invoice-dest.test.mjs`

- [x] **Step 1: Write failing tests** for allowlist + CUIT sin vat rechazado + CF sin vat ok
- [x] **Step 2: Implement helper + wire allowlists/validation**
- [x] **Step 3: Run `cd web && npm test` — green for new cases**
- [x] **Step 4: Commit**

### Task 2: Odoo `res.partner` field + constraint

**Files:**
- Create: `custom_addons/servigas_core/models/res_partner.py`
- Modify: `custom_addons/servigas_core/models/__init__.py`
- Modify: `custom_addons/servigas_core/__manifest__.py` → version `19.0.1.20.34`

- [x] **Step 1: Add model inherit with Selection + constrains**
- [x] **Step 2: Bump manifest version**
- [x] **Step 3: Commit**

### Task 3: UI create/edit + lista + POS

**Files:**
- Modify: `web/src/components/RecordCreateForm.astro` (support `select` + options)
- Modify: `web/src/components/RecordDetailBody.astro` (select edit + label read for dest)
- Modify: `web/src/pages/lists/sales/customers/new.astro`
- Modify: `web/src/pages/lists/sales/customers/[id].astro`
- Modify: `web/src/pages/pos.astro` (badge + aviso no bloqueante)
- Test: `web/tests/shell-ui.test.mjs`

- [x] **Step 1: Extend forms + customer pages**
- [x] **Step 2: POS badge/warning**
- [x] **Step 3: shell-ui asserts + `npm test`**
- [x] **Step 4: Commit; update spec estado approved; push; update PR**
