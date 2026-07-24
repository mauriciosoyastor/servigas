# Design: Medio de pago al cobrar / pagar

**Fecha:** 2026-07-24  
**Estado:** approved (implementación)  
**Fuera de alcance:** AFIP / emisión electrónica; PDF de comprobantes (ver PR de PDF embebido)

## Meta

Elegir medio al registrar cobro/pago: **Efectivo** · **Transferencia** · **Tarjeta**.

## Medio de pago

UI enum → diario Odoo (`account.journal`):

| UI | Resolución |
|----|------------|
| `cash` | `type=cash` (primer activo) |
| `transfer` | `type=bank`, preferir nombre ~ transferencia |
| `card` | `type=bank`, preferir nombre ~ tarjeta/card; si no, primer bank |

Wizard: `account.payment.register` create con `journal_id` (+ `amount` opcional).  
Default UI: `cash` en cobros. Obligatorio elegir uno válido.

## Verificación

Unit: filter `paymentMethod`, helpers `pickJournalId`.  
Adapter mocks: wizard con `journal_id`.  
`npm test`
