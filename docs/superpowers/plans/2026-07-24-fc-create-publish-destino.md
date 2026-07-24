# FC create + publicar con destino (fase 2a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Alta manual de FC multi-línea en Astro, badge CF/CUIT desde partner, y Publicar (`action_post`) con validación fiscal.

**Architecture:** `invoice-creates.ts` (allowlist) + `#createCustomerInvoice` en odoo-adapter; `record-actions` → `action_post`; enrich lista/detalle con `sg_invoice_dest` del partner; UI new + RecordConfirmControl.

**Tech Stack:** Astro BFF, Odoo `account.move`, node:test

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-24-fc-create-publish-destino-design.md`
- Destino solo lectura desde partner; sin AFIP; sin 2b
- Mensajes publicar CUIT exactos de la spec
- Create = draft; Publicar exige vat+street+city si destino cuit

---

### Task 1: Helpers + allowlists

- Create `web/src/lib/shell/invoice-creates.ts`
- Extend `invoice-dest.ts` (`publishInvoiceDestError`)
- Wire `canCreateRecord`, `record-actions` (customer-invoices + drafts)
- Tests

### Task 2: Adapter create/post + enrich partner dest

- `#createCustomerInvoice` (`move_type`, `invoice_line_ids`)
- `confirmRecord` pre-check fiscal for account.move out_invoice
- Enrich list/detail rows with partner `sg_invoice_dest`
- Update `record-lists` columns/fields for FC lists

### Task 3: UI + tests + docs

- `customer-invoices/new.astro`, detail Publicar, drafts Publicar if out_invoice
- List CTA label; OrderCreateForm badge in partner label
- `npm test`; bitácora; push PR
