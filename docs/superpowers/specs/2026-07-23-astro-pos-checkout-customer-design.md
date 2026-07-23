# Design: Cliente opcional en cobro POS

**Fecha:** 2026-07-23  
**Estado:** approved (gap P1-2 camino a corte)  
**Repo:** servigas / `web/`

## Problema

`#checkoutPosOrder` fija `partner_id: false`. El mostrador necesita asociar un cliente (Factura Web / seguimiento) sin obligarlo.

## Decisión

1. `PosCheckoutOptions.partnerId?: number` (opcional).
2. Si viene: validar `res.partner` y setear `partner_id` en `pos.order`.
3. Si no: `partner_id: false` (como hoy).
4. Resultado: `partnerId` / `partnerName` para el recibo.
5. UI `/pos`: typeahead clientes vía `GET /api/lists/sales/customers?q=` + limpiar.

## No-objetivos

- Alta de cliente inline
- Lista de precio por partner
- Fallbacks sale.order (otro PR)
