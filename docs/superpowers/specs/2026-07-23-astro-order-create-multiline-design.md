# Design: Alta cotización / RFQ multi-línea

**Fecha:** 2026-07-23  
**Estado:** approved (gap P0-4 camino a corte)  
**Repo:** servigas / `web/`

## Problema

El create solo acepta `partnerId + productId + qty` (una línea). Una cotización/RFQ de mostrador necesita varias líneas, precio y % de descuento.

## Decisión

1. Payload: `{ partnerId, lines: [{ productId, qty, price?, discount? }] }`.
2. Compat: si llega `productId`+`qty` sin `lines`, se normaliza a una línea.
3. Odoo `order_line`: N comandos `[0,0,{…}]` con `price_unit` / `discount` opcionales.
4. UI: picker de producto + qty/precio/% + “Agregar línea” + lista editable.
5. Incluir `list_price` en campos de `inventory/variants` para prefijar precio.

## No-objetivos

- Editar borrador existente
- Impuestos / totales fiscales en el form
- Multi-línea en POS (ya tiene carrito)
