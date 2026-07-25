# Accounting moves + CUIT checksum — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development. Trust-gauntlet for verification.

**Goal:** P0.1 lista «Todos los asientos» + P0.2 checksum CUIT (opción C).

**Architecture:** Allowlist Astro + helpers puros `cuit.ts` / `invoice-dest.ts`; mirror checksum en `res.partner` Odoo.

**Tech stack:** Astro BFF (`web/`), node:test, Odoo 19 `servigas_core`.

## Contrato (trust-gauntlet)

| # | Criterio | Seam |
|---|----------|------|
| 1 | Label/domain «Todos los asientos» → `/lists/accounting/moves` | `resolveRecordListPath` |
| 2 | Lista `accounting/moves` existe (posted, con `move_type`) | `getRecordListDef` |
| 3 | CUIT válido/inválido (checksum) | `isValidCuit` / `normalizeCuit` |
| 4 | Destino CUIT + inválido → error bloqueante | `invoiceDestVatError`, `publishInvoiceDestError` |
| 5 | Destino CF + inválido → warning, no error | `invoiceDestVatWarning` / `needsCuitWarning` |

## Tasks

### Task 1: CUIT helpers (TDD)

- RED: `web/tests/cuit.test.mjs`
- GREEN: `web/src/lib/shell/cuit.ts`
- Valid example: `20123456786` / `20-12345678-6`

### Task 2: invoice-dest enganche (TDD)

- Update `web/tests/invoice-dest.test.mjs`, `invoice-creates.test.mjs`, `record-writes.test.mjs`
- GREEN: `invoice-dest.ts` (+ POS warning si aplica)

### Task 3: moves list + routing (TDD)

- RED: `record-lists.test.mjs` cases
- GREEN: `record-lists.ts` (key, def, LABEL, ROUTE, ambiguous)

### Task 4: Odoo constraint

- `res_partner.py` checksum si destino `cuit`
- Bump `__manifest__.py` version

### Task 5: Gates

- `npm test` en `web/`
- Review si >100 líneas / persistence
