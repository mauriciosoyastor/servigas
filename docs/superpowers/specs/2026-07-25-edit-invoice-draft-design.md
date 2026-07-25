# Design: Editar borrador FC/FP/NC (P1.2)

**Fecha:** 2026-07-25  
**Estado:** approved  
**Repo:** servigas (`web/`)

## Meta

Editar partner + líneas de un `account.move` en `draft` desde Astro, antes de publicar.

## Comportamiento

| Pieza | Detalle |
|-------|---------|
| Listas | `customer-invoices`, `credit-notes`, `vendor-bills`, `vendor-refunds` (+ `drafts` si move_type matchea) |
| Guard | Solo `state === draft` y `move_type` del allowlist |
| Payload | Mismo shape que create: `partnerId` + `lines[{productId,qty,price?,discount?}]` |
| Odoo write | `partner_id` + `invoice_line_ids: [[5,0,0], ...[0,0,vals]]` (replace all) |
| FP | Update **no** exige reenviar adjunto |
| Posted | 400, no escribe |

## API

`POST /api/records/{listKey}`  
`{ action: "update_invoice_draft", id, values }`

## UI

Ficha draft → **Editar borrador** → form prefilled (reuso OrderCreateForm / página edit) → Guardar → ficha.

## Fuera de alcance

Adjunto FP en edit · impuestos manuales · fechas · anular posted · AFIP.

## Criterios

1. Draft FC: cambiar partner/líneas → OK al recargar  
2. Posted → validation_error  
3. FP draft sin attachment en update → OK  
4. Tests helpers + adapter + UI wired  
