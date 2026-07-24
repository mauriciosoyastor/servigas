# Ficha mostrador inline edit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar la ficha Astro en un panel con Editar arriba a la derecha (inputs inline) y Notas en columna derecha (desktop) / abajo (mobile).

**Architecture:** Extender `RecordDetailBody` con props de edición + slots `notes` y `secondary`. Toggle client-side lectura↔edición. Migrar páginas que hoy apilan `RecordEditForm`/`RecordNotes` debajo.

**Tech Stack:** Astro, CSS en `list.css`, fetch BFF existente `/api/records/...`.

## Global Constraints

- No sacar campos editables; incorporarlos al panel.
- Notas: derecha desktop, abajo mobile (~900px).
- Archivar/Confirmar fuera del toggle Editar.
- Sin nuevos endpoints BFF.

---

### Task 1: RecordDetailBody + CSS layout

**Files:**
- Modify: `web/src/components/RecordDetailBody.astro`
- Modify: `web/src/styles/list.css`
- Modify: `web/tests/shell-ui.test.mjs`

- [x] Panel + toolbar Editar + form inline + slots
- [x] CSS `.sg-ficha-layout` / `.sg-detail-body` / toolbar
- [x] Tests contrato actualizados

### Task 2: Migrar páginas edit+notas y notas-only

**Files:**
- `web/src/pages/lists/inventory/products/[id].astro`
- `web/src/pages/lists/sales/customers/[id].astro`
- `web/src/pages/lists/purchase/vendors/[id].astro`
- `web/src/pages/lists/sales/orders/[id].astro`
- `web/src/pages/lists/sales/quotations/[id].astro`
- `web/src/pages/lists/purchase/orders/[id].astro`

- [x] Pasar `editFields`/`editApiPath` y slots notes/secondary
- [x] Quitar `RecordEditForm` suelto
- [x] Tests verdes
