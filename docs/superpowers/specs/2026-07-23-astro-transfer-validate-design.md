# Design: Validar / recibir transferencias (stock.picking)

**Fecha:** 2026-07-23  
**Estado:** approved (gap P1-4 camino a corte)  
**Repo:** servigas / `web/`

## Problema

La ficha de transferencia es solo lectura. Tras confirmar una RFQ/OC, no se puede recibir mercadería desde Astro.

## Decisión

1. Allowlist acción en `inventory/transfers` (estados `confirmed` | `waiting` | `assigned`).
2. En adapter (`stock.picking`):
   - `confirmed`/`waiting` → `action_assign`
   - poner `quantity = product_uom_qty` en movimientos si hace falta
   - `button_validate` con context `cancel_backorder`
3. UI: `RecordConfirmControl` “Validar recepción” cuando el estado lo permite.
4. Si tras validar el estado no es `done` → error claro (asistente/parcial).

## No-objetivos

- Backorders parciales con UI
- Crear transferencias nuevas
- Inventario físico / ajustes
