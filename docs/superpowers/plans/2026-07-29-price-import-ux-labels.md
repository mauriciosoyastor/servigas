# Price import UX labels — Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Mostrar estados/motivos del preview de import CSV en español, con alerta de errores y botón `Confirmar e importar (N)`.

**Architecture:** Helpers puros `labelImportStatus` / `labelImportReason` en `price-list-import.ts`; la página `import.astro` los consume en el render del preview. Codes de API sin cambios.

**Tech Stack:** Astro SSR page script, Node test runner, TypeScript strip-types.

## Global Constraints

- No cambiar contrato `/api/inventory/price-list-import` ni `MatchResult.reason` codes.
- No permitir crear sin precio de venta / sin nombre.
- Copy en español de trabajo (mostrador).

---

### Task 1: Glosario + tests unitarios

**Files:**
- Modify: `web/src/lib/shell/price-list-import.ts`
- Test: `web/tests/price-list-import.test.mjs`

**Produces:** `labelImportStatus(status: string): string`, `labelImportReason(reason: string): string`

- [ ] Write failing tests for status/reason labels + fallback
- [ ] Implement label helpers
- [ ] Run `node --test` on price-list-import tests → green

### Task 2: UI preview

**Files:**
- Modify: `web/src/pages/lists/inventory/products/import.astro`
- Optionally: `web/tests/shell-ui.test.mjs` (assert data attrs / Spanish copy)

**Consumes:** label helpers from Task 1

- [ ] Chips de conteo + `data-import-error-banner` si error > 0
- [ ] Tabla usa labels
- [ ] Botón `data-apply` texto con N; disabled si N=0; sync on checkbox change
- [ ] `npm test` + smoke visual o e2e `price-list-import` si stack up

### Task 3: Verify + commit (si el usuario pide)

- [ ] Trust gauntlet: unit + e2e import si aplica
- [ ] Commit solo si se pide
