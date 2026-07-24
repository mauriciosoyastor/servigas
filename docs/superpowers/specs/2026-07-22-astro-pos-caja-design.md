# Spec — Caja POS Astro (Mostrador lite)

**Fecha:** 2026-07-22  
**Estado:** en implementación (sin gate de OK; corrida automática)

## Pantalla

`/pos` — caja de mostrador nativa Astro (no iframe Odoo).

## Done

1. Ver productos vendibles (nombre, precio, thumb si hay).
2. Buscar por nombre/código.
3. Armar carrito (alta/baja/cantidad).
4. Ver total.
5. Registrar venta vía BFF (pedido POS o error claro si no hay sesión).
6. Link a historial `/lists/sales/pos-orders`.

## No-objetivos

- Pago multi-método / recibo térmico / offline
- Descuentos avanzados / escalas
- Multi-caja con selector complejo (usar primera `pos.config` activa)
- Parches OWL del POS nativo

## Seams

| Seam | Test |
|------|------|
| Cart puro | add/setQty/remove/total |
| Adapter catalog/checkout | search_read + write_kw write/create |
| API | 401 sin sesión; allowlist |
| UI | `/pos` usa BFF + carrito |
