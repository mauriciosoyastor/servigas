# Plan — Caja POS Astro

## Tasks

- [x] Spec
- [x] TDD cart puro
- [x] TDD adapter getPosCatalog + checkout
- [x] API `/api/pos/*`
- [x] UI `/pos` caja
- [x] Checkout `pos.order` + sesión abierta + pago Cash
- [x] Selector Cash/Card (`paymentMethodId`)
- [x] Descuento % por línea
- [x] Recibo post-venta + Desc. % en ficha
- [x] Suite + smoke

## Smoke

- Config: Mostrador Servigas (sesión abierta o auto-open)
- Checkout Cash: `Mostrador Servigas - 000002` (`channel: pos.order`)
- Checkout Card + 10% desc.: `Mostrador Servigas - 000004` (`paymentMethodId: 2`, `amountTotal: 68.72`)
- Recibo API: `paymentMethodName: Card`
- Ficha: columna Desc. % visible
- Historial `/lists/sales/pos-orders` incluye el pedido

## Fallback

Si falla POS → `sale.order` (`CAJA-ASTRO`).
