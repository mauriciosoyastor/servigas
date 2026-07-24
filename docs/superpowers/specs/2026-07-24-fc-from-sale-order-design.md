# Design: Crear FC desde pedido a facturar (fase 2b)

**Fecha:** 2026-07-24  
**Estado:** approved (implementación)  
**Padre:** [fc-create-publish-destino 2a](./2026-07-24-fc-create-publish-destino-design.md)  
**Repo:** servigas / `web/`

## Meta

Desde un pedido de venta con `invoice_status = to invoice`, el admin crea una **FC borrador** (cliente + líneas heredadas) y luego publica con el flujo 2a.

## UX

- Ficha pedido (`/lists/sales/orders/:id`, también llegada desde `to-invoice`): botón **Crear FC** si `invoice_status === "to invoice"`.
- Al éxito: redirect a ficha de la FC creada.
- Publicar sigue en la FC (validación CF/CUIT de 2a).

## Técnica

- Nueva acción BFF allowlist `create_invoice` (no método libre desde el browser).
- Adapter: wizard `sale.advance.payment.inv` con contexto `active_model=sale.order`, `active_ids=[id]`, `advance_payment_method=delivered` → `create_invoices`; resolver id de `account.move` resultante.
- Fallback documentado si el wizard falla: mensaje claro ES-AR.

## No-objetivos

- Multi-pedido, auto-post, AFIP, POS→FC directo.
