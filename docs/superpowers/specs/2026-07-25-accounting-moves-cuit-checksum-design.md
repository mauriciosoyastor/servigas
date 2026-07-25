# Design: Todos los asientos + checksum CUIT (P0.1 + P0.2)

**Fecha:** 2026-07-25  
**Estado:** approved  
**Repo:** servigas (`web/`, `custom_addons/servigas_core`)

## Problema

1. La card hub **Todos los asientos** resuelve mal a CxC (`receivable`).
2. Destino **Con CUIT** acepta cualquier texto no vacío; el checksum AFIP no se valida.

## Meta

- Hub → lista real de asientos publicados (todos los `move_type`).
- Destino CUIT: bloquear CUIT inválido al guardar/publicar.
- Destino CF + texto inválido en `vat`: **aviso** no bloqueante (opción C).

## Alcance

### P0.1

- Lista allowlisted `accounting/moves` (`account.move`, `state=posted`).
- `LABEL_RULES` + `ROUTE_RULES` + `isAmbiguousDomain` para no caer al fallback `receivable`.
- Detalle genérico `/lists/accounting/moves/:id`.

### P0.2

- Módulo `web/src/lib/shell/cuit.ts` (normalizar + checksum).
- Enganche en `invoiceDestVatError` / `publishInvoiceDestError` / warning helpers.
- Constraint Odoo: destino CUIT exige CUIT con checksum válido.
- CF con `vat` basura: no bloquea en Odoo ni BFF; Astro puede avisar.

## Fuera de alcance

AFIP emisión, bulk Factura Web, IIBB, validación estricta de proveedores.

## Criterios de aceptación

1. `resolveRecordListPath` con label «Todos los asientos» o domain `state=posted` sin `move_type` → `/lists/accounting/moves`.
2. Destino CUIT + CUIT checksum inválido → error al guardar cliente / al publicar FC.
3. Destino CF + CUIT inválido → no error de bloqueo; warning helper true.
4. Destino CUIT + vacío → sigue el mensaje actual de requerido.
5. Tests unitarios en verde.
