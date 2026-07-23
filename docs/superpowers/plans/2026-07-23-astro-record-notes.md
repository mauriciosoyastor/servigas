# Bitácora de notas en fichas Astro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar una bitácora de notas internas (crear / listar / editar-borrar propias) en fichas Astro de clientes, proveedores, productos, cotizaciones, pedidos y OC, respaldada por `mail.message` vía BFF.

**Architecture:** Allowlist pura en `record-notes.ts` resuelve `listKey` → modelo Odoo. El adapter habla con `mail.message` / `message_post`. La ruta `/api/notes` no se mezcla con `/api/records`. UI: componente `RecordNotes.astro` al pie de cada ficha cableada.

**Tech Stack:** Astro 7 SSR, BFF Node, Odoo JSON-RPC (`call_kw`), Node test runner (`npm test` en `web/`).

**Spec:** `docs/superpowers/specs/2026-07-23-astro-record-notes-design.md`

## Global Constraints

- Notas solo internas (nunca portal/PDF).
- Autor edita/borra solo las suyas (`create_uid` === `session.uid`).
- Texto plano; HTML de Odoo se normaliza al leer/escribir.
- `body` trim, no vacío, máx. 4000 chars.
- Lista ordenada **más nuevas primero**.
- Modelos v1: `res.partner`, `product.template`, `sale.order`, `purchase.order`.
- Copy de error seguro; no filtrar JSON-RPC crudo al cliente.
- Tests con `node --test` / `npm test` desde `web/`.
- Commits chicos por task; no tocar POS ni listas salvo cableado de fichas.

## File map

| Archivo | Rol |
|---------|-----|
| `web/src/lib/shell/record-notes.ts` | Allowlist, validación body, strip/escape HTML, tipos helper |
| `web/src/lib/bff/types.ts` | Tipo `RecordNote` |
| `web/src/lib/bff/errors.ts` + `http.ts` | Código `forbidden` + passthrough de mensajes safe |
| `web/src/lib/bff/backend-client.ts` | Métodos notes en la interfaz |
| `web/src/lib/bff/odoo-adapter.ts` | list/create/update/delete contra Odoo |
| `web/src/pages/api/notes.ts` | GET/POST/PATCH/DELETE |
| `web/src/components/RecordNotes.astro` | UI bitácora |
| Fichas `[id].astro` listadas abajo | Montar `<RecordNotes />` |
| `web/tests/record-notes.test.mjs` | Allowlist + body |
| `web/tests/odoo-adapter.test.mjs` | Adapter notes |
| `web/tests/api-routes.test.mjs` | HTTP notes + forbidden |
| `web/tests/shell-ui.test.mjs` | Contratos UI / fichas |

---

### Task 1: Allowlist, body helpers y tipo `RecordNote`

**Files:**
- Create: `web/src/lib/shell/record-notes.ts`
- Modify: `web/src/lib/bff/types.ts`
- Test: `web/tests/record-notes.test.mjs`

**Interfaces:**
- Consumes: `getRecordListDef` from `web/src/lib/shell/record-lists.ts`
- Produces:
  - `NOTE_MODELS = ["res.partner", "product.template", "sale.order", "purchase.order"] as const`
  - `MAX_NOTE_BODY_LENGTH = 4000`
  - `resolveNoteTarget(listKey: string): { model: string } | null`
  - `normalizeNoteBody(raw: unknown): { ok: true; body: string } | { ok: false; error: string }`
  - `plainTextFromOdooHtml(html: string): string`
  - `odooHtmlFromPlainText(text: string): string`
  - `RecordNote` in types.ts:

```ts
export type RecordNote = {
  id: number;
  body: string;
  authorName: string;
  authorId: number;
  createdAt: string;
  canEdit: boolean;
};
```

- [ ] **Step 1: Write failing tests**

Create `web/tests/record-notes.test.mjs`:

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_NOTE_BODY_LENGTH,
  normalizeNoteBody,
  odooHtmlFromPlainText,
  plainTextFromOdooHtml,
  resolveNoteTarget,
} from "../src/lib/shell/record-notes.ts";

describe("record-notes allowlist", () => {
  it("resolves partner / product / sale / purchase listKeys", () => {
    assert.equal(resolveNoteTarget("sales/customers")?.model, "res.partner");
    assert.equal(resolveNoteTarget("purchase/vendors")?.model, "res.partner");
    assert.equal(resolveNoteTarget("inventory/products")?.model, "product.template");
    assert.equal(resolveNoteTarget("sales/orders")?.model, "sale.order");
    assert.equal(resolveNoteTarget("sales/quotations")?.model, "sale.order");
    assert.equal(resolveNoteTarget("purchase/orders")?.model, "purchase.order");
    assert.equal(resolveNoteTarget("purchase/solicitudes")?.model, "purchase.order");
  });

  it("rejects models outside v1 (e.g. variants, transfers)", () => {
    assert.equal(resolveNoteTarget("inventory/variants"), null);
    assert.equal(resolveNoteTarget("inventory/transfers"), null);
    assert.equal(resolveNoteTarget("nope"), null);
  });
});

describe("record-notes body", () => {
  it("trims and rejects empty / too long", () => {
    assert.deepEqual(normalizeNoteBody("  hola  "), { ok: true, body: "hola" });
    assert.equal(normalizeNoteBody("   ").ok, false);
    assert.equal(normalizeNoteBody("").ok, false);
    assert.equal(normalizeNoteBody("x".repeat(MAX_NOTE_BODY_LENGTH + 1)).ok, false);
  });

  it("round-trips plain text through html helpers", () => {
    const html = odooHtmlFromPlainText('a <b> & "x"');
    assert.match(html, /&lt;b&gt;/);
    assert.equal(plainTextFromOdooHtml("<p>hola<br/>mundo</p>"), "hola\nmundo");
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `cd web && node --experimental-strip-types --test tests/record-notes.test.mjs`

Expected: FAIL (module not found)

- [ ] **Step 3: Implement `record-notes.ts` + type**

`web/src/lib/shell/record-notes.ts`:

```ts
import { getRecordListDef } from "./record-lists.ts";

export const MAX_NOTE_BODY_LENGTH = 4000;

const NOTE_MODELS = new Set([
  "res.partner",
  "product.template",
  "sale.order",
  "purchase.order",
]);

export function resolveNoteTarget(
  listKey: string
): { model: string } | null {
  const list = getRecordListDef(listKey);
  if (!list || !NOTE_MODELS.has(list.model)) return null;
  return { model: list.model };
}

export function normalizeNoteBody(
  raw: unknown
): { ok: true; body: string } | { ok: false; error: string } {
  if (typeof raw !== "string") {
    return { ok: false, error: "Escribí una nota" };
  }
  const body = raw.trim();
  if (!body) return { ok: false, error: "Escribí una nota" };
  if (body.length > MAX_NOTE_BODY_LENGTH) {
    return { ok: false, error: "La nota es demasiado larga" };
  }
  return { ok: true, body };
}

export function plainTextFromOdooHtml(html: string): string {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\n+$/g, "")
    .trim();
}

export function odooHtmlFromPlainText(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const withBreaks = escaped.replace(/\n/g, "<br/>");
  return `<p>${withBreaks}</p>`;
}
```

Add `RecordNote` to `web/src/lib/bff/types.ts` (export junto a los otros payloads).

- [ ] **Step 4: Run tests — expect PASS**

Run: `cd web && node --experimental-strip-types --test tests/record-notes.test.mjs`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/shell/record-notes.ts web/src/lib/bff/types.ts web/tests/record-notes.test.mjs
git commit -m "feat(web): allowlist y helpers de notas de ficha"
```

---

### Task 2: Adapter — list / create / update / delete notes

**Files:**
- Modify: `web/src/lib/bff/backend-client.ts`
- Modify: `web/src/lib/bff/odoo-adapter.ts`
- Modify: `web/src/lib/bff/errors.ts` (add `forbidden` if not already from Task 3 — prefer add here so adapter can throw it)
- Test: `web/tests/odoo-adapter.test.mjs` (nuevo `describe`)

**Interfaces:**
- Consumes: `resolveNoteTarget`, `normalizeNoteBody`, `plainTextFromOdooHtml`, `odooHtmlFromPlainText`, `RecordNote`
- Produces on `BackendClient` / `OdooAdapter`:

```ts
listRecordNotes(
  odooSessionId: string,
  listKey: string,
  recordId: number,
  viewerUid: number
): Promise<RecordNote[]>;

createRecordNote(
  odooSessionId: string,
  listKey: string,
  recordId: number,
  body: string,
  viewerUid: number
): Promise<RecordNote>;

updateRecordNote(
  odooSessionId: string,
  noteId: number,
  body: string,
  viewerUid: number
): Promise<RecordNote>;

deleteRecordNote(
  odooSessionId: string,
  noteId: number,
  viewerUid: number
): Promise<void>;
```

Odoo mapping:
- List: `mail.message` `search_read` domain  
  `[["model","=",model],["res_id","=",recordId],["message_type","=","comment"]]`  
  fields: `["body","author_id","create_uid","date"]`, order `id desc`
- Create: `call_kw` on **record model** `message_post` args `[[recordId]]` kwargs  
  `{ body: odooHtmlFromPlainText(body), message_type: "comment", subtype_xmlid: "mail.mt_note" }`  
  then read the new message (return id from message_post) into `RecordNote`
- Update/Delete: `search_read`/`read` the message by id; if `create_uid[0] !== viewerUid` → `BffError("forbidden", 403, "Solo podés editar tus propias notas")`; else `write({body})` / `unlink`
- `authorId` = `create_uid[0]`; `authorName` = `author_id[1]` or `"Usuario"`; `createdAt` = ISO from `date` (append `Z` if naive); `canEdit` = `authorId === viewerUid`
- `createdAt`: if Odoo returns `"2026-07-23 12:00:00"`, emit `"2026-07-23T12:00:00.000Z"` (treat as UTC for v1)

- [ ] **Step 1: Add `forbidden` to errors**

In `web/src/lib/bff/errors.ts`:

```ts
export type BffErrorCode =
  | "unauthorized"
  | "bad_credentials"
  | "odoo_unavailable"
  | "not_found"
  | "validation_error"
  | "forbidden"
  | "checkout_failed"
  | "action_failed";
```

In `http.ts` `USER_ERROR_MESSAGES`:

```ts
forbidden: "Solo podés editar tus propias notas",
```

And passthrough for `validation_error` + `forbidden`:

```ts
const PASSTHROUGH_CODES: BffErrorCode[] = ["validation_error", "forbidden"];
// ...
message: PASSTHROUGH_CODES.includes(err.code) && err.message
  ? err.message
  : USER_ERROR_MESSAGES[err.code],
```

Update any existing `api-routes` / http test that assumed validation always uses the generic string **only if it breaks** — keep odoo_unavailable still scrubbed.

- [ ] **Step 2: Write failing adapter tests**

Append to `web/tests/odoo-adapter.test.mjs`:

```js
describe("OdooAdapter record notes", () => {
  it("lists comment messages newest first with canEdit", async () => {
    const fetchImpl = mock.fn(async () =>
      Response.json({
        result: [
          {
            id: 2,
            body: "<p>nueva</p>",
            author_id: [10, "Ana"],
            create_uid: [5, "Ana"],
            date: "2026-07-23 15:00:00",
          },
          {
            id: 1,
            body: "<p>vieja</p>",
            author_id: [11, "Bob"],
            create_uid: [6, "Bob"],
            date: "2026-07-22 10:00:00",
          },
        ],
      })
    );
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });
    const notes = await adapter.listRecordNotes(
      "sess",
      "sales/customers",
      9,
      5
    );
    assert.equal(notes.length, 2);
    assert.equal(notes[0].id, 2);
    assert.equal(notes[0].body, "nueva");
    assert.equal(notes[0].canEdit, true);
    assert.equal(notes[1].canEdit, false);
    const body = JSON.parse(fetchImpl.mock.calls[0].arguments[1].body);
    assert.equal(body.params.model, "mail.message");
    assert.equal(body.params.method, "search_read");
  });

  it("creates via message_post on the record model", async () => {
    const fetchImpl = mock.fn(async (_url, init) => {
      const body = JSON.parse(init.body);
      if (body.params.method === "message_post") {
        return Response.json({ result: 77 });
      }
      // read back
      return Response.json({
        result: [
          {
            id: 77,
            body: "<p>hola</p>",
            author_id: [10, "Ana"],
            create_uid: [5, "Ana"],
            date: "2026-07-23 16:00:00",
          },
        ],
      });
    });
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });
    const note = await adapter.createRecordNote(
      "sess",
      "inventory/products",
      3,
      "hola",
      5
    );
    assert.equal(note.id, 77);
    assert.equal(note.body, "hola");
    const postBody = JSON.parse(fetchImpl.mock.calls[0].arguments[1].body);
    assert.equal(postBody.params.model, "product.template");
    assert.equal(postBody.params.method, "message_post");
    assert.equal(postBody.params.kwargs.message_type, "comment");
    assert.equal(postBody.params.kwargs.subtype_xmlid, "mail.mt_note");
  });

  it("forbids update by non-author", async () => {
    const fetchImpl = mock.fn(async () =>
      Response.json({
        result: [
          {
            id: 77,
            body: "<p>x</p>",
            author_id: [11, "Bob"],
            create_uid: [6, "Bob"],
            date: "2026-07-23 16:00:00",
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
      () => adapter.updateRecordNote("sess", 77, "otro", 5),
      (error) => error?.code === "forbidden" && error?.status === 403
    );
  });

  it("rejects notes on non-allowlisted listKey", async () => {
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl: async () => Response.json({ result: [] }),
    });
    await assert.rejects(
      () => adapter.listRecordNotes("sess", "inventory/variants", 1, 5),
      (error) => error?.code === "not_found"
    );
  });
});
```

- [ ] **Step 3: Run adapter notes tests — expect FAIL**

Run: `cd web && node --experimental-strip-types --test tests/odoo-adapter.test.mjs`

Expected: FAIL (methods missing)

- [ ] **Step 4: Implement adapter methods + BackendClient**

Add the four methods to the interface and `OdooAdapter`. Shared private helper `#mapMailMessage(row, viewerUid): RecordNote`. Validate `recordId` with `Number.isFinite` / `> 0`. On create, after `normalizeNoteBody` failure throw `BffError("validation_error", 400, error)`.

Verify record exists before create (optional light `search_count` / `exists`) — if cheap, `search_read` model with `[["id","=",recordId]]` limit 1; if empty → `not_found`.

- [ ] **Step 5: Run tests — expect PASS**

Run: `cd web && node --experimental-strip-types --test tests/odoo-adapter.test.mjs tests/record-notes.test.mjs`

Expected: PASS (ajustar mocks si el orden de call_kw difiere)

- [ ] **Step 6: Commit**

```bash
git add web/src/lib/bff/backend-client.ts web/src/lib/bff/odoo-adapter.ts web/src/lib/bff/errors.ts web/src/lib/bff/http.ts web/tests/odoo-adapter.test.mjs web/tests/api-routes.test.mjs
git commit -m "feat(web): adapter BFF para notas mail.message"
```

---

### Task 3: API `/api/notes`

**Files:**
- Create: `web/src/pages/api/notes.ts`
- Test: `web/tests/api-routes.test.mjs`

**Interfaces:**
- Consumes: `getBackend()`, `requireOdooSession`, `bffErrorResponse`, `json`, adapter note methods, `normalizeNoteBody`
- Produces HTTP:

| Method | Input | Output |
|--------|-------|--------|
| GET | `?listKey=&recordId=` | `{ notes: RecordNote[] }` |
| POST | `{ listKey, recordId, body }` | `{ ok: true, note: RecordNote }` |
| PATCH | `{ id, body }` | `{ ok: true, note: RecordNote }` |
| DELETE | `{ id }` | `{ ok: true }` |

- [ ] **Step 1: Write failing API tests**

In `api-routes.test.mjs`, import handlers and use existing `FakeCookies` + `__setBackendForTests` pattern (copiar de tests de records). Cases mínimos:

1. GET sin cookie → 401  
2. GET listKey inválido → 404  
3. POST body vacío → 400 + message `Escribí una nota`  
4. PATCH nota ajena (fake backend throws forbidden) → 403 + message del spec  
5. POST feliz → `{ ok: true, note: { id: 1, ... } }`

- [ ] **Step 2: Run — expect FAIL**

Run: `cd web && node --experimental-strip-types --test tests/api-routes.test.mjs`

Expected: FAIL (ruta inexistente)

- [ ] **Step 3: Implement `web/src/pages/api/notes.ts`**

```ts
import type { APIRoute } from "astro";
import { BffError } from "../../lib/bff/errors.ts";
import { getBackend } from "../../lib/bff/get-backend.ts";
import {
  bffErrorResponse,
  json,
  requireOdooSession,
} from "../../lib/bff/http.ts";
import { normalizeNoteBody } from "../../lib/shell/record-notes.ts";

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const { odooSessionId, session } = requireOdooSession(cookies);
    const listKey = String(url.searchParams.get("listKey") || "");
    const recordId = Number(url.searchParams.get("recordId"));
    if (!listKey || !Number.isFinite(recordId) || recordId <= 0) {
      throw new BffError("validation_error", 400, "Revisá los datos e intentá de nuevo");
    }
    const notes = await getBackend().listRecordNotes(
      odooSessionId,
      listKey,
      recordId,
      session.uid
    );
    return json({ notes });
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};

export const POST: APIRoute = async ({ cookies, request }) => { /* parse JSON, normalizeNoteBody, createRecordNote */ };
export const PATCH: APIRoute = async ({ cookies, request }) => { /* id + body → updateRecordNote */ };
export const DELETE: APIRoute = async ({ cookies, request }) => { /* id → deleteRecordNote */ };
```

Implement POST/PATCH/DELETE completos (no dejar stubs): parse JSON seguro como en `records/[...slug].ts`; en POST usar `normalizeNoteBody`; pasar `session.uid`.

- [ ] **Step 4: Run API tests — expect PASS**

Run: `cd web && node --experimental-strip-types --test tests/api-routes.test.mjs`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/api/notes.ts web/tests/api-routes.test.mjs web/src/lib/bff/http.ts web/src/lib/bff/errors.ts
git commit -m "feat(web): API /api/notes para bitácora de fichas"
```

---

### Task 4: Componente `RecordNotes.astro` + estilos

**Files:**
- Create: `web/src/components/RecordNotes.astro`
- Modify: `web/src/styles/list.css` (bloque `.sg-record-notes*` al final, tokens existentes)
- Test: `web/tests/shell-ui.test.mjs`

**Interfaces:**
- Consumes: props `{ listKey: string; recordId: number }`
- Produces: markup `data-record-notes` + fetch a `/api/notes`

- [ ] **Step 1: Write failing UI contract tests**

Add to `shell-ui.test.mjs`:

```js
it("provides record notes bitácora component", async () => {
  const notes = await source("components/RecordNotes.astro");
  assert.match(notes, /data-record-notes/);
  assert.match(notes, /\/api\/notes/);
  assert.match(notes, /Agregar/);
  assert.match(notes, /Todavía no hay notas en esta ficha/);
  assert.match(notes, /canEdit/);
  assert.match(notes, /¿Borrar esta nota\?/);
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd web && node --experimental-strip-types --test tests/shell-ui.test.mjs`

Expected: FAIL (file missing)

- [ ] **Step 3: Implement component**

Props: `listKey`, `recordId`. Estructura:

1. `<section class="sg-record-notes sg-glass" data-record-notes data-list-key data-record-id>`
2. Título **Notas**
3. Form: `<textarea data-note-input>` + button **Agregar** + `<span data-note-status>`
4. `<ul data-note-list>` vacío al inicio; script carga GET al montar
5. Script (mismo estilo que `RecordEditForm.astro`):  
   - loadNotes()  
   - create on submit  
   - edit inline if `canEdit`  
   - delete with `confirm("¿Borrar esta nota?")`  
   - errores en `data-note-status` / por ítem  
   - no `location.reload` de toda la ficha: re-render lista en DOM

Escapar texto al pintar (`textContent`, no `innerHTML` con body crudo).

Estilos en `list.css`: gap, tipografía muted para meta (autor · fecha), botones texto, textarea full width — reutilizar `--sg-radius-card`, `--sg-text-muted-dark`, focus ring.

- [ ] **Step 4: Run shell-ui — expect PASS**

Run: `cd web && node --experimental-strip-types --test tests/shell-ui.test.mjs`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add web/src/components/RecordNotes.astro web/src/styles/list.css web/tests/shell-ui.test.mjs
git commit -m "feat(web): UI bitácora RecordNotes en fichas"
```

---

### Task 5: Cablear fichas v1

**Files:**
- Modify:
  - `web/src/pages/lists/sales/customers/[id].astro`
  - `web/src/pages/lists/purchase/vendors/[id].astro`
  - `web/src/pages/lists/inventory/products/[id].astro`
  - `web/src/pages/lists/sales/quotations/[id].astro`
  - `web/src/pages/lists/sales/orders/[id].astro`
  - `web/src/pages/lists/purchase/orders/[id].astro`
- If exists a dedicated solicitudes detail that is not orders: wire it too with `listKey` de esa ficha.
- Test: `web/tests/shell-ui.test.mjs`

**Interfaces:**
- Consumes: `RecordNotes` with the page’s `listKey` and numeric `id`
- Produces: section visible when `detail && !error`

- [ ] **Step 1: Failing contract — each ficha imports RecordNotes**

```js
it("wires RecordNotes into v1 detail pages", async () => {
  const pages = [
    "pages/lists/sales/customers/[id].astro",
    "pages/lists/purchase/vendors/[id].astro",
    "pages/lists/inventory/products/[id].astro",
    "pages/lists/sales/quotations/[id].astro",
    "pages/lists/sales/orders/[id].astro",
    "pages/lists/purchase/orders/[id].astro",
  ];
  for (const path of pages) {
    const src = await source(path);
    assert.match(src, /RecordNotes/, path);
    assert.match(src, /listKey=/, path);
  }
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Wire component**

En cada ficha, import y al final del contenido (después de edit/archive si existen):

```astro
import RecordNotes from '../../../../components/RecordNotes.astro';
// ...
{detail && !error ? (
  <RecordNotes listKey="sales/customers" recordId={id} />
) : null}
```

Usar el `listKey` correcto de cada página (`purchase/vendors`, `inventory/products`, `sales/quotations`, `sales/orders`, `purchase/orders`).

- [ ] **Step 4: Run shell-ui — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/lists/sales/customers/[id].astro \
  web/src/pages/lists/purchase/vendors/[id].astro \
  web/src/pages/lists/inventory/products/[id].astro \
  web/src/pages/lists/sales/quotations/[id].astro \
  web/src/pages/lists/sales/orders/[id].astro \
  web/src/pages/lists/purchase/orders/[id].astro \
  web/tests/shell-ui.test.mjs
git commit -m "feat(web): notas en fichas cliente proveedor producto pedidos"
```

---

### Task 6: Suite completa + smoke manual

**Files:** none new (verification)

- [ ] **Step 1: Run full test suite**

Run: `cd web && npm test`

Expected: all PASS

- [ ] **Step 2: Smoke manual (dev server)**

Con sesión real:

1. Abrir cliente → agregar nota → aparece arriba con tu nombre.  
2. Editar / borrar la propia.  
3. Con otro usuario (si hay): ve la nota sin botones Editar/Borrar.  
4. Producto + pedido venta + OC: mismo bloque.

Si `message_post` / subtype falla en la versión Odoo del stack, ajustar kwargs en adapter (mantener `message_type: "comment"`) y dejar nota en el commit.

- [ ] **Step 3: Mark spec status**

In `docs/superpowers/specs/2026-07-23-astro-record-notes-design.md`, set estado to `implemented` (or keep approved + note plan done) — only if smoke ok.

- [ ] **Step 4: Final commit if spec/status changed**

```bash
git add docs/superpowers/specs/2026-07-23-astro-record-notes-design.md
git commit -m "docs: marcar spec notas de ficha como implementado"
```

---

## Spec coverage check

| Spec requirement | Task |
|------------------|------|
| Bitácora `mail.message` | 2 |
| Allowlist modelos v1 | 1 |
| API GET/POST/PATCH/DELETE | 3 |
| Autor-only edit/delete | 2, 3 |
| UI sección + vacíos + confirm | 4 |
| Fichas cableadas | 5 |
| Validación body / 403 copy | 1, 2, 3 |
| Tests contrato | 1–5 |
| No adjuntos/portal/PDF | fuera de scope (no tasks) |

## Placeholder / consistency check

- Nombres estables: `listRecordNotes`, `createRecordNote`, `updateRecordNote`, `deleteRecordNote`, `RecordNote`, `resolveNoteTarget`.
- `authorId` = `create_uid` (usuario), no partner id — alineado con `session.uid`.
- Sin TBD en steps.
