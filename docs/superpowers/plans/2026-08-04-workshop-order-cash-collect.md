# Plan — Cobro OT → caja (opción C)

**Goal:** Registrar cobro desde ficha OT hacia la caja abierta.

## Done

- [x] Motivo `cobro_ot`
- [x] Helpers + tests `workshop-order-cash`
- [x] Campos `medium` + `work_order_id` en `sg.cash.movement`
- [x] `collectWorkOrderCash` + API `/api/workshop-orders/collect-cash`
- [x] Feed con label/href taller
- [x] UI `RecordWorkOrderCashControl` en ficha OT
- [x] `npm test` 506 pass + `-u servigas_core`
