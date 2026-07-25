# Número FW obligatorio al marcar (P1.5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exigir `sg_fw_number` al marcar FC como cargada en Factura Web (ficha y bulk), con un número distinto por factura en el bulk.

**Architecture:** Endurecer `filterMarkFwLoadedValues` (número requerido). Reemplazar el payload bulk `ids[]` + `values.fwNumber?` por `items: [{id, fwNumber}]`. El adapter escribe cada id markable con su propio número. UI: ficha sin “opcional”; `RecordTable` agrega input por fila cuando `rowSelect` + `fwNumberInput`; `FwBulkMarkBar` arma `items` y bloquea si falta algún número.

**Tech Stack:** Astro SSR BFF (`web/`), TypeScript, Node test runner, Odoo `account.move` fields `sg_fw_loaded` / `sg_fw_number`.

## Global Constraints

- Nº FW: texto trim, longitud 1–64 (sin regex AFIP).
- Bulk: máx. 100 ítems (`FW_BULK_MAX_IDS`).
- Solo listas `accounting/customer-invoices` y `accounting/factura-web-pending`.
- Markable: `out_invoice` + `posted` + `sg_fw_loaded` falso; no-markable → `skipped` (no 400).
- Payload bulk inválido / nº faltante → `validation_error` 400 de toda la request.
- Branch: crear `feat/fw-number-required` desde `origin/main` (o main actualizado post-merge #49 si aplica; P1.5 no depende de P1.2).
- Spec: `docs/superpowers/specs/2026-07-25-fw-number-required-design.md`.

## File map

| File | Responsibility |
|------|----------------|
| `web/src/lib/shell/fw-bridge.ts` | `filterMarkFwLoadedValues` required; `filterMarkFwBulkItems` |
| `web/src/lib/bff/backend-client.ts` | Firma `markFwLoadedBulk(..., items)` |
| `web/src/lib/bff/odoo-adapter.ts` | Write con nº; bulk per-id write |
| `web/src/pages/api/records/[...slug].ts` | Lee `body.items` |
| `web/src/components/RecordMarkFwLoadedControl.astro` | UI ficha required |
| `web/src/components/RecordTable.astro` | Columna input `data-fw-row-number` |
| `web/src/components/FwBulkMarkBar.astro` | Collect items + validate |
| `web/src/pages/lists/[...slug].astro` | `fwNumberInput={showFwBulk}` |
| Tests + bitácora + update nota en spec P0.4 | |

---

### Task 1: Helpers fw-bridge (número required + items bulk)

**Files:**
- Modify: `web/src/lib/shell/fw-bridge.ts`
- Modify: `web/tests/fw-bridge.test.mjs`
- Modify: `docs/superpowers/specs/2026-07-25-fw-bulk-mark-design.md` (nota: nº por fila ahora en P1.5)

**Interfaces:**
- Produces:
  - `filterMarkFwLoadedValues(listKey, values) → { fwNumber: string } | null` (siempre con `fwNumber` si ok)
  - `filterMarkFwBulkItems(raw) → { id: number; fwNumber: string }[] | null`
  - Keep `filterMarkFwBulkIds` for now unused by adapter, or leave as internal helper for id extraction tests

- [ ] **Step 1: Write the failing tests**

In `web/tests/fw-bridge.test.mjs`, replace the “optional fw number” test and add bulk items tests:

```js
it("requires fw number for mark", () => {
  assert.equal(
    filterMarkFwLoadedValues("accounting/customer-invoices", {}),
    null
  );
  assert.equal(
    filterMarkFwLoadedValues("accounting/customer-invoices", {
      fwNumber: "   ",
    }),
    null
  );
  assert.deepEqual(
    filterMarkFwLoadedValues("accounting/customer-invoices", {
      fwNumber: " 0001-99 ",
    }),
    { fwNumber: "0001-99" }
  );
  assert.equal(
    filterMarkFwLoadedValues("accounting/customer-invoices", {
      fwNumber: "x".repeat(65),
    }),
    null
  );
  assert.equal(
    filterMarkFwLoadedValues("accounting/drafts", { fwNumber: "1" }),
    null
  );
});

it("filters bulk mark items with per-row fw numbers", () => {
  assert.deepEqual(
    filterMarkFwBulkItems([
      { id: 1, fwNumber: " A " },
      { id: 2, fwNumber: "B" },
      { id: 1, fwNumber: "C" },
    ]),
    [
      { id: 1, fwNumber: "A" },
      { id: 2, fwNumber: "B" },
    ]
  );
  assert.equal(filterMarkFwBulkItems([]), null);
  assert.equal(filterMarkFwBulkItems([{ id: 1, fwNumber: "" }]), null);
  assert.equal(filterMarkFwBulkItems([{ id: 1 }]), null);
  assert.equal(filterMarkFwBulkItems(null), null);
  const tooMany = Array.from({ length: FW_BULK_MAX_IDS + 1 }, (_, i) => ({
    id: i + 1,
    fwNumber: String(i + 1),
  }));
  assert.equal(filterMarkFwBulkItems(tooMany), null);
});
```

Import `filterMarkFwBulkItems` from `fw-bridge.ts`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/fw-bridge.test.mjs`  
Working directory: `web/`  
Expected: FAIL (optional still returns `{}`; `filterMarkFwBulkItems` missing).

- [ ] **Step 3: Implement helpers**

In `fw-bridge.ts`:

```ts
export type MarkFwLoadedValues = {
  fwNumber: string;
};

export function filterMarkFwLoadedValues(
  listKey: string,
  values: Record<string, unknown>
): MarkFwLoadedValues | null {
  if (!canMarkFwLoaded(listKey)) return null;
  const raw = values.fwNumber ?? values.sg_fw_number;
  if (raw === undefined || raw === null) return null;
  const fwNumber = String(raw).trim();
  if (!fwNumber || fwNumber.length > 64) return null;
  return { fwNumber };
}

export type MarkFwBulkItem = {
  id: number;
  fwNumber: string;
};

/**
 * Normaliza items bulk. null = inválido / vacío / exceso / nº faltante.
 * Dedup by id (first wins).
 */
export function filterMarkFwBulkItems(raw: unknown): MarkFwBulkItem[] | null {
  if (!Array.isArray(raw)) return null;
  const seen = new Set<number>();
  const items: MarkFwBulkItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") return null;
    const id = Number((entry as { id?: unknown }).id);
    if (!Number.isFinite(id) || id <= 0 || !Number.isInteger(id)) return null;
    if (seen.has(id)) continue;
    const fwRaw =
      (entry as { fwNumber?: unknown }).fwNumber ??
      (entry as { sg_fw_number?: unknown }).sg_fw_number;
    if (fwRaw === undefined || fwRaw === null) return null;
    const fwNumber = String(fwRaw).trim();
    if (!fwNumber || fwNumber.length > 64) return null;
    seen.add(id);
    items.push({ id, fwNumber });
  }
  if (!items.length) return null;
  if (items.length > FW_BULK_MAX_IDS) return null;
  return items;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- tests/fw-bridge.test.mjs`  
Expected: PASS for new cases (other suites may still fail until Task 2–3).

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/shell/fw-bridge.ts web/tests/fw-bridge.test.mjs docs/superpowers/specs/2026-07-25-fw-bulk-mark-design.md docs/superpowers/specs/2026-07-25-fw-number-required-design.md
git commit -m "feat(accounting): exigir número FW en helpers de marcado"
```

---

### Task 2: Adapter + API + BackendClient

**Files:**
- Modify: `web/src/lib/bff/backend-client.ts`
- Modify: `web/src/lib/bff/odoo-adapter.ts` (`markFwLoaded`, `markFwLoadedBulk`)
- Modify: `web/src/pages/api/records/[...slug].ts`
- Modify: `web/tests/odoo-adapter.test.mjs`
- Modify: `web/tests/api-routes.test.mjs`

**Interfaces:**
- Consumes: `filterMarkFwLoadedValues`, `filterMarkFwBulkItems`
- Produces:
  - `markFwLoadedBulk(session, listKey, items: unknown)` — no `ids`/`values` globals
  - Single mark always writes `sg_fw_number`

- [ ] **Step 1: Write failing adapter/API tests**

Update bulk test to pass items with numbers; assert write happens **per markable id** with matching `sg_fw_number` (two write calls for ids 1 and 5, or inspect args):

```js
const result = await adapter.markFwLoadedBulk(
  "sess",
  "accounting/factura-web-pending",
  [
    { id: 1, fwNumber: "0001-1" },
    { id: 2, fwNumber: "0001-2" },
    { id: 3, fwNumber: "0001-3" },
    { id: 4, fwNumber: "0001-4" },
    { id: 5, fwNumber: "0001-5" },
  ]
);
assert.equal(result.marked, 2);
assert.deepEqual(result.markedIds, [1, 5]);
const writes = fetchImpl.mock.calls
  .map((call) => JSON.parse(call.arguments[1].body))
  .filter((body) => body.params?.method === "write");
assert.equal(writes.length, 2);
assert.equal(writes[0].params.args[0][0], 1);
assert.equal(writes[0].params.args[1].sg_fw_number, "0001-1");
assert.equal(writes[1].params.args[0][0], 5);
assert.equal(writes[1].params.args[1].sg_fw_number, "0001-5");
```

Add test: `markFwLoaded` without `fwNumber` → throws validation_error.

Add test: `markFwLoadedBulk` with empty/missing numbers → throws.

Update API route test “marks FC bulk…” to send `items` and assert backend receives them (no `ids`).

- [ ] **Step 2: Run tests — expect FAIL**

Run: `npm test -- tests/odoo-adapter.test.mjs tests/api-routes.test.mjs`  
Expected: FAIL on signature / required number.

- [ ] **Step 3: Implement adapter + API**

`backend-client.ts`:

```ts
markFwLoadedBulk(
  odooSessionId: string,
  listKey: string,
  items: unknown
): Promise<{
  ok: true;
  marked: number;
  skipped: number;
  markedIds: number[];
}>;
```

`markFwLoaded`: after filter, always set `writeVals.sg_fw_number = filtered.fwNumber` (no `if`).

`markFwLoadedBulk`:

```ts
async markFwLoadedBulk(
  odooSessionId: string,
  listKey: string,
  items: unknown
): Promise<{ ok: true; marked: number; skipped: number; markedIds: number[] }> {
  if (!canMarkFwLoadedBulk(listKey)) {
    throw new BffError("not_found", 404, "Marcado Factura Web no permitido");
  }
  const filteredItems = filterMarkFwBulkItems(items);
  if (!filteredItems) {
    throw new BffError(
      "validation_error",
      400,
      "Seleccioná entre 1 y 100 facturas con N° Factura Web"
    );
  }
  const ids = filteredItems.map((i) => i.id);
  const numberById = new Map(filteredItems.map((i) => [i.id, i.fwNumber]));
  // read moves for ids (same as today)
  // for each markable id: write { sg_fw_loaded, sg_fw_loaded_at, sg_fw_number: numberById.get(id) }
  // return marked/skipped/markedIds
}
```

API:

```ts
const result = await getBackend().markFwLoadedBulk(
  odooSessionId,
  slug,
  body.items
);
```

Import `filterMarkFwBulkItems` in adapter; stop passing `values` into bulk.

- [ ] **Step 4: Run tests — expect PASS**

Run: `npm test -- tests/odoo-adapter.test.mjs tests/api-routes.test.mjs tests/fw-bridge.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/bff/backend-client.ts web/src/lib/bff/odoo-adapter.ts web/src/pages/api/records/[...slug].ts web/tests/odoo-adapter.test.mjs web/tests/api-routes.test.mjs
git commit -m "feat(accounting): bulk FW con número por factura en BFF"
```

---

### Task 3: UI ficha + tabla + bulk bar

**Files:**
- Modify: `web/src/components/RecordMarkFwLoadedControl.astro`
- Modify: `web/src/components/RecordTable.astro`
- Modify: `web/src/components/FwBulkMarkBar.astro`
- Modify: `web/src/pages/lists/[...slug].astro`
- Modify: `web/tests/shell-ui.test.mjs`
- Modify: `docs/proyecto/bitacora-cambios.md`

**Interfaces:**
- Consumes: API `items` shape from Task 2
- Produces: wired UI contracts in shell-ui tests

- [ ] **Step 1: Write failing UI contract tests**

In `shell-ui.test.mjs` (Factura Web wiring test), add:

```js
assert.match(markFw, /N° Factura Web/);
assert.doesNotMatch(markFw, /opcional/i);
assert.match(recordTable, /data-fw-row-number/);
assert.match(bulkBar, /items/);
assert.match(bulkBar, /fwNumber/);
assert.match(listPage, /fwNumberInput/);
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm test -- tests/shell-ui.test.mjs`  
Expected: FAIL on new asserts.

- [ ] **Step 3: Implement UI**

**RecordMarkFwLoadedControl.astro:**
- Label: `N° Factura Web` (sin “opcional”).
- Before confirm: if `!fwNumber` → set status error `"Ingresá el N° de Factura Web"` and return.
- Always send `values: { fwNumber }`.

**RecordTable.astro:**
- Prop `fwNumberInput?: boolean` (default false).
- When `rowSelect && fwNumberInput`: add column header `N° Factura Web` and per-row:

```html
<input
  class="sg-focus-ring"
  type="text"
  data-fw-row-number
  data-record-id={String(recordId)}
  placeholder="0001-…"
  autocomplete="off"
  aria-label={`N° Factura Web registro ${recordId}`}
/>
```

Style input compact (reuse fw input look from mark control).

**lists/[...slug].astro:**

```astro
<RecordTable
  ...
  rowSelect={showFwBulk}
  fwNumberInput={showFwBulk}
/>
```

**FwBulkMarkBar.astro:**
- Collect selected checkboxes; for each id read  
  `tr[data-row-id="${id}"] [data-fw-row-number]` value.
- If any selected missing trim → status error, no fetch.
- Body:

```js
{
  action: "mark_fw_loaded_bulk",
  items: ids.map((id) => ({ id, fwNumber: numberById.get(id) })),
}
```

- Confirm copy: mention que cada una lleva su N°.

**Bitácora:** entrada 2026-07-25 P1.5.

- [ ] **Step 4: Full gates**

Run from `web/`:

```bash
npm test
npm run build
```

Expected: all tests pass; build OK.

- [ ] **Step 5: Commit + PR**

```bash
git add web/src/components/RecordMarkFwLoadedControl.astro web/src/components/RecordTable.astro web/src/components/FwBulkMarkBar.astro web/src/pages/lists/[...slug].astro web/tests/shell-ui.test.mjs docs/proyecto/bitacora-cambios.md
git commit -m "feat(accounting): UI número FW obligatorio en ficha y bulk"
git push -u origin HEAD
gh pr create --title "feat(accounting): número FW obligatorio al marcar (P1.5)" --body "..."
```

---

## Spec coverage checklist

| Criterio spec | Task |
|---------------|------|
| Ficha sin nº → no marca | 1 + 2 + 3 |
| Ficha con nº → persist | 2 + 3 |
| Bulk fila sin nº → error | 1 + 3 |
| Bulk 2 FC nº distintos | 2 |
| Tests helpers/adapter/UI | 1–3 |
| Breaking API `items` | 2 |

## Placeholder / consistency self-review

- No TBD.
- `MarkFwLoadedValues.fwNumber` required string everywhere after Task 1.
- Bulk signature is `items` only (not `ids` + `values`).
