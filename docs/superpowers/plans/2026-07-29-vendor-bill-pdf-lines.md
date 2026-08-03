# Extracción de líneas PDF → Alta FP — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Al subir un PDF con texto en Alta de FP, sugerir líneas (producto/cantidad/precio) matched al catálogo; el usuario revisa y crea el borrador con el contrato actual.

**Architecture:** Motor puro en `web/src/lib/shell/` (extraer texto PDF → parsear filas → match barcode/code/name). BFF `POST /api/accounting/vendor-bill-parse` arma indexes desde Odoo. `OrderCreateForm` con prop `suggestLinesFromPdf` prellena líneas `matched` y lista `review`.

**Tech Stack:** Astro BFF, TypeScript modules, `pdf-parse` (Node) para texto, tests `node:test` en `web/tests/`.

**Spec:** `docs/superpowers/specs/2026-07-29-vendor-bill-pdf-lines-design.md`

## Global Constraints

- v1 UI solo Alta FP (`vendor-bills/new`); motor reutilizable.
- Sin OCR; JPG/PNG no llaman parse.
- Sin auto-crear productos: `no_match` / ambiguo → `review`.
- Match: barcode → `default_code` → nombre exacto.
- Create FP: contrato existente (`partnerId`, `lines`, `attachment`); parse es paso previo.
- Adjunto máx. 10 MB; magic `%PDF`.
- Commits solo si el usuario los pide.

## File map

| Archivo | Responsabilidad |
|---------|-----------------|
| `web/src/lib/shell/vendor-bill-pdf-parse.ts` | Parse texto → filas; match/classify; types |
| `web/src/lib/shell/pdf-text.ts` | Buffer PDF → string (wrap `pdf-parse`) |
| `web/tests/vendor-bill-pdf-parse.test.mjs` | Unit parse + match |
| `web/tests/pdf-text.test.mjs` | Unit extract + empty/non-pdf |
| `web/src/lib/bff/types.ts` | Types preview response |
| `web/src/lib/bff/backend-client.ts` | Método `previewVendorBillPdf` |
| `web/src/lib/bff/odoo-adapter.ts` | Implementación indexes + classify |
| `web/src/pages/api/accounting/vendor-bill-parse.ts` | Route POST |
| `web/src/components/OrderCreateForm.astro` | Prop + UI sugerencias |
| `web/src/pages/lists/accounting/vendor-bills/new.astro` | `suggestLinesFromPdf={true}` |
| `web/tests/shell-ui.test.mjs` | Contract data-attrs |
| `web/package.json` | Dep `pdf-parse` |
| `docs/superpowers/specs/2026-07-24-vendor-bill-attachment-design.md` | Nota: PDF-texto pasa a hija |

---

### Task 1: Parse + match puro (TDD)

**Files:**
- Create: `web/src/lib/shell/vendor-bill-pdf-parse.ts`
- Create: `web/tests/vendor-bill-pdf-parse.test.mjs`

**Interfaces:**
- Produces:
  - `export type RawBillLine = { code: string; name: string; qty: number; price: number }`
  - `export type BillLineStatus = "matched" | "review" | "error"`
  - `export type ClassifiedBillLine = RawBillLine & { status: BillLineStatus; productId: number | null; reason: string; candidates: number[] }`
  - `export type ProductIndexes = { byBarcode: Record<string, number[]>; byCode: Record<string, number[]>; byName: Record<string, number[]> }`
  - `parseVendorBillText(text: string): { lines: RawBillLine[]; partnerHint: { vat?: string; name?: string } | null }`
  - `buildProductIndexes(products: Array<{ id: number; barcode?: string | null; default_code?: string | null; name?: string | null }>): ProductIndexes` (reusar patrón de price-list-import o importar si ya exporta)
  - `matchBillLine(row: RawBillLine, indexes: ProductIndexes): Pick<ClassifiedBillLine, "status" | "productId" | "reason" | "candidates">`
  - `classifyBillLines(lines: RawBillLine[], indexes: ProductIndexes): ClassifiedBillLine[]`
  - Reusar `parsePrice` desde `./price-list-import.ts`

- [ ] **Step 1: Write failing tests**

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseVendorBillText,
  matchBillLine,
  classifyBillLines,
  buildProductIndexes,
} from "../src/lib/shell/vendor-bill-pdf-parse.ts";

const SAMPLE = `
FACTURA A  Nro 0001-00004567
CUIT: 30-71234567-8
Razon Social: Distribuidora Gas del Sur S.A.
Codigo         Descripcion                              Cant   P.Unit    Importe
ABRANORT-1     ABRAZADERA PARA GAS                      10    618.45    6184.50
ACEITEX-12     ACEITE LIMPIA CONTACTO                    3   6491.87   19475.61
Subtotal neto: $ 25660.11
IVA 21%:       $ 5388.62
TOTAL:         $ 31048.73
`;

describe("parseVendorBillText", () => {
  it("extracts SKU lines and skips totals", () => {
    const { lines, partnerHint } = parseVendorBillText(SAMPLE);
    assert.equal(lines.length, 2);
    assert.equal(lines[0].code, "ABRANORT-1");
    assert.equal(lines[0].qty, 10);
    assert.equal(lines[0].price, 618.45);
    assert.equal(partnerHint?.vat, "30-71234567-8");
  });

  it("returns empty lines for blank text", () => {
    assert.deepEqual(parseVendorBillText("").lines, []);
  });
});

describe("matchBillLine", () => {
  const indexes = buildProductIndexes([
    { id: 3, barcode: "ABRANORT-1", default_code: "ABRANORT-1", name: "Abrazadera" },
    { id: 5, barcode: "ACEITEX-12", default_code: "ACEITEX-12", name: "Aceite" },
  ]);

  it("matches by default_code", () => {
    const m = matchBillLine(
      { code: "ABRANORT-1", name: "x", qty: 1, price: 10 },
      indexes
    );
    assert.equal(m.status, "matched");
    assert.equal(m.productId, 3);
    assert.equal(m.reason, "default_code");
  });

  it("review on no_match", () => {
    const m = matchBillLine(
      { code: "NO-EXISTE", name: "Otro", qty: 1, price: 10 },
      indexes
    );
    assert.equal(m.status, "review");
    assert.equal(m.reason, "no_match");
  });

  it("error on invalid qty", () => {
    const m = matchBillLine(
      { code: "ABRANORT-1", name: "x", qty: 0, price: 10 },
      indexes
    );
    assert.equal(m.status, "error");
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `cd web && node --experimental-strip-types --import ./scripts/test-env.mjs --test tests/vendor-bill-pdf-parse.test.mjs`  
Expected: FAIL (module missing)

- [ ] **Step 3: Implement `vendor-bill-pdf-parse.ts`**

```ts
import { parsePrice } from "./price-list-import.ts";
// types + buildProductIndexes (copy small helper from price-list-import if not exported)
// parseVendorBillText: scan lines; CUIT regex /(\d{2}-\d{8}-\d)/;
// line regex: /^(\S+)\s+(.+?)\s+(\d+(?:[.,]\d+)?)\s+(\d[\d.,]*)\s+([\d.,]+)\s*$/
// skip if code matches /^(subtotal|iva|total|codigo)/i
// matchBillLine: if qty<=0 or !price → error; else barcode → code → name
```

- [ ] **Step 4: Run tests — expect PASS**

Run: same command → PASS

- [ ] **Step 5: Commit** (solo si el usuario pide)

```bash
git add web/src/lib/shell/vendor-bill-pdf-parse.ts web/tests/vendor-bill-pdf-parse.test.mjs
git commit -m "feat(web): parse and match vendor bill PDF text lines"
```

---

### Task 2: Extracción de texto PDF

**Files:**
- Create: `web/src/lib/shell/pdf-text.ts`
- Create: `web/tests/pdf-text.test.mjs`
- Modify: `web/package.json` — add dependency `pdf-parse`

**Interfaces:**
- Consumes: Buffer PDF
- Produces: `extractPdfText(bytes: Uint8Array): Promise<string>`
- Produces: `isPdfMagic(bytes: Uint8Array): boolean` — primeros 4 bytes `%PDF`

- [ ] **Step 1: Add dependency**

Run: `cd web && npm install pdf-parse`  
Expected: `pdf-parse` in dependencies

- [ ] **Step 2: Failing test**

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extractPdfText, isPdfMagic } from "../src/lib/shell/pdf-text.ts";

describe("pdf-text", () => {
  it("detects magic", () => {
    assert.equal(isPdfMagic(Buffer.from("%PDF-1.4")), true);
    assert.equal(isPdfMagic(Buffer.from("not")), false);
  });

  it("extracts text from minimal PDF with Tj operators", async () => {
    // build or load fixture bytes that contain "(ABRANORT-1) Tj"
    const text = await extractPdfText(fixtureBytes);
    assert.match(text, /ABRANORT|FACTURA|CUIT/i);
  });
});
```

Si no hay fixture en repo: generar en el test un PDF mínimo (mismo patrón que el script de prueba) con string `ABRANORT-1`.

- [ ] **Step 3: Implement wrapper**

```ts
import pdfParse from "pdf-parse";

export function isPdfMagic(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  );
}

export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  if (!isPdfMagic(bytes)) return "";
  try {
    const result = await pdfParse(Buffer.from(bytes));
    return String(result.text || "").trim();
  } catch {
    return "";
  }
}
```

Ajustar import ESM si `pdf-parse` exige default interop (`pdfParse.default`).

- [ ] **Step 4: Run tests PASS**

`cd web && npm test -- tests/pdf-text.test.mjs` (o path completo con node --test)

- [ ] **Step 5: Commit** (si el usuario pide)

---

### Task 3: BFF endpoint + adapter

**Files:**
- Modify: `web/src/lib/bff/types.ts` — `VendorBillPdfPreview`
- Modify: `web/src/lib/bff/backend-client.ts` — método
- Modify: `web/src/lib/bff/odoo-adapter.ts` — `previewVendorBillPdf`
- Create: `web/src/pages/api/accounting/vendor-bill-parse.ts`
- Modify: `web/tests/odoo-adapter.test.mjs` — mock call_kw products + assert classify

**Interfaces:**
- `previewVendorBillPdf(odooSessionId, { filename, content }): Promise<VendorBillPdfPreview>`
- `VendorBillPdfPreview = { lines: ClassifiedBillLine[]; counts: { matched, review, error }; partnerHint: { vat?: string; name?: string } | null }`

- [ ] **Step 1: Types + backend-client method signature**

```ts
previewVendorBillPdf(
  odooSessionId: string,
  input: { filename: string; content: string }
): Promise<VendorBillPdfPreview>;
```

- [ ] **Step 2: Adapter implementation**

```ts
async previewVendorBillPdf(odooSessionId, input) {
  const raw = Buffer.from(stripDataUrl(input.content), "base64");
  if (!isPdfMagic(raw)) throw new BffError("validation_error", 400, "Usá un archivo PDF.");
  if (raw.length > 10_485_760) throw new BffError("validation_error", 400, "El archivo es demasiado grande (máx. 10 MB).");
  const text = await extractPdfText(raw);
  const { lines: rawLines, partnerHint } = parseVendorBillText(text);
  const products = await this.#callKw(/* product.product search_read barcode, default_code, name, limit razonable */);
  const indexes = buildProductIndexes(products);
  const lines = classifyBillLines(rawLines, indexes);
  const counts = { matched: 0, review: 0, error: 0 };
  for (const l of lines) counts[l.status]++;
  return { lines, counts, partnerHint };
}
```

- [ ] **Step 3: API route**

Mirror `price-list-import.ts` style: `requireOdooSession`, POST JSON, `json({ ok: true, ...preview })`.

- [ ] **Step 4: Adapter unit test with mock products** — PASS

- [ ] **Step 5: Commit** (si el usuario pide)

---

### Task 4: UI OrderCreateForm + new.astro

**Files:**
- Modify: `web/src/components/OrderCreateForm.astro`
- Modify: `web/src/pages/lists/accounting/vendor-bills/new.astro`
- Modify: `web/tests/shell-ui.test.mjs`

**Interfaces:**
- Prop Astro: `suggestLinesFromPdf?: boolean` (default false)
- data-attrs: `data-pdf-suggest`, `data-pdf-suggest-status`, `data-pdf-suggest-apply`, `data-pdf-suggest-list`

- [ ] **Step 1: Enable prop on new.astro**

```astro
<OrderCreateForm
  ...
  requireAttachment={true}
  showBillSource={true}
  suggestLinesFromPdf={true}
  suppressFiscalHints={true}
/>
```

- [ ] **Step 2: UI block + script**

On `billAttachment` change, if `suggestLinesFromPdf` and file.type === `application/pdf` (or name endsWith `.pdf`):
1. Read file as data URL / base64
2. `POST /api/accounting/vendor-bill-parse`
3. Show counts; auto-append `status===matched'` to `lines` array via existing `renderLines`
4. Show review rows with “Elegir producto” using existing product picker draft fields, or discard button
5. If `partnerHint?.vat` and no partner selected: optional search vendors list by vat (best-effort; skip if costly — minimum: show hint text `CUIT detectado: …`)

Empty/error: set status text per spec copy; do not clear a manually chosen attachment.

- [ ] **Step 3: shell-ui contract test**

Assert `vendor-bills/new.astro` source includes `suggestLinesFromPdf` and `data-pdf-suggest`.

- [ ] **Step 4: Manual smoke**

1. Stack up; login  
2. Alta FP → subir `factura_proveedor_PRUEBA.pdf`  
3. Ver líneas matched  
4. Crear borrador → ficha con líneas  

- [ ] **Step 5: Commit** (si el usuario pide)

---

### Task 5: Docs padre + bitácora breve

**Files:**
- Modify: `docs/superpowers/specs/2026-07-24-vendor-bill-attachment-design.md` — en No-objetivos / alcance, link a hija: extracción PDF texto en `2026-07-29-vendor-bill-pdf-lines-design.md`
- Modify: `docs/proyecto/bitacora-cambios.md` — entrada corta (cuando se implemente; en esta task solo si se implementó UI)

- [ ] **Step 1: Link from parent spec**
- [ ] **Step 2: Bitácora** (tras merge de código; si solo docs del plan/spec, anotar “spec+plan listos”)

---

## Self-review vs spec

| Spec requirement | Task |
|------------------|------|
| parseVendorBillText + heuristics | 1 |
| match barcode→code→name; review no auto-create | 1 |
| extractPdfText / magic / 10MB | 2+3 |
| POST vendor-bill-parse | 3 |
| OrderCreateForm suggest + new.astro | 4 |
| JPG no parse | 4 |
| Roadmap otras secciones | spec only (no code) |
| Tests unit | 1, 2, 3, 4 |

**Placeholder scan:** none intentional.  
**Type consistency:** `ClassifiedBillLine` / `VendorBillPdfPreview` shared names across tasks 1–4.

---

## Execution handoff

Plan listo en `docs/superpowers/plans/2026-07-29-vendor-bill-pdf-lines.md`.

Opciones:
1. **Subagent-driven** (recomendado) — un subtarea por Task 1→4 con review entre medias  
2. **Inline** — ejecutar tasks en esta sesión  

¿Cuál preferís?
