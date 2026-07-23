# Design: POS checkout fail-loud (sin fallback sale.order)

**Fecha:** 2026-07-23  
**Estado:** approved (gap P0-3 camino a corte)  
**Repo:** servigas / `web/`

## Problema

Si `#checkoutPosOrder` falla, `checkoutPosCart` crea un `sale.order` silencioso (`CAJA-ASTRO`) y la UI muestra “Venta registrada”. Eso miente sobre el canal de caja.

## Decisión

1. Eliminar `#checkoutSaleOrderFallback`.
2. Si el cobro POS falla: propagar `BffError` (código `checkout_failed` salvo `unauthorized`).
3. `PosCheckoutResult.channel` solo `"pos.order"`.
4. Recibo UI solo tras HTTP 200 (ya es así); quitar copy “Pedido” residual.

## No-objetivos

- Arreglar apertura multi-caja
- IVA / cliente en POS
- Redis / session store
