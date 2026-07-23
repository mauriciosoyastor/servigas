# Spec — Alta producto + confirmar pedido/OC

**Fecha:** 2026-07-22  
**Estado:** approved (corrida automática)

## 1) Alta mínima producto

- Lista: `inventory/products` (`product.template`)
- Create: `name` (req), `default_code`, `list_price` + defaults `sale_ok`, `is_storable`
- Archive: `active=false`
- UI: `/lists/inventory/products/new`, CTA, Archivar en ficha

## 2) Confirmar pedido / OC

- Allowlist actions: `sales/quotations`, `purchase/rfq`, `purchase/rfq-draft`, `purchase/rfq-sent`
- BFF: `confirmRecord` → `action_confirm`
- UI: botón en ficha si `state` ∈ {draft, sent}

## No-objetivos

- Variantes / BOM / fotos en create  
- Cancelar / facturar / recibir stock  
- Create completo de sale.order / purchase.order
