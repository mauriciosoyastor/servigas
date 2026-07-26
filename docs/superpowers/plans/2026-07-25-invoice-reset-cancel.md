# Volver a borrador / Anular FC·FP·NC (P1.1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En fichas Astro de FC/NC/FP/NC proveedor publicadas y sin cobros, permitir volver a borrador (`button_draft`) o anular (`button_cancel`) vía BFF allowlisted.

**Architecture:** Nuevo módulo `invoice-lifecycle.ts` (allowlist + guards). Adapter llama métodos Odoo fijos y, tras reset, limpia flags Factura Web. API con acciones `reset_invoice_draft` / `cancel_invoice`. UI reusa `RecordConfirmControl` con prop `action` (default `confirm`).

**Tech Stack:** Astro SSR BFF (`web/`), TypeScript, Node test runner, Odoo `account.move` (`button_draft`, `button_cancel`, `payment_state`, `sg_fw_*`).

## Global Constraints

- Listas: `accounting/customer-invoices`, `credit-notes`, `vendor-bills`, `vendor-refunds`.
- Reset: Odoo `button_draft`; Cancel: Odoo `button_cancel`.
- Guard: solo `state === posted` y `payment_state === not_paid`; otro → 400.
- Tras reset exitoso: limpiar `sg_fw_loaded`, `sg_fw_number`, `sg_fw_loaded_at` (false).
- Sin bulk; sin ficha `drafts`; sin deshacer cobros aquí.
- Branch: `feat/invoice-reset-cancel` desde `origin/main`.
- Spec: `docs/superpowers/specs/2026-07-25-invoice-reset-cancel-design.md`.

## File map

| File | Responsibility |
|------|----------------|
| `web/src/lib/shell/invoice-lifecycle.ts` | Allowlist + `can*` + `isInvoiceLifecycleReady` |
| `web/tests/invoice-lifecycle.test.mjs` | Unit tests helpers |
| `web/src/lib/bff/backend-client.ts` | `resetInvoiceDraft` / `cancelInvoice` |
| `web/src/lib/bff/odoo-adapter.ts` | Implementación Odoo |
| `web/src/pages/api/records/[...slug].ts` | Rutas acciones |
| `web/src/components/RecordConfirmControl.astro` | Prop `action` |
| 4× `[id].astro` fichas | Botones + `showResetCancel` |
| Tests adapter / api / shell-ui + bitácora | |

---

### Task 1: Helpers `invoice-lifecycle`

**Files:**
- Create: `web/src/lib/shell/invoice-lifecycle.ts`
- Create: `web/tests/invoice-lifecycle.test.mjs`
- Include in commit: spec `docs/superpowers/specs/2026-07-25-invoice-reset-cancel-design.md` + this plan

**Interfaces:**
- Produces:
  - `canResetInvoiceDraft(listKey: string): boolean`
  - `canCancelInvoice(listKey: string): boolean` (same allowlist)
  - `isInvoiceLifecycleReady(state, paymentState): boolean` → true iff `posted` + `not_paid`
  - `getInvoiceLifecycleMoveType(listKey): string | null` (expected `move_type`)

- [ ] **Step 1: Write failing tests**

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canCancelInvoice,
  canResetInvoiceDraft,
  getInvoiceLifecycleMoveType,
  isInvoiceLifecycleReady,
} from "../src/lib/shell/invoice-lifecycle.ts";

describe("invoice-lifecycle", () => {
  it("allowlists FC NC FP vendor NC for reset and cancel", () => {
    for (const key of [
      "accounting/customer-invoices",
      "accounting/credit-notes",
      "accounting/vendor-bills",
      "accounting/vendor-refunds",
    ]) {
      assert.equal(canResetInvoiceDraft(key), true);
      assert.equal(canCancelInvoice(key), true);
    }
    assert.equal(canResetInvoiceDraft("accounting/drafts"), false);
    assert.equal(canCancelInvoice("sales/quotations"), false);
  });

  it("maps list keys to move_type", () => {
    assert.equal(
      getInvoiceLifecycleMoveType("accounting/customer-invoices"),
      "out_invoice"
    );
    assert.equal(
      getInvoiceLifecycleMoveType("accounting/credit-notes"),
      "out_refund"
    );
    assert.equal(
      getInvoiceLifecycleMoveType("accounting/vendor-bills"),
      "in_invoice"
    );
    assert.equal(
      getInvoiceLifecycleMoveType("accounting/vendor-refunds"),
      "in_refund"
    );
    assert.equal(getInvoiceLifecycleMoveType("accounting/drafts"), null);
  });

  it("gates lifecycle on posted + not_paid", () => {
    assert.equal(isInvoiceLifecycleReady("posted", "not_paid"), true);
    assert.equal(isInvoiceLifecycleReady("posted", "paid"), false);
    assert.equal(isInvoiceLifecycleReady("posted", "partial"), false);
    assert.equal(isInvoiceLifecycleReady("posted", "in_payment"), false);
    assert.equal(isInvoiceLifecycleReady("draft", "not_paid"), false);
    assert.equal(isInvoiceLifecycleReady("cancel", "not_paid"), false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `npm test -- tests/invoice-lifecycle.test.mjs`  
Cwd: `web/`  
Expected: FAIL (module missing).

- [ ] **Step 3: Implement**

```ts
/**
 * Reset / cancel posted invoices (P1.1).
 * Spec: 2026-07-25-invoice-reset-cancel-design.md
 */

import { resolveRecordListKey } from "./record-lists.ts";

const LIFECYCLE_KEYS = new Map<string, string>([
  ["accounting/customer-invoices", "out_invoice"],
  ["accounting/credit-notes", "out_refund"],
  ["accounting/vendor-bills", "in_invoice"],
  ["accounting/vendor-refunds", "in_refund"],
]);

function canonical(listKey: string): string {
  return resolveRecordListKey(listKey) || listKey;
}

export function canResetInvoiceDraft(listKey: string): boolean {
  return LIFECYCLE_KEYS.has(canonical(listKey));
}

export function canCancelInvoice(listKey: string): boolean {
  return canResetInvoiceDraft(listKey);
}

export function getInvoiceLifecycleMoveType(listKey: string): string | null {
  return LIFECYCLE_KEYS.get(canonical(listKey)) ?? null;
}

export function isInvoiceLifecycleReady(
  state: string | null | undefined,
  paymentState: string | null | undefined
): boolean {
  return (
    String(state || "") === "posted" &&
    String(paymentState || "") === "not_paid"
  );
}
```

- [ ] **Step 4: Run — expect PASS**

Run: `npm test -- tests/invoice-lifecycle.test.mjs`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/shell/invoice-lifecycle.ts web/tests/invoice-lifecycle.test.mjs docs/superpowers/specs/2026-07-25-invoice-reset-cancel-design.md docs/superpowers/plans/2026-07-25-invoice-reset-cancel.md
git commit -m "feat(accounting): helpers allowlist reset/cancel de comprobantes"
```

---

### Task 2: Adapter + API + BackendClient

**Files:**
- Modify: `web/src/lib/bff/backend-client.ts`
- Modify: `web/src/lib/bff/odoo-adapter.ts`
- Modify: `web/src/pages/api/records/[...slug].ts`
- Modify: `web/tests/odoo-adapter.test.mjs`
- Modify: `web/tests/api-routes.test.mjs`

**Interfaces:**
- Consumes: helpers from Task 1
- Produces:
  - `resetInvoiceDraft(session, listKey, id) → { ok: true; state: string | null }`
  - `cancelInvoice(session, listKey, id) → { ok: true; state: string | null }`

- [ ] **Step 1: Write failing tests**

In `odoo-adapter.test.mjs`:

```js
describe("OdooAdapter.resetInvoiceDraft / cancelInvoice", () => {
  it("resets posted unpaid FC to draft and clears FW flags", async () => {
    const fetchImpl = mock.fn(async (_url, init) => {
      const body = init?.body ? JSON.parse(init.body) : {};
      const method = body.params?.method;
      if (method === "read") {
        const fields = body.params?.args?.[1] || [];
        if (fields.includes("payment_state")) {
          return Response.json({
            result: [
              {
                id: 55,
                state: "posted",
                move_type: "out_invoice",
                payment_state: "not_paid",
                sg_fw_loaded: true,
              },
            ],
          });
        }
        return Response.json({ result: [{ id: 55, state: "draft" }] });
      }
      return Response.json({ result: true });
    });
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });
    const result = await adapter.resetInvoiceDraft(
      "sess",
      "accounting/customer-invoices",
      55
    );
    assert.equal(result.ok, true);
    assert.equal(result.state, "draft");
    const methods = fetchImpl.mock.calls.map(
      (c) => JSON.parse(c.arguments[1].body).params.method
    );
    assert.ok(methods.includes("button_draft"));
    const writeBody = fetchImpl.mock.calls
      .map((c) => JSON.parse(c.arguments[1].body))
      .find((b) => b.params?.method === "write");
    assert.equal(writeBody.params.args[1].sg_fw_loaded, false);
    assert.equal(writeBody.params.args[1].sg_fw_number, false);
  });

  it("rejects reset when payment_state is paid", async () => {
    const fetchImpl = mock.fn(async () =>
      Response.json({
        result: [
          {
            id: 55,
            state: "posted",
            move_type: "out_invoice",
            payment_state: "paid",
            sg_fw_loaded: false,
          },
        ],
      })
    );
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });
    await assert.rejects(
      () =>
        adapter.resetInvoiceDraft("sess", "accounting/customer-invoices", 55),
      (err) => err?.code === "validation_error"
    );
  });

  it("cancels posted unpaid vendor bill", async () => {
    const fetchImpl = mock.fn(async (_url, init) => {
      const body = init?.body ? JSON.parse(init.body) : {};
      const method = body.params?.method;
      if (method === "read") {
        const fields = body.params?.args?.[1] || [];
        if (fields.includes("payment_state")) {
          return Response.json({
            result: [
              {
                id: 9,
                state: "posted",
                move_type: "in_invoice",
                payment_state: "not_paid",
              },
            ],
          });
        }
        return Response.json({ result: [{ id: 9, state: "cancel" }] });
      }
      return Response.json({ result: true });
    });
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });
    const result = await adapter.cancelInvoice(
      "sess",
      "accounting/vendor-bills",
      9
    );
    assert.equal(result.state, "cancel");
    const methods = fetchImpl.mock.calls.map(
      (c) => JSON.parse(c.arguments[1].body).params.method
    );
    assert.ok(methods.includes("button_cancel"));
  });
});
```

In `api-routes.test.mjs`, add tests that mock `resetInvoiceDraft` / `cancelInvoice` and POST `{ action, id }`.

- [ ] **Step 2: Run — expect FAIL**

Run: `npm test -- tests/odoo-adapter.test.mjs tests/api-routes.test.mjs`  
Expected: FAIL (methods missing).

- [ ] **Step 3: Implement**

`backend-client.ts`:

```ts
resetInvoiceDraft(
  odooSessionId: string,
  listKey: string,
  id: number
): Promise<{ ok: true; state: string | null }>;
cancelInvoice(
  odooSessionId: string,
  listKey: string,
  id: number
): Promise<{ ok: true; state: string | null }>;
```

Shared private helper pattern in adapter (inline twice is OK if short):

```ts
async resetInvoiceDraft(odooSessionId, listKey, id) {
  if (!canResetInvoiceDraft(listKey)) {
    throw new BffError("not_found", 404, "Reset no permitido");
  }
  // validate id
  const expectedType = getInvoiceLifecycleMoveType(listKey);
  const [move] = await this.#callKw(..., "read", [[id], [
    "state", "move_type", "payment_state", "sg_fw_loaded", "name"
  ]]);
  if (!move) throw new BffError("not_found", 404, "Comprobante no encontrado");
  if (String(move.move_type || "") !== expectedType) {
    throw new BffError("validation_error", 400, "Tipo de comprobante no coincide");
  }
  if (!isInvoiceLifecycleReady(move.state, move.payment_state)) {
    throw new BffError(
      "validation_error",
      400,
      "Solo se puede volver a borrador si está publicado y sin cobros/pagos"
    );
  }
  await this.#callKw(odooSessionId, "account.move", "button_draft", [[id]]);
  if (move.sg_fw_loaded) {
    await this.#callKw(odooSessionId, "account.move", "write", [
      [id],
      { sg_fw_loaded: false, sg_fw_number: false, sg_fw_loaded_at: false },
    ]);
  }
  const [after] = await this.#callKw(..., "read", [[id], ["state"]]);
  return { ok: true, state: after?.state == null ? null : String(after.state) };
}

async cancelInvoice(...) {
  // same guards; method button_cancel; no FW clear required (cancelled);
  // message: "Solo se puede anular si está publicado y sin cobros/pagos"
}
```

API (`[...slug].ts`): extend action union; allowlist check; call backend.

Also: always clear FW on reset even if `sg_fw_loaded` is false-y? Spec says “si había FW”. Conditional write is enough; test covers loaded=true path. If false, skip write (YAGNI).

- [ ] **Step 4: Run full suite — expect PASS**

Run: `npm test` in `web/`  
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/bff/backend-client.ts web/src/lib/bff/odoo-adapter.ts web/src/pages/api/records/[...slug].ts web/tests/odoo-adapter.test.mjs web/tests/api-routes.test.mjs
git commit -m "feat(accounting): BFF reset a borrador y anular comprobantes"
```

---

### Task 3: UI fichas + RecordConfirmControl action prop

**Files:**
- Modify: `web/src/components/RecordConfirmControl.astro`
- Modify: `web/src/pages/lists/accounting/customer-invoices/[id].astro`
- Modify: `web/src/pages/lists/accounting/credit-notes/[id].astro`
- Modify: `web/src/pages/lists/accounting/vendor-bills/[id].astro`
- Modify: `web/src/pages/lists/accounting/vendor-refunds/[id].astro`
- Modify: `web/tests/shell-ui.test.mjs`
- Modify: `docs/proyecto/bitacora-cambios.md`

**Interfaces:**
- Consumes: API actions from Task 2; `isInvoiceLifecycleReady` from Task 1
- Produces: wired UI contracts

- [ ] **Step 1: Failing UI tests**

In shell-ui (customer invoice wiring test or new it):

```js
assert.match(confirmCtrl, /action:\s*['"]confirm['"]|action\s*=/);
// After change, control must accept custom action:
assert.match(confirmCtrl, /formAction|data-action|action/);
const invoiceDetail = await source(
  "pages/lists/accounting/customer-invoices/[id].astro"
);
assert.match(invoiceDetail, /reset_invoice_draft/);
assert.match(invoiceDetail, /cancel_invoice/);
assert.match(invoiceDetail, /Volver a borrador/);
assert.match(invoiceDetail, /Anular/);
assert.match(invoiceDetail, /isInvoiceLifecycleReady/);
```

Prefer asserting the Astro props / script body clearly: `RecordConfirmControl` script uses `action` from `data-action` attribute.

- [ ] **Step 2: Run — expect FAIL**

Run: `npm test -- tests/shell-ui.test.mjs`

- [ ] **Step 3: Implement UI**

**RecordConfirmControl.astro** — add prop:

```ts
action?: string; // default 'confirm'
```

Pass `data-action={action}` on button; in fetch body:

```js
action: btn.dataset.action || 'confirm',
```

**Each ficha** (example FC):

```astro
import { isInvoiceLifecycleReady } from '../../../../lib/shell/invoice-lifecycle.ts';
const showResetCancel = isInvoiceLifecycleReady(state, paymentState);
```

```astro
{detail && !error && showResetCancel ? (
  <RecordConfirmControl
    listKey="accounting/customer-invoices"
    recordId={id}
    apiPath="/api/records/accounting/customer-invoices"
    action="reset_invoice_draft"
    label="Volver a borrador"
    confirmMessage="¿Volver este comprobante a borrador?"
    pendingLabel="Revirtiendo…"
    okLabel="En borrador"
  />
) : null}
{detail && !error && showResetCancel ? (
  <RecordConfirmControl
    listKey="accounting/customer-invoices"
    recordId={id}
    apiPath="/api/records/accounting/customer-invoices"
    action="cancel_invoice"
    label="Anular"
    confirmMessage="¿Anular este comprobante? Esta acción no se deshace desde aquí."
    pendingLabel="Anulando…"
    okLabel="Anulado"
  />
) : null}
```

Repeat for credit-notes, vendor-bills, vendor-refunds (correct `listKey` / `apiPath`).

Ensure `payment_state` is already on detail fields (it is for invoices via record-lists). If a ficha lacks `paymentState` extraction, mirror FC:

```ts
const paymentState = fieldValue('payment_state');
```

**Bitácora:** entrada 2026-07-25 P1.1.

- [ ] **Step 4: Gates**

```bash
npm test
npm run build
```

Expected: all pass; build OK.

- [ ] **Step 5: Commit + PR**

```bash
git add web/src/components/RecordConfirmControl.astro web/src/pages/lists/accounting/customer-invoices/[id].astro web/src/pages/lists/accounting/credit-notes/[id].astro web/src/pages/lists/accounting/vendor-bills/[id].astro web/src/pages/lists/accounting/vendor-refunds/[id].astro web/tests/shell-ui.test.mjs docs/proyecto/bitacora-cambios.md
git commit -m "feat(accounting): UI volver a borrador y anular en fichas"
git push -u origin HEAD
gh pr create --title "feat(accounting): volver a borrador / anular (P1.1)" --body "..."
```

---

## Spec coverage checklist

| Criterio | Task |
|----------|------|
| Reset unpaid → draft | 2 + 3 |
| Paid → 400 / no botones | 1 + 2 + 3 |
| Cancel unpaid → cancel | 2 + 3 |
| FC/NC/FP/NC prov | 1 + 3 |
| Clear FW on reset | 2 |
| Tests helpers/adapter/UI | 1–3 |

## Self-review

- No TBD.
- Actions names stable: `reset_invoice_draft`, `cancel_invoice`.
- `RecordConfirmControl` keeps default `confirm` for existing publish buttons.
