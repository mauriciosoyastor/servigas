# Category Products Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Desde Categorías, abrir `/lists/inventory/products?categ_id={id}` con dominio exacto `categ_id`, banner y preservación del filtro en búsqueda/paginación.

**Architecture:** Allowlist del query `categ_id` solo en `inventory/products`. Extender `RecordListQuery` + `buildSearchDomain`. Cablear página SSR, API lists, toolbar, CTA en ficha y celda `product_count` en `RecordTable`.

**Tech Stack:** Astro SSR BFF, Odoo JSON-RPC, node:test

## Global Constraints

- Filtro exacto `["categ_id","=",id]` (no `child_of`)
- Solo lista `inventory/products` acepta el param
- Param inválido → ignorar (sin 400)
- Spec: `docs/superpowers/specs/2026-08-03-category-products-filter-design.md`

---

### Task 1: Dominio allowlist `categId`

**Files:**
- Modify: `web/src/lib/shell/record-lists.ts` (`RecordListQuery`, `buildSearchDomain`, helper parse)
- Test: `web/tests/record-lists.test.mjs`

**Interfaces:**
- Produces: `parsePositiveIntParam(raw: string | null | undefined): number | undefined`
- Produces: `buildSearchDomain(def, q, now?, opts?: { categId?: number })` incluye clause si `def.key === "inventory/products"` y `categId > 0`
- Produces: `RecordListQuery.categId?: number`

- [ ] **Step 1: Write failing tests** for valid/invalid/other-list/`q` combo
- [ ] **Step 2: Run** `node --experimental-strip-types --import ./scripts/test-env.mjs --test tests/record-lists.test.mjs` — expect FAIL
- [ ] **Step 3: Implement** parse + domain clause
- [ ] **Step 4: Tests PASS**
- [ ] **Step 5: Commit** `feat(lists): allowlist categ_id en dominio de productos`

---

### Task 2: Cablear BFF list + API + página SSR

**Files:**
- Modify: `web/src/lib/bff/odoo-adapter.ts` (`getRecordList` pasa `query.categId`)
- Modify: `web/src/pages/api/lists/[...slug].ts`
- Modify: `web/src/pages/lists/[...slug].astro` (parse param, banner, category name)
- Modify: `web/src/components/ListToolbar.astro` (preserve `categId`)
- Test: `web/tests/shell-ui.test.mjs` (toolbar preserva `categ_id`; slug lee param)

**Interfaces:**
- Consumes: `parsePositiveIntParam`, `RecordListQuery.categId`
- Produces: banner HTML when filtered; toolbar hidden `categ_id`

- [ ] **Step 1: Failing shell-ui assertions**
- [ ] **Step 2: Wire adapter + API + page + toolbar + banner**
- [ ] **Step 3: Tests PASS**
- [ ] **Step 4: Commit** `feat(lists): filtrar productos por categ_id en SSR/API`

---

### Task 3: CTA ficha + conteo clickeable

**Files:**
- Modify: `web/src/pages/lists/inventory/categories/[id].astro`
- Modify: `web/src/components/RecordTable.astro`
- Test: `web/tests/shell-ui.test.mjs`

**Interfaces:**
- CTA: `/lists/inventory/products?categ_id={id}` con count vía `countProductsInCategory`
- `product_count` cell → same URL when `column.key === "product_count"`

- [ ] **Step 1: Failing UI source tests**
- [ ] **Step 2: Implement CTA + RecordTable exception**
- [ ] **Step 3: Tests PASS + `npm test` + `npm run build`**
- [ ] **Step 4: Commit** `feat(categories): link a productos filtrados por categoría`

---

## Spec coverage

| Criterio | Task |
|----------|------|
| Ver productos desde ficha | 3 |
| Dominio exacto + q | 1–2 |
| Preservar filtro / quitar | 2 |
| Conteo clickeable | 3 |
| Param inválido | 1 |
| Tests dominio | 1 |
