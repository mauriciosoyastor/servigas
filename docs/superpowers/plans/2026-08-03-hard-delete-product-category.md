# Hard Delete Product + Category Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Botón Eliminar (hard `unlink`) por fila en Productos; botón Eliminar categoría completa (hard-purge productos → unlink categoría).

**Architecture:** `canHardDelete` allowlist; `hardPurgeIds` puro; records API delete para productos; `delete-category` en purge-by-category API; columna delete en RecordTable + host JS; CTA en ficha categoría.

**Tech Stack:** Astro SSR BFF, Odoo JSON-RPC, node:test

## Global Constraints

- Hard delete only (no archive fallback on product row / category path)
- Category delete aborts if any product unlink fails
- Spec: `docs/superpowers/specs/2026-08-03-hard-delete-product-category-design.md`

---

### Task 1: `canHardDelete` + `hardPurgeIds`

**Files:**
- Modify: `web/src/lib/shell/record-writes.ts` (or small helper) — `canHardDelete`
- Modify: `web/src/lib/shell/product-purge.ts` — `hardPurgeIds`
- Modify: adapter + records API to use `canHardDelete`
- Test: `web/tests/record-writes.test.mjs`, `web/tests/product-purge.test.mjs`

- [ ] Tests RED → implement → GREEN → commit

### Task 2: `deleteCategoryHard` adapter + API

**Files:**
- Modify: `odoo-adapter.ts`, `backend-client.ts`, `purge-by-category.ts`
- Test: `odoo-adapter.test.mjs`

- [ ] Tests RED → implement → GREEN → commit

### Task 3: UI lista productos + ficha categoría

**Files:**
- Modify: `RecordTable.astro`, `[...slug].astro`, `CategoryProductPurgeControl.astro` or new control, `categories/[id].astro`
- Test: `shell-ui.test.mjs`
- Gates: `npm test`, `npm run build`

- [ ] Tests RED → implement → GREEN → commit
