# Design: IVA y centavos en totales POS Astro

**Fecha:** 2026-07-23  
**Estado:** approved (gap P1-6 camino a corte)  
**Repo:** servigas / `web/`  
**Base:** `cursor/astro-pos-checkout-customer-daee` (#19)

## Problema

1. **Centavos:** la caja formatea ARS con `maximumFractionDigits: 0` → se pierden los centavos en catálogo, ticket y recibo.
2. **IVA:** el checkout escribe `amount_tax: 0` y `price_subtotal_incl === price_subtotal`. Los `list_price` del maestro son **sin IVA** (listas de import); el ticket no desglosa ni cobra el impuesto de `taxes_id`.

## Analogía

Hoy el ticket redondea al peso entero y finge que no hay IVA.  
Después: se ven los centavos y el ticket muestra Subtotal → IVA → Total, alineado con los impuestos del producto en Odoo.

## Decisión

1. Helper `roundCents` + montos de línea/ticket a 2 decimales.
2. Catálogo lee `taxes_id`; resuelve `account.tax` (`amount` percent, `price_include`).
3. Cada línea del carrito lleva `taxRate` + `priceIncludesTax`.
4. UI ticket: filas **Subtotal**, **IVA**, **Total** con formato ARS a 2 decimales (catálogo igual).
5. Checkout recalcula IVA desde impuestos del producto en Odoo (fuente de verdad) y escribe `amount_tax`, `price_subtotal`, `price_subtotal_incl`, `amount_total`.
6. Respuesta checkout incluye `amountTax` + `amountUntaxed` para el recibo.

## No-objetivos

- Múltiples impuestos compuestos / grupos fiscales avanzados (solo suma de `%` sale)
- Retenciones / percepciones ARCA
- Cambiar precios del maestro a “con IVA”
- Fail-loud del fallback `sale.order` (sigue en #14)
