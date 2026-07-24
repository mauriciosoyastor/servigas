# Design: FP con adjunto (PDF/foto) — carga manual

**Fecha:** 2026-07-24  
**Estado:** approved  
**Repo:** servigas (`web/` + `servigas_core`)  
**Padre:** [cf-cuit-invoice-destination](./2026-07-24-cf-cuit-invoice-destination-design.md)  
**Usuario día a día:** administrativo de mostrador

## Problema

Las facturas de proveedor llegan por WhatsApp, Gmail u otras vías como PDF o foto. Hoy no hay forma de cargarlas en el shell Astro: la lista FP es solo lectura.

## Meta

Subir PDF/JPG/PNG + completar proveedor y líneas → FP borrador con adjunto → **Publicar**. Sin OCR ni integración automática WhatsApp/Gmail.

## Alcance

| Incluye | No incluye |
|---------|------------|
| Alta FP (`in_invoice`) multi-línea | OCR / extracción automática |
| Adjunto obligatorio (PDF/JPG/PNG, máx. 10 MB) | WhatsApp/Gmail API |
| Origen opcional: WhatsApp \| Mail \| Otro | Emisión AFIP / CAE |
| Ver/descargar comprobante en ficha | Matching automático a OC |
| Publicar draft (`action_post`) | Edición post-publicado desde shell |
| Campo `sg_bill_source` en `account.move` | Reemplazo de adjunto en esta entrega |

## Glosario

- **FP** = Factura de proveedor (`account.move` / `in_invoice`)
- **Comprobante** = archivo adjunto (`ir.attachment`) ligado a la FP
- **Origen** = canal por el que llegó el archivo (`sg_bill_source`)

## UX

### Lista `accounting/vendor-bills`

- CTA **Cargar FP** → `/lists/accounting/vendor-bills/new`

### Alta

1. Origen (select opcional): WhatsApp / Mail / Otro.  
2. Archivo obligatorio (PDF, JPG, PNG).  
3. Proveedor (picker `purchase/vendors`).  
4. Líneas (≥1): producto, cantidad, precio.  
5. Guardar → create draft + adjunto → redirect a ficha.

### Ficha

- Campos existentes + origen (si hay) + bloque **Comprobante** (ver/descargar).  
- Si `state = draft`: **Publicar**.

### Copy

| Caso | Mensaje |
|------|---------|
| Sin archivo | `Adjuntá el PDF o la foto del comprobante` |
| MIME inválido | `Usá un archivo PDF, JPG o PNG.` |
| > 10 MB | `El archivo es demasiado grande (máx. 10 MB).` |
| Hint alta | Adjuntá el PDF o la foto que llegó por WhatsApp o mail. |

## Flujo

```text
Cargar FP → archivo + proveedor + líneas [+ origen]
                ↓
    create account.move in_invoice draft
                ↓
    create ir.attachment (res_model=account.move)
                ↓
         ficha: ver/descargar + Publicar
                ↓
           action_post → posted
```

Si el adjunto falla tras create: unlink de la FP y error (no éxito silencioso).

## Técnica

### Create (Astro BFF)

- Extender `invoice-creates.ts` con listKey `accounting/vendor-bills`:
  - `move_type: in_invoice`
  - `requireAttachment: true`
  - vals: `partner_id`, `invoice_line_ids`, `sg_bill_source` (opcional)
- Payload: `partnerId`, `lines`, `attachment: { filename, mimetype, content }`, `billSource?`
- Validación archivo en `bill-attachment.ts` (magic bytes PDF/JPEG/PNG, 10 MB)
- Adapter: create move → create `ir.attachment` con `datas` base64; rollback unlink si falla

### Campo Odoo

- `account.move.sg_bill_source` Selection: `whatsapp` | `mail` | `other` (nullable)
- Módulo `servigas_core` (bump versión)

### Publicar

- `record-actions.ts`: `accounting/vendor-bills` → `action_post`, states `["draft"]`
- Sin validación CF/CUIT (solo aplica a `out_invoice` / `out_refund`)

### Descarga

- Enrich `getRecordDetail` para vendor-bills: attachments del move
- `GET /api/attachments/:id` → proxy `/web/content/{id}` con chequeo `res_model=account.move` + `move_type=in_invoice`

### UI

- Reusar `OrderCreateForm` con props de adjunto/origen (sin hints fiscales de cliente)
- `new.astro` + Publicar en `[id].astro`
- Label lista: **Cargar FP**

## No-objetivos

- OCR, APIs de mail/WhatsApp
- AFIP, NC proveedor
- Reemplazar adjunto post-create (backlog)
- Editar líneas post-publicado

## Verificación

- Unit: filter create FP; rechazo sin archivo / MIME / sin líneas; origen opcional
- Unit adapter: create `in_invoice` + attachment; unlink si attachment falla
- UI source: new + Publicar + Cargar FP
- Manual: PDF WhatsApp + foto JPG → draft → Publicar

## Éxito

El administrativo carga una FP desde foto/PDF, la ve adjunta en la ficha y la publica desde el shell.

## Alternativas

| Opción | Decisión |
|--------|----------|
| A — Solo form sin archivo | Rechazado: pierde el comprobante original |
| B — Integración WhatsApp/Gmail | Diferido: fricción/infra alta |
| C — Subir + form + adjunto | **Elegida** |
| Origen en `narration` free-text | Rechazado: selection para reportes simples |
