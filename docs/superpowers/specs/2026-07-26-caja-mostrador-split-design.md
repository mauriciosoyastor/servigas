# Spec — Separar Caja y Mostrador (sesión disciplinada)

**Fecha:** 2026-07-26  
**Estado:** implementado

## Decisiones

- **Mostrador** = ventas POS en `/pos`.
- **Caja** = hub `/caja` con apertura/cierre, ingreso/egreso manual y listado unificado.
- **Candado fuerte:** hace falta `sg.cash.session` en estado `open` para entrar a `/pos` y para `POST /api/pos/checkout`.
- **Entrada UI (v1):** ops-strip del inicio con dos botones (`Mostrador`, `Caja`). Sin ítem nuevo en el rail.
- **Persistencia:** modelos `sg.cash.session` + `sg.cash.movement` en `servigas_core` (no reutilizar `pos.session` como caja del día).

## Done

1. Split ops-strip: Mostrador → `/pos`, Caja → `/caja`.
2. Hub `/caja`: abrir, ingreso/egreso, cerrar con conteo, feed unificado, efectivo esperado.
3. Candado en `/pos` (UI) + checkout BFF.
4. Copy: hubs “Ir al mostrador”, H1 Mostrador, tour actualizado.
5. Feed: movimientos manuales + pagos POS + `account.payment` del rango de la sesión.

## No-objetivos (v1)

- Multi-caja / multi-sucursal
- Denominaciones de billetes
- Ticket de cierre impreso
- Permisos por rol finos

## Seams

| Seam | Test |
|------|------|
| `cash-feed` merge/summary | `tests/cash-feed.test.mjs` |
| Adapter open/hub/gate checkout | `tests/odoo-adapter.test.mjs` |
| UI contracts index/pos/caja/hubs | `tests/shell-ui.test.mjs` |
| APIs `/api/caja/*` | rutas + smoke manual |

## Efectivo esperado

`opening_balance + cash in − cash out`  
(POS cash + cobros cash + manual in) − (pagos cash + manual out).  
Transferencia/tarjeta aparecen en el feed pero no mueven el esperado.
