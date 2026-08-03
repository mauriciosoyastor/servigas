# Design: Extracción de líneas desde PDF (opción A) — Alta FP

**Fecha:** 2026-07-29  
**Estado:** implementado  
**Repo:** servigas (`web/`)  
**Padre:** [vendor-bill-attachment](./2026-07-24-vendor-bill-attachment-design.md)  
**Usuario día a día:** administrativo de mostrador

## Problema

En **Alta de FP** el PDF/foto se adjunta como comprobante, pero las líneas hay que cargarlas a mano. Con PDFs de texto (listas/facturas digitales) eso es fricción innecesaria: el código, cantidad y precio ya están en el archivo.

## Meta

Al subir un **PDF con texto embebido**, sugerir líneas (producto + cantidad + precio) en el form de Alta FP. El usuario revisa, corrige y crea el borrador como hoy. Sin OCR de fotos/escaneos en v1.

## Decisiones fijadas

| Tema | Decisión |
|------|----------|
| Alcance v1 UI | Solo **Alta FP** (`/lists/accounting/vendor-bills/new`) |
| Motor | Módulo puro reutilizable en `web/src/lib/shell/` (testable sin Odoo) |
| Otras secciones | Roadmap documentado; **no** cablear UI extra en v1 |
| Sin match de producto | Estado **revisar**: no auto-crear producto; el usuario elige o descarta |
| Match ambiguo | Estado **revisar** (misma regla que lista de precios) |
| Fotos / PDF escaneado | Mensaje amable: no hay texto extraíble; seguir flujo manual |
| Confirmar | Nunca crear FP sin que el usuario pulse **Crear borrador** |

## Alcance

| Incluye | No incluye |
|---------|------------|
| Extraer texto de PDF digital | OCR / visión (opción B) |
| Parsear filas con código + cant + precio | Layouts PDF arbitrarios de todos los proveedores |
| Match catálogo: barcode → `default_code` → nombre exacto | Auto-crear productos |
| Prellenar líneas matched en `OrderCreateForm` | WhatsApp/Gmail API |
| Hint opcional de proveedor por CUIT del PDF si el picker está vacío | Matching a OC / remito |
| Endpoint BFF de parse + match | Cambiar contrato de create FP (sigue `partnerId` + `lines` + `attachment`) |
| Unit tests del motor puro | NC proveedor / FC / remitos en UI v1 |

## Glosario

- **PDF texto** = PDF con strings extraíbles (no solo imagen raster).
- **Línea sugerida** = `{ code?, name?, qty, price, status, productId?, reason }` lista para el form.
- **status** = `matched` \| `review` \| `error` (solo `matched` se auto-agrega a líneas del form; `review`/`error` se listan para acción manual).

## UX (Alta FP)

1. Usuario elige origen + archivo (como hoy).
2. Si el archivo es **PDF**:
   - UI muestra estado: `Leyendo comprobante…`
   - Si hay ≥1 línea parseable: bloque **Líneas detectadas** con conteos (`N listas · M a revisar · E error`).
   - Botón **Usar líneas detectadas** (o auto-aplicar solo las `matched` y dejar `review` visibles).
3. Comportamiento al aplicar sugerencias:
   - `matched` → se agregan a `data-lines-list` (mismo shape que “Agregar línea”).
   - `review` → quedan en una lista aparte con CTA “Elegir producto…” (reusa picker de producto) o “Descartar”.
   - `error` (precio/cant inválidos) → mensaje; no entran al form.
4. Si el PDF no tiene texto / no se detectan filas: toast o texto muted  
   `No se pudieron leer líneas de este PDF. Agregálas a mano.`  
   El adjunto sigue válido.
5. JPG/PNG: no se intenta parse; sin mensaje de error (solo PDF intenta extracción).
6. Proveedor: si el PDF trae CUIT y el picker está vacío, sugerir match de vendor por `vat` (opcional, no bloquea).

### Copy

| Caso | Mensaje |
|------|---------|
| Leyendo | `Leyendo comprobante…` |
| OK | `Detectamos N líneas. Revisá antes de crear el borrador.` |
| Sin texto | `No se pudieron leer líneas de este PDF. Agregálas a mano.` |
| Solo review | `Hay líneas sin producto claro. Elegí el producto o descartalas.` |

## Flujo

```text
PDF seleccionado
    → POST /api/accounting/vendor-bill-parse
         { filename, content(base64) }
    → extractPdfText (servidor)
    → parseInvoiceLines (puro)
    → matchProducts (adapter + indexes)
    → { lines[], partnerHint? }
    → UI prellena matched + lista review
    → usuario edita
    → Crear borrador (contrato create existente)
```

## Técnica

### Módulos puros (`web/src/lib/shell/`)

1. **`pdf-text.ts`** (o wrapper fino)
   - Input: `Buffer` / `Uint8Array` PDF.
   - Output: `string` texto plano (páginas concatenadas).
   - Dependencia: librería Node liviana (`pdf-parse` o equivalente ya compatible con el runtime Astro/Node). Si falla → texto vacío (no throw duro al usuario).

2. **`vendor-bill-pdf-parse.ts`**
   - `parseVendorBillText(text) -> { lines: RawBillLine[], partnerHint?: { vat?, name? }, error?: string }`
   - `RawBillLine`: `{ code: string, name: string, qty: number, price: number }`
   - Heurística v1 (suficiente para facturas tabulares tipo demo / muchas listas AR):
     - Buscar bloque de ítems (después de headers tipo `Codigo`/`Cant`/`P.Unit`/`Importe`, o filas `SKU  descripción  qty  price`).
     - Regex tolerante a espacios; precios AR (`1.234,56` y `1234.56`) reutilizando `parsePrice` de lista de precios si aplica.
     - Ignorar totales (`Subtotal`, `IVA`, `TOTAL`).
   - `matchBillLine(row, indexes) -> { status, productId, reason, candidates }`
     - Orden: barcode → default_code → nombre exacto (case-insensitive trim).
     - 0 hits → `review` / `no_match`.
     - >1 hits → `review` / `ambiguous_*`.
     - 1 hit → `matched` + reason `barcode|default_code|name`.
     - qty≤0 o price inválido → `error`.

### BFF

- `POST /api/accounting/vendor-bill-parse`
  - Auth sesión BFF.
  - Body: `{ filename, content }` (base64 o data-URL); validar magic `%PDF` y tamaño ≤ 10 MB (mismo techo que adjunto FP).
  - Rechazar no-PDF con 400 claro.
  - Adapter: `previewVendorBillPdf(session, { filename, content })` → extract + parse + build product indexes (barcode/code/name) + classify.
  - Response:

```json
{
  "ok": true,
  "lines": [
    {
      "status": "matched",
      "reason": "default_code",
      "productId": 3,
      "code": "ABRANORT-1",
      "name": "ABRAZADERA...",
      "qty": 10,
      "price": 618.45
    }
  ],
  "counts": { "matched": 5, "review": 1, "error": 0 },
  "partnerHint": { "vat": "30-71234567-8", "name": "Distribuidora Gas del Sur S.A." }
}
```

### UI

- Extender [`OrderCreateForm.astro`](../../web/src/components/OrderCreateForm.astro) con prop opcional `suggestLinesFromPdf={true}` (solo en `vendor-bills/new.astro`).
- Al `change` del file input PDF → fetch parse → render bloque sugerencias → aplicar matched a `lines[]`.
- No romper flujos sin la prop (FC, presupuestos, etc.).

## Roadmap (otras secciones — fuera de v1)

| Sección | Por qué encaja | Notas |
|---------|----------------|-------|
| **NC proveedor** (`vendor-refunds/new`) | Mismo form + adjunto posible | Reusar prop + mismo endpoint o `move_type` hint |
| **Import lista precios** | Ya hay CSV; proveedores mandan PDF tabular | Unir heurística de filas con `price-list-import` (ya excluye PDF hoy) |
| **Remitos / recepción** | Códigos + cantidades, sin precios | Nuevo parse profile `remito` |
| **OC compra** | Cotizaciones PDF de proveedor | Menor prioridad |
| **FC cliente** | Ustedes emiten; poco valor | Diferido |
| **OCR fotos** (opción B) | WhatsApp escaneados | Servicio/IA aparte; mismo preview de líneas |

Principio: **un motor de “texto → filas → match catálogo → preview”**; cada sección solo cambia perfil de parse + UI host.

## Errores / edge cases

| Caso | Comportamiento |
|------|----------------|
| PDF sin texto | `lines: []` + mensaje UI; create manual OK |
| PDF > 10 MB | 400, mismo copy que adjunto |
| JPG/PNG en input | No llamar parse |
| Líneas matched + usuario borra todas | Create sigue exigiendo ≥1 línea |
| partnerHint sin vendor en DB | Ignorar hint |
| Dos PDFs seguidos | Reemplazar sugerencias; no duplicar líneas sin confirmar |

## Verificación

- Unit: `parseVendorBillText` con fixture del PDF de prueba Servigas + casos vacíos/totales.
- Unit: `matchBillLine` barcode/code/name/ambiguous/no_match/invalid.
- Unit/API: endpoint rechaza non-PDF; PDF texto → counts.
- Shell UI contract: `vendor-bills/new` con `suggestLinesFromPdf` / data-attrs (`data-pdf-suggest`).
- Manual: subir `factura_proveedor_PRUEBA.pdf` → ver líneas ABRANORT/ACEITEX → crear borrador.

## Criterio de hecho (v1)

1. PDF de prueba detecta ≥1 línea matched contra catálogo real.
2. Foto/JPG no rompe el alta.
3. Create FP sin cambios de contrato.
4. Tests unit del parser/match en verde.

## Relación con spec padre

Actualiza el “No incluye” de OCR: la **extracción de PDF texto** pasa a incluida en esta entrega; OCR sigue fuera.
