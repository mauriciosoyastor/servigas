# Listas Astro — tabla glass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar el look de todas las listas Astro en una isla glass densa en desktop y cards en móvil, sin tocar BFF ni flujos de datos.

**Architecture:** Cambios casi solo en `web/src/styles/list.css`, con markup mínimo en `RecordTable.astro` si hace falta para el modo card móvil. Contratos verificados con tests de fuente en `web/tests/shell-ui.test.mjs`.

**Tech Stack:** Astro 7, CSS tokens `--sg-*`, Node test runner (`npm test` en `web/`).

**Spec:** `docs/superpowers/specs/2026-07-23-astro-listas-tabla-glass-design.md`

## Global Constraints

- Desktop: densidad de tabla actual (padding ~0.45–0.7rem); prioridad velocidad de escaneo.
- Glass en **contenedor**, no por fila.
- Colores on-dark dentro de la tabla; sin “papel blanco” (`--sg-canvas` como fondo de wrap).
- Breakpoint móvil: `max-width: 767px` (equiv. &lt;768px).
- Sin cambios BFF / allowlist / columnas / paginación / detalle `[id]` / POS.
- Respetar `prefers-reduced-motion: reduce`.
- No inventar paleta: solo tokens de `web/src/styles/tokens.css`.

---

### Task 1: Contratos de test (lista glass)

COMPLETED — commit 589bf2b

---

### Task 2: Desktop — isla glass densa

COMPLETED — commit d222a6e

---

### Task 3: Móvil — reflow a cards

**Files:**
- Modify: `web/src/styles/list.css` (media `max-width: 767px`)
- Modify: `web/src/components/RecordTable.astro` — add `data-label={column.label}` on each `<td>`
- Test: `web/tests/shell-ui.test.mjs` (must go fully green)

**Interfaces:**
- Consumes: `column.label`, `column.key`, `data-col`, `data-kind` already emitted by `RecordTable`
- Produces: under 768px each `tr` reads as a card; column labels via `data-label`

- [ ] **Step 1: Add data-label on cells**

In `web/src/components/RecordTable.astro`, on each `<td>`:

```astro
<td data-col={column.key} data-kind={column.kind || 'text'} data-label={column.label}>
```

- [ ] **Step 2: CSS card reflow**

Add to `list.css` (do not break `.sg-detail`):

```css
@media (max-width: 767px) {
	.sg-record-table thead {
		display: none;
	}

	.sg-record-table,
	.sg-record-table tbody,
	.sg-record-table tr,
	.sg-record-table td {
		display: block;
		width: 100%;
	}

	.sg-record-table tbody tr {
		padding: 0.85rem 1rem;
		border-bottom: 1px solid var(--sg-glass-border);
	}

	.sg-record-table tbody tr:nth-child(even) {
		background: color-mix(in srgb, var(--sg-text-on-dark) 3%, transparent);
	}

	.sg-record-table td {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.35rem 0;
		border-bottom: none;
	}

	.sg-record-table td[data-kind="image"] {
		justify-content: flex-start;
		width: auto;
		padding: 0 0 0.5rem;
	}

	.sg-record-table td[data-kind="image"]::before {
		content: none;
	}

	.sg-record-table td:not([data-kind="image"])::before {
		content: attr(data-label);
		flex: 0 0 auto;
		color: var(--sg-text-muted-dark);
		font-size: 0.72rem;
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.sg-record-table td[data-col="name"] {
		font-size: 1rem;
		font-weight: 600;
		padding-top: 0.15rem;
	}

	.sg-list-toolbar {
		flex-direction: column;
		align-items: stretch;
	}

	.sg-list-pager {
		margin-left: 0;
		justify-content: space-between;
	}
}
```

- [ ] **Step 3: Assert markup contract for data-label**

Add to `web/tests/shell-ui.test.mjs`:

```js
  it("marks list cells with data-label for mobile cards", async () => {
    const table = await source("components/RecordTable.astro");
    assert.match(table, /data-label=\{column\.label\}/);
  });
```

- [ ] **Step 4: Run tests green**

Run from `web/`: `$env:NODE_ENV='test'; npm test`  
Expected: PASS completo, including glass panel mobile reflow + data-label test.

- [ ] **Step 5: Commit**

```bash
git add web/src/styles/list.css web/src/components/RecordTable.astro web/tests/shell-ui.test.mjs
git commit -m "feat(web): cards móviles para listas glass"
```

Stage ONLY those three files. Do not commit custom_addons.

---

### Task 4: Verificación visual manual + bitácora breve

**Files:**
- Modify: `docs/proyecto/bitacora-cambios.md`
- Ensure spec+plan exist under docs/superpowers/

- [ ] **Step 1: Manual checklist** (if Astro+Odoo up): productos glass desktop; DevTools &lt;768 cards; otra lista sin imagen.

- [ ] **Step 2: Bitácora entry**

```markdown
### 2026-07-23 — Listas Astro tabla glass
- Spec: `docs/superpowers/specs/2026-07-23-astro-listas-tabla-glass-design.md`
- Plan: `docs/superpowers/plans/2026-07-23-astro-listas-tabla-glass.md`
- Listas: isla glass desktop + cards &lt;768px; sin cambios BFF.
```

- [ ] **Step 3:** `$env:NODE_ENV='test'; npm test` in web/ — PASS

- [ ] **Step 4: Commit docs only**

```bash
git add docs/proyecto/bitacora-cambios.md docs/superpowers/specs/2026-07-23-astro-listas-tabla-glass-design.md docs/superpowers/plans/2026-07-23-astro-listas-tabla-glass.md
git commit -m "docs: spec y plan listas Astro tabla glass"
```
