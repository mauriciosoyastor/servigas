# Design: Bulk marcar Factura Web (P0.4)

**Fecha:** 2026-07-25  
**Estado:** approved (implementación)  
**Repo:** servigas  

## Meta

En la cola `accounting/factura-web-pending`, marcar N FC como cargadas en un click (con confirmación).

## Comportamiento

| Pieza | Detalle |
|-------|---------|
| UI | Checkboxes por fila + “Seleccionar página” + botón “Marcar seleccionadas” |
| Confirm | `¿Marcar N facturas como cargadas en Factura Web?` |
| API | `action: mark_fw_loaded_bulk`, `ids: number[]`, `values.fwNumber?` opcional (mismo para todas) |
| Límite | Máx. 100 ids por request |
| Criterio | Solo `out_invoice` + `posted` + `sg_fw_loaded=false`; el resto se omite (skipped) |

## Analogía

Exportás el CSV, cargás en Factura Web, volvés y tachás la pila entera — no ticket por ticket.

## Fuera de alcance

Sync automática · AFIP · número FW distinto por fila en el bulk (usar ficha individual).
