# Spec — Cobro de OT en caja (opción C)

**Fecha:** 2026-08-04  
**Estado:** reinforced (anti doble cobro + link historial + tests adapter)
**Pantallas:** ficha `/lists/workshop/orders/:id`, feed `/caja`

## Problema

El importe de la OT no entra al feed de caja. Hay que registrar cobro explícito (no al cerrar la OT).

## Diseño

1. Motivo de ingreso `cobro_ot` → “Cobro orden de trabajo”.
2. En ficha OT: panel “Registrar cobro” (monto default = `amount`, medio efectivo/transferencia/tarjeta).
3. `POST /api/workshop-orders/collect-cash` con caja abierta; crea `sg.cash.movement` con `medium` + `work_order_id`.
4. Feed: label “Taller · OT…”, `href` a la ficha, `medium` real (solo efectivo mueve esperado).

## No-objetivos

- Auto-cobro al cerrar OT
- Factura / `account.payment`
- Múltiples cobros parciales con saldo tracked (sí se permite registrar N veces; sin ledger de saldo)
