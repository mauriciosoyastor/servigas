# Plan — Separar Caja y Mostrador

## Tasks

- [x] Spec
- [x] Modelos Odoo `sg.cash.session` + `sg.cash.movement`
- [x] Dominio `cash-feed` + tests
- [x] Adapter + gate checkout
- [x] APIs `/api/caja/*`
- [x] UI `/caja` + split ops-strip
- [x] Candado `/pos` + copy hubs/tour
- [x] Suite tests
- [x] Smoke E2E stack local (`node scripts/smoke-caja.mjs`)

## Smoke

1. Upgrade `servigas_core` en Odoo `:8070`
2. Abrir http://127.0.0.1:4321 → botones Mostrador y Caja
3. `/pos` bloqueado sin caja
4. `/caja` abrir con monto → `/pos` disponible
5. Cobrar → movimiento en feed
6. Egreso manual → esperado baja
7. Cerrar con contado → `/pos` bloqueado otra vez
