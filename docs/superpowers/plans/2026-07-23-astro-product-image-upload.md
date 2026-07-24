# Product Image Upload (galería/cámara) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En Inventario → Productos (lista + ficha), permitir cargar o reemplazar la foto del producto desde galería/cámara con preview y confirmación, persistiendo `image_1920` vía BFF.

**Architecture:** Icono en UI abre `<input type="file" accept="image/*">` → modal preview → `POST /api/records/inventory/products` con `image_1920` (data-URL o base64) → allowlist + normalización en `record-writes` / helper → `OdooAdapter.updateRecord` → refresh del thumb con cache-bust.

**Tech Stack:** Astro SSR, BFF `POST /api/records/[...slug]`, `OdooAdapter` JSON-RPC `write`, Node test runner (`npm test` en `web/`), CSS `--sg-*` en `list.css`.

**Spec:** `docs/superpowers/specs/2026-07-23-astro-product-image-upload-design.md`

## Global Constraints

- Solo `inventory/products` (`product.template`); no variantes ni otros modelos.
- Campo Odoo de escritura: `image_1920` (Odoo deriva miniaturas).
- Reusar `POST /api/records/inventory/products`; no endpoint multipart nuevo.
- `accept="image/*"` sin `capture` obligatorio (galería + cámara en móvil).
- Preview + Guardar/Cancelar antes de persistir.
- Techo ~2.5 MB decodificado; solo MIME `image/*`.
- Browser nunca habla con Odoo; solo BFF + cookie de sesión.
- Copy UI en español.

---

## File map

| File | Role |
|------|------|
| `web/src/lib/shell/product-image.ts` | Normalizar/validar `image_1920` (data-URL → base64, MIME, tamaño) |
| `web/src/lib/shell/record-writes.ts` | Allowlist `image_1920` + integrar filtro |
| `web/tests/product-image.test.mjs` | Unit tests del helper |
| `web/tests/record-writes.test.mjs` | Allowlist + filter con imagen |
| `web/tests/odoo-adapter.test.mjs` | `updateRecord` escribe `image_1920` |
| `web/src/components/ProductImageUploadHost.astro` | Input file + modal + script cliente compartido |
| `web/src/components/RecordTable.astro` | Botón-icono en celda imagen cuando hay upload |
| `web/src/components/RecordDetailBody.astro` | Control en foto / “Sin foto” |
| `web/src/pages/lists/[...slug].astro` | Montar host en lista productos |
| `web/src/pages/lists/inventory/products/[id].astro` | Montar host + pasar props a detail |
| `web/src/styles/list.css` | Estilos thumb con botón + modal |
| `web/tests/shell-ui.test.mjs` | Contratos UI (icono, accept, host) |

---

### Task 1: Helper de validación `image_1920`

**Files:**
- Create: `web/src/lib/shell/product-image.ts`
- Test: `web/tests/product-image.test.mjs`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `export const MAX_PRODUCT_IMAGE_BYTES = 2_621_440` // 2.5 MiB
  - `export function normalizeProductImage1920(raw: unknown): string`  
    - Input: data-URL `data:image/...;base64,...` o base64 puro  
    - Output: base64 puro para Odoo  
    - Throws: `BffError("validation_error", 400, message)` si inválido

- [ ] **Step 1: Write the failing test**

Create `web/tests/product-image.test.mjs`:

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_PRODUCT_IMAGE_BYTES,
  normalizeProductImage1920,
} from "../src/lib/shell/product-image.ts";

// 1x1 PNG
const PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("normalizeProductImage1920", () => {
  it("accepts a data-URL and returns pure base64", () => {
    const out = normalizeProductImage1920(`data:image/png;base64,${PNG_B64}`);
    assert.equal(out, PNG_B64);
  });

  it("accepts pure base64 for image bytes", () => {
    const out = normalizeProductImage1920(PNG_B64);
    assert.equal(out, PNG_B64);
  });

  it("rejects non-image data-URL", () => {
    assert.throws(
      () => normalizeProductImage1920("data:text/plain;base64,aGVsbG8="),
      (err) => err?.code === "validation_error"
    );
  });

  it("rejects oversized payloads", () => {
    const huge = Buffer.alloc(MAX_PRODUCT_IMAGE_BYTES + 1, 1).toString("base64");
    assert.throws(
      () => normalizeProductImage1920(`data:image/jpeg;base64,${huge}`),
      (err) =>
        err?.code === "validation_error" &&
        String(err.message).toLowerCase().includes("grande")
    );
  });

  it("rejects empty / non-string", () => {
    assert.throws(
      () => normalizeProductImage1920(""),
      (err) => err?.code === "validation_error"
    );
    assert.throws(
      () => normalizeProductImage1920(null),
      (err) => err?.code === "validation_error"
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run (from `web/`):

```bash
npm test -- tests/product-image.test.mjs
```

Expected: FAIL (module not found / export missing).

- [ ] **Step 3: Write minimal implementation**

Create `web/src/lib/shell/product-image.ts`:

```ts
import { BffError } from "../bff/errors.ts";

export const MAX_PRODUCT_IMAGE_BYTES = 2_621_440; // 2.5 MiB

const DATA_URL_RE = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i;

function decodedByteLength(base64: string): number {
  const clean = base64.replace(/\s+/g, "");
  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  return Math.floor((clean.length * 3) / 4) - padding;
}

function assertImageMagic(base64: string): void {
  const buf = Buffer.from(base64.replace(/\s+/g, ""), "base64");
  if (buf.length < 3) {
    throw new BffError(
      "validation_error",
      400,
      "La imagen no es válida."
    );
  }
  const isPng =
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const isGif = buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46;
  const isWebp =
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP";
  if (!isPng && !isJpeg && !isGif && !isWebp) {
    throw new BffError(
      "validation_error",
      400,
      "Usá una imagen JPG, PNG, GIF o WebP."
    );
  }
}

export function normalizeProductImage1920(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new BffError(
      "validation_error",
      400,
      "Seleccioná una imagen válida."
    );
  }

  const trimmed = raw.trim();
  let base64: string;

  const dataMatch = trimmed.match(DATA_URL_RE);
  if (dataMatch) {
    base64 = dataMatch[2].replace(/\s+/g, "");
  } else if (/^[a-z0-9+/=\s]+$/i.test(trimmed)) {
    base64 = trimmed.replace(/\s+/g, "");
  } else {
    throw new BffError(
      "validation_error",
      400,
      "Seleccioná una imagen válida."
    );
  }

  if (decodedByteLength(base64) > MAX_PRODUCT_IMAGE_BYTES) {
    throw new BffError(
      "validation_error",
      400,
      "La imagen es demasiado grande (máx. 2,5 MB)."
    );
  }

  assertImageMagic(base64);
  return base64;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/product-image.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/shell/product-image.ts web/tests/product-image.test.mjs
git commit -m "feat(web): validate product image_1920 payloads"
```

---

### Task 2: Allowlist + filter writable `image_1920`

**Files:**
- Modify: `web/src/lib/shell/record-writes.ts`
- Modify: `web/tests/record-writes.test.mjs`
- Modify: `web/tests/odoo-adapter.test.mjs` (positive write test)

**Interfaces:**
- Consumes: `normalizeProductImage1920` from Task 1
- Produces: `filterWritableValues("inventory/products", { image_1920 })` → `{ image_1920: "<base64>" }`  
  `getRecordWriteDef("inventory/products").fields` includes `"image_1920"`

- [ ] **Step 1: Write the failing tests**

Append to `web/tests/record-writes.test.mjs`:

```js
  it("allows image_1920 updates on inventory products", () => {
    const def = getRecordWriteDef("inventory/products");
    assert.ok(def);
    assert.ok(def.fields.includes("image_1920"));
  });

  it("filters product image_1920 from a data-URL", () => {
    const png =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const filtered = filterWritableValues("inventory/products", {
      image_1920: `data:image/png;base64,${png}`,
      name: "HACK",
    });
    assert.deepEqual(filtered, { image_1920: png });
  });
```

In `web/tests/odoo-adapter.test.mjs`, inside `describe("OdooAdapter.updateRecord")`, add:

```js
  it("writes product image_1920", async () => {
    const png =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const fetchImpl = mock.fn(async () => Response.json({ result: true }));
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });

    await adapter.updateRecord("sess", "inventory/products", 10, {
      image_1920: `data:image/png;base64,${png}`,
    });

    const [, init] = fetchImpl.mock.calls[0].arguments;
    const body = JSON.parse(init.body);
    assert.equal(body.params.model, "product.template");
    assert.equal(body.params.method, "write");
    assert.deepEqual(body.params.args, [[10], { image_1920: png }]);
  });
```

Keep the existing test that rejects `{ name: "x" }` on products (still not allowlisted).

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- tests/record-writes.test.mjs tests/odoo-adapter.test.mjs
```

Expected: FAIL on new assertions (`image_1920` missing / filter null).

- [ ] **Step 3: Write minimal implementation**

In `web/src/lib/shell/record-writes.ts`:

1. Import helper:

```ts
import { normalizeProductImage1920 } from "./product-image.ts";
```

2. Add field to products write config:

```ts
  "inventory/products": {
    fields: ["default_code", "list_price", "image_1920"],
    createFields: ["name", "default_code", "list_price"],
    // ...defaults unchanged
  },
```

3. Update `filterWritableValues` return type to `Record<string, string> | null` (unchanged) but special-case image:

```ts
export function filterWritableValues(
  listKey: string,
  values: Record<string, unknown>
): Record<string, string> | null {
  const def = getRecordWriteDef(listKey);
  if (!def) return null;

  const out: Record<string, string> = {};
  for (const field of def.fields) {
    if (!(field in values)) continue;
    if (field === "image_1920") {
      out.image_1920 = normalizeProductImage1920(values.image_1920);
      continue;
    }
    const next = asTrimmedString(values[field]);
    if (next === null) continue;
    out[field] = next;
  }

  return Object.keys(out).length ? out : null;
}
```

Note: `normalizeProductImage1920` throws `BffError`; let it propagate from `updateRecord` / API handler (already maps via `bffErrorResponse`).

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- tests/record-writes.test.mjs tests/odoo-adapter.test.mjs tests/product-image.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add web/src/lib/shell/record-writes.ts web/tests/record-writes.test.mjs web/tests/odoo-adapter.test.mjs
git commit -m "feat(web): allowlist product image_1920 writes"
```

---

### Task 3: Host cliente (file picker + modal preview + POST)

**Files:**
- Create: `web/src/components/ProductImageUploadHost.astro`
- Modify: `web/tests/shell-ui.test.mjs`

**Interfaces:**
- Consumes: `POST` contract from Task 2
- Produces: component that listens for clicks on `[data-product-image-trigger]` with:
  - `data-record-id` (number)
  - `data-api-path` (e.g. `/api/records/inventory/products`)
  - `data-image-target` (CSS selector of `<img>` or empty container to refresh)

- [ ] **Step 1: Write the failing UI contract test**

Append to `web/tests/shell-ui.test.mjs`:

```js
  it("provides product image upload host with gallery picker and preview", async () => {
    const host = await source("components/ProductImageUploadHost.astro");
    assert.match(host, /data-product-image-host/);
    assert.match(host, /type=["']file["']/);
    assert.match(host, /accept=["']image\/\*["']/);
    assert.doesNotMatch(host, /\bcapture=/);
    assert.match(host, /data-product-image-preview/);
    assert.match(host, /Guardar/);
    assert.match(host, /Cancelar/);
    assert.match(host, /fetch\(/);
    assert.match(host, /image_1920/);
  });
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- tests/shell-ui.test.mjs
```

Expected: FAIL (file missing).

- [ ] **Step 3: Implement ProductImageUploadHost.astro**

Create `web/src/components/ProductImageUploadHost.astro`:

```astro
---
/** Montar una sola vez en lista/ficha de productos. */
---

<div class="sg-product-image-host" data-product-image-host hidden>
	<input
		class="sg-product-image-file"
		type="file"
		accept="image/*"
		data-product-image-file
		tabindex="-1"
		aria-hidden="true"
	/>
	<div
		class="sg-product-image-modal"
		data-product-image-modal
		role="dialog"
		aria-modal="true"
		aria-labelledby="sg-product-image-title"
		hidden
	>
		<div class="sg-product-image-dialog sg-glass">
			<strong id="sg-product-image-title">Foto del producto</strong>
			<img class="sg-product-image-preview" data-product-image-preview alt="Vista previa" />
			<p class="sg-product-image-status" data-product-image-status hidden></p>
			<div class="sg-product-image-actions">
				<button type="button" class="sg-focus-ring" data-product-image-cancel>Cancelar</button>
				<button type="button" class="sg-focus-ring" data-product-image-save>Guardar</button>
			</div>
		</div>
	</div>
</div>

<script>
	function initProductImageUpload() {
		const host = document.querySelector("[data-product-image-host]");
		if (!(host instanceof HTMLElement) || host.dataset.bound === "1") return;
		host.dataset.bound = "1";
		host.hidden = false;

		const fileInput = host.querySelector("[data-product-image-file]");
		const modal = host.querySelector("[data-product-image-modal]");
		const preview = host.querySelector("[data-product-image-preview]");
		const status = host.querySelector("[data-product-image-status]");
		const btnCancel = host.querySelector("[data-product-image-cancel]");
		const btnSave = host.querySelector("[data-product-image-save]");
		if (
			!(fileInput instanceof HTMLInputElement) ||
			!(modal instanceof HTMLElement) ||
			!(preview instanceof HTMLImageElement) ||
			!(status instanceof HTMLElement) ||
			!(btnCancel instanceof HTMLButtonElement) ||
			!(btnSave instanceof HTMLButtonElement)
		) {
			return;
		}

		/** @type {{ id: number, apiPath: string, targetSelector: string, objectUrl: string | null, dataUrl: string | null }} */
		let pending = {
			id: 0,
			apiPath: "",
			targetSelector: "",
			objectUrl: null,
			dataUrl: null,
		};

		function setStatus(text, state) {
			if (!text) {
				status.hidden = true;
				status.textContent = "";
				status.dataset.state = "";
				return;
			}
			status.hidden = false;
			status.textContent = text;
			status.dataset.state = state || "";
		}

		function closeModal() {
			modal.hidden = true;
			if (pending.objectUrl) URL.revokeObjectURL(pending.objectUrl);
			pending.objectUrl = null;
			pending.dataUrl = null;
			fileInput.value = "";
			btnSave.disabled = false;
			setStatus("");
		}

		function openPicker(trigger) {
			const id = Number(trigger.getAttribute("data-record-id"));
			const apiPath = trigger.getAttribute("data-api-path") || "";
			const targetSelector = trigger.getAttribute("data-image-target") || "";
			if (!Number.isFinite(id) || id <= 0 || !apiPath) return;
			pending = { id, apiPath, targetSelector, objectUrl: null, dataUrl: null };
			fileInput.click();
		}

		document.addEventListener("click", (event) => {
			const target = event.target;
			if (!(target instanceof Element)) return;
			const trigger = target.closest("[data-product-image-trigger]");
			if (!(trigger instanceof HTMLElement)) return;
			event.preventDefault();
			event.stopPropagation();
			openPicker(trigger);
		});

		fileInput.addEventListener("change", () => {
			const file = fileInput.files && fileInput.files[0];
			if (!file) return;
			if (!file.type.startsWith("image/")) {
				modal.hidden = false;
				preview.removeAttribute("src");
				setStatus("Seleccioná un archivo de imagen.", "error");
				return;
			}
			if (file.size > 2_621_440) {
				modal.hidden = false;
				preview.removeAttribute("src");
				setStatus("La imagen es demasiado grande (máx. 2,5 MB).", "error");
				return;
			}
			if (pending.objectUrl) URL.revokeObjectURL(pending.objectUrl);
			pending.objectUrl = URL.createObjectURL(file);
			preview.src = pending.objectUrl;
			setStatus("");
			modal.hidden = false;

			const reader = new FileReader();
			reader.onload = () => {
				pending.dataUrl = typeof reader.result === "string" ? reader.result : null;
			};
			reader.readAsDataURL(file);
		});

		btnCancel.addEventListener("click", () => closeModal());

		btnSave.addEventListener("click", async () => {
			if (!pending.dataUrl) {
				setStatus("Esperá un segundo a que cargue la vista previa.", "error");
				return;
			}
			btnSave.disabled = true;
			setStatus("Guardando…", "pending");
			try {
				const response = await fetch(pending.apiPath, {
					method: "POST",
					credentials: "same-origin",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						action: "update",
						id: pending.id,
						values: { image_1920: pending.dataUrl },
					}),
				});
				const payload = await response.json().catch(() => ({}));
				if (response.status === 401) {
					window.location.assign("/login");
					return;
				}
				if (!response.ok) {
					throw new Error(payload?.error?.message || "No se pudo guardar la imagen");
				}
				// Mismo patrón que RecordEditForm: refresh SSR con la nueva media.
				const target = pending.targetSelector
					? document.querySelector(pending.targetSelector)
					: null;
				if (target instanceof HTMLImageElement) {
					const url = new URL(target.src, window.location.origin);
					url.searchParams.set("v", String(Date.now()));
					target.src = url.pathname + url.search;
					closeModal();
				} else {
					closeModal();
					window.setTimeout(() => window.location.reload(), 250);
				}
			} catch (error) {
				btnSave.disabled = false;
				setStatus(
					error instanceof Error ? error.message : "No se pudo guardar la imagen",
					"error"
				);
			}
		});
	}

	initProductImageUpload();
	document.addEventListener("astro:page-load", initProductImageUpload);
</script>

<style>
	.sg-product-image-file {
		position: absolute;
		width: 1px;
		height: 1px;
		opacity: 0;
		pointer-events: none;
	}
	.sg-product-image-modal {
		position: fixed;
		inset: 0;
		z-index: 80;
		display: grid;
		place-items: center;
		padding: 1rem;
		background: rgba(0, 0, 0, 0.55);
	}
	.sg-product-image-modal[hidden] {
		display: none !important;
	}
	.sg-product-image-dialog {
		width: min(22rem, 100%);
		display: grid;
		gap: 0.85rem;
		border-radius: var(--sg-radius-card);
		padding: 1.1rem;
	}
	.sg-product-image-preview {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: 0.75rem;
		border: 1px solid var(--sg-glass-border);
		background: rgba(0, 0, 0, 0.2);
	}
	.sg-product-image-status {
		margin: 0;
		font-size: 0.8rem;
		color: var(--sg-text-muted-dark);
	}
	.sg-product-image-status[data-state="error"] {
		color: #ffb4a2;
	}
	.sg-product-image-actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.65rem;
	}
	.sg-product-image-actions button {
		border: 1px solid var(--sg-glass-border);
		border-radius: var(--sg-radius-pill);
		padding: 0.55rem 0.9rem;
		color: var(--sg-text-on-dark);
		background: var(--sg-glass-fill);
		font-size: 0.8rem;
		font-weight: 650;
		cursor: pointer;
	}
	.sg-product-image-actions [data-product-image-save] {
		border-color: rgba(155, 231, 176, 0.45);
	}
</style>
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- tests/shell-ui.test.mjs
```

Expected: PASS for the new case.

- [ ] **Step 5: Commit**

```bash
git add web/src/components/ProductImageUploadHost.astro web/tests/shell-ui.test.mjs
git commit -m "feat(web): add product image upload host with preview"
```

---

### Task 4: Cablear icono en lista + ficha

**Files:**
- Modify: `web/src/components/RecordTable.astro`
- Modify: `web/src/components/RecordDetailBody.astro`
- Modify: `web/src/pages/lists/[...slug].astro`
- Modify: `web/src/pages/lists/inventory/products/[id].astro`
- Modify: `web/src/styles/list.css`
- Modify: `web/tests/shell-ui.test.mjs`

**Interfaces:**
- Consumes: host from Task 3 (`data-product-image-trigger` contract)
- Produces: visible upload control on products list rows and product detail photo

- [ ] **Step 1: Extend UI contract tests**

Append to `web/tests/shell-ui.test.mjs`:

```js
  it("wires product image upload triggers on table and detail", async () => {
    const table = await source("components/RecordTable.astro");
    const detail = await source("components/RecordDetailBody.astro");
    const listPage = await source("pages/lists/[...slug].astro");
    const productDetail = await source("pages/lists/inventory/products/[id].astro");

    assert.match(table, /imageUploadApiPath/);
    assert.match(table, /data-product-image-trigger/);
    assert.match(detail, /imageUploadApiPath/);
    assert.match(detail, /data-product-image-trigger/);
    assert.match(listPage, /ProductImageUploadHost/);
    assert.match(listPage, /imageUploadApiPath/);
    assert.match(productDetail, /ProductImageUploadHost/);
    assert.match(productDetail, /imageUploadApiPath/);
  });
```

- [ ] **Step 2: Run to verify fail**

```bash
npm test -- tests/shell-ui.test.mjs
```

Expected: FAIL (props/markup missing).

- [ ] **Step 3: Update RecordTable.astro**

Change props:

```astro
interface Props {
	columns: RecordListColumn[];
	rows: RecordListRow[];
	caption?: string;
	imageUploadApiPath?: string;
}

const { columns, rows, caption = 'Registros', imageUploadApiPath = '' } = Astro.props;
```

In the `column.kind === 'image'` branch, wrap thumb + optional button. Pattern for each row:

```astro
{column.kind === 'image' ? (
	<div class="sg-record-thumb-wrap">
		{/* existing thumb link / img / empty span — give empty span an id target */}
		{row.image_url ? (
			href ? (
				<a class="sg-record-thumb-link" href={href}>
					<img
						class="sg-record-thumb"
						src={String(row.image_url)}
						alt=""
						loading="lazy"
						width="40"
						height="40"
						data-product-thumb={row.id}
					/>
				</a>
			) : (
				<img
					class="sg-record-thumb"
					src={String(row.image_url)}
					alt=""
					loading="lazy"
					width="40"
					height="40"
					data-product-thumb={row.id}
				/>
			)
		) : (
			<span
				class="sg-record-thumb sg-record-thumb--empty"
				data-product-thumb={row.id}
				aria-hidden="true"
			/>
		)}
		{imageUploadApiPath ? (
			<button
				type="button"
				class="sg-record-thumb-upload sg-focus-ring"
				data-product-image-trigger
				data-record-id={String(row.id)}
				data-api-path={imageUploadApiPath}
				data-image-target={`[data-product-thumb="${row.id}"]`}
				aria-label={row.image_url ? 'Cambiar foto' : 'Agregar foto'}
			>
				{/* inline SVG camera/image icon 16x16 */}
				<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
					<path
						fill="currentColor"
						d="M9 3h6l1.5 2H20a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3.5L9 3zm3 5a5 5 0 1 0 .001 10.001A5 5 0 0 0 12 8zm0 2.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6z"
					/>
				</svg>
			</button>
		) : null}
	</div>
) : /* existing non-image cells */}
```

Keep name links unchanged. Do **not** put the upload button inside the thumb `<a>`.

- [ ] **Step 4: Update RecordDetailBody.astro**

`RecordDetailPayload` **no incluye `id`** (ver `web/src/lib/bff/types.ts`). Pasar siempre `recordId` desde la página.

Props:

```astro
interface Props {
	detail: RecordDetailPayload | null;
	error: string;
	eyebrow: string;
	fallbackTitle: string;
	fallbackListPath: string;
	imageUploadApiPath?: string;
	recordId?: number;
}

const {
	detail,
	error,
	eyebrow,
	fallbackTitle,
	fallbackListPath,
	imageUploadApiPath = '',
	recordId,
} = Astro.props;
```

Replace photo block with:

```astro
{detail.imageUrl || (detail.imageUrl === null && detail.key.startsWith('inventory/')) ? (
	<div class="sg-detail-photo-wrap">
		{detail.imageUrl ? (
			<img
				class="sg-detail-photo"
				src={detail.imageUrl}
				alt=""
				data-product-detail-photo
			/>
		) : (
			<div
				class="sg-detail-photo sg-detail-photo--empty"
				data-product-detail-photo
			>
				Sin foto
			</div>
		)}
		{imageUploadApiPath && recordId ? (
			<button
				type="button"
				class="sg-detail-photo-upload sg-focus-ring"
				data-product-image-trigger
				data-record-id={String(recordId)}
				data-api-path={imageUploadApiPath}
				data-image-target="[data-product-detail-photo]"
				aria-label={detail.imageUrl ? 'Cambiar foto' : 'Agregar foto'}
			>
				<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
					<path
						fill="currentColor"
						d="M9 3h6l1.5 2H20a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3.5L9 3zm3 5a5 5 0 1 0 .001 10.001A5 5 0 0 0 12 8zm0 2.2a2.8 2.8 0 1 1 0 5.6 2.8 2.8 0 0 1 0-5.6z"
					/>
				</svg>
				<span>{detail.imageUrl ? 'Cambiar foto' : 'Agregar foto'}</span>
			</button>
		) : null}
	</div>
) : null}
```

- [ ] **Step 5: Mount host + pass props on pages**

In `web/src/pages/lists/[...slug].astro`:

```astro
import ProductImageUploadHost from '../../components/ProductImageUploadHost.astro';
```

When rendering the table for products:

```astro
<RecordTable
	columns={payload.columns}
	rows={payload.rows}
	caption={payload.title}
	imageUploadApiPath={
		listKey === 'inventory/products'
			? '/api/records/inventory/products'
			: undefined
	}
/>
{listKey === 'inventory/products' ? <ProductImageUploadHost /> : null}
```

In `web/src/pages/lists/inventory/products/[id].astro`:

```astro
import ProductImageUploadHost from '../../../../components/ProductImageUploadHost.astro';

<RecordDetailBody
	detail={detail}
	error={error}
	eyebrow="Ficha de producto"
	fallbackTitle="Producto"
	fallbackListPath="/lists/inventory/products"
	imageUploadApiPath="/api/records/inventory/products"
	recordId={id}
/>
{detail && !error ? <ProductImageUploadHost /> : null}
```

- [ ] **Step 6: Styles in `web/src/styles/list.css`**

Append:

```css
.sg-record-thumb-wrap {
	position: relative;
	width: 2.5rem;
	height: 2.5rem;
}

.sg-record-thumb-upload {
	position: absolute;
	right: -0.35rem;
	bottom: -0.35rem;
	display: grid;
	place-items: center;
	width: 1.35rem;
	height: 1.35rem;
	padding: 0;
	border-radius: 999px;
	border: 1px solid var(--sg-glass-border);
	background: color-mix(in srgb, var(--sg-bg-charcoal) 88%, white);
	color: var(--sg-text-on-dark);
	cursor: pointer;
}

.sg-record-thumb-upload:hover {
	color: var(--sg-flame-yellow);
}

.sg-detail-photo-wrap {
	display: grid;
	gap: 0.65rem;
}

.sg-detail-photo-upload {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	gap: 0.4rem;
	border: 1px solid var(--sg-glass-border);
	border-radius: var(--sg-radius-pill);
	padding: 0.55rem 0.85rem;
	color: var(--sg-text-on-dark);
	background: var(--sg-glass-fill);
	font-size: 0.8rem;
	font-weight: 650;
	cursor: pointer;
	width: fit-content;
}
```

- [ ] **Step 7: Run all web tests**

```bash
npm test
```

Expected: PASS (full suite).

- [ ] **Step 8: Manual smoke (si Odoo up)**

1. `astro dev --background` desde `web/`.
2. Login → Inventario → Productos.
3. En una fila sin foto, tocar icono → elegir imagen → preview → Guardar → thumb actualizado.
4. Abrir ficha → Cambiar foto → cámara o galería en celular → Guardar.
5. Cancelar en preview no debe escribir.

- [ ] **Step 9: Commit**

```bash
git add web/src/components/RecordTable.astro web/src/components/RecordDetailBody.astro web/src/pages/lists/[...slug].astro web/src/pages/lists/inventory/products/[id].astro web/src/styles/list.css web/tests/shell-ui.test.mjs
git commit -m "feat(web): product photo upload from list and detail"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Icono en lista | Task 4 |
| Icono en ficha | Task 4 |
| Galería + cámara (`accept=image/*`, sin capture) | Task 3 |
| Agregar y reemplazar | Task 4 (mismo trigger) |
| Preview + Guardar/Cancelar | Task 3 |
| `image_1920` vía BFF allowlisted | Tasks 1–2 |
| Sin multipart nuevo | Tasks 2–3 |
| Límite tamaño / solo image | Tasks 1 + 3 |
| Cache-bust en `<img>` existente; reload si era placeholder vacío | Task 3 |
| Solo `inventory/products` | Task 4 page wiring |
| Tests allowlist/adapter/UI | Tasks 1–4 |

## Out of scope (do not implement)

- Variantes, recorte, multi-foto, import batch de imágenes.
)
