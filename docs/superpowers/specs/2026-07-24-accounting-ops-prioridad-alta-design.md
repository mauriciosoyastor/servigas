# Design: Contabilidad operativa prioridad alta (pagos, NC, FP, vencimientos)

**Fecha:** 2026-07-24  
**Estado:** approved (implementación)  
**Repo:** servigas (`web/`, `custom_addons/servigas_core`)  
**Usuario día a día:** administrativo de mostrador  

## Problema

El hub Contabilidad consulta FC/FP/NC/pagos, y ya se puede crear/publicar FC con destino CF/CUIT. Falta cerrar el circuito operativo en Astro:

1. Cobrar / pagar una factura publicada (parcial o total)
2. Crear/publicar notas de crédito (NC)
3. Crear/publicar facturas de proveedor (FP)
4. Ver vencimientos (hoy / semana / vencidas)

## Meta

Que el administrativo registre cobros/pagos, NC y FP sin salir del shell Astro, y priorice mora con un semáforo de vencimientos.

## Analogía

| Pieza | Analogía |
|-------|----------|
| Publicar FC | Firmar la factura |
| Registrar pago | Tachar “pagado” (o “a cuenta”) |
| NC | Nota que anula/descuenta |
| FP | Factura que te pasa el proveedor |
| Aging | Pilas: vence hoy / esta semana / ya venció |

## Alcance

### 1. Registrar pago

- Desde ficha FC o FP publicada con saldo (`not_paid` / `partial` / `in_payment`)
- Monto editable (default = residual); parcial o total
- BFF: wizard Odoo `account.payment.register` + `action_create_payments`
- Allowlist listKeys: `customer-invoices`, `receivable`, `vendor-bills`, `payable`

### 2. NC create + publicar

- Misma forma multi-línea que FC (`OrderCreateForm`)
- `move_type = out_refund`
- Publicar con validación CF/CUIT (igual que FC)

### 3. FP create + publicar

- Forma multi-línea; partner = proveedor
- `move_type = in_invoice`
- Publicar sin check CF/CUIT (destino es de FC)

### 4. Vencimientos / aging

Listas Astro + cards hub:

| Bucket | Dominio conceptual |
|--------|--------------------|
| Vence hoy | `invoice_date_due = hoy` + unpaid |
| Vence esta semana | `hoy ≤ due ≤ hoy+7` + unpaid |
| Vencidas | `due < hoy` + unpaid |

Ámbitos: por cobrar (`out_invoice`) y por pagar (`in_invoice`).

Hub: extender `metric_date_scope` con `due_today` / `due_week` / `overdue`.

## No-objetivos

- Emisión AFIP / Factura Web automática
- NC proveedor create (solo lectura)
- Conciliación bancaria / extractos
- IIBB

## Verificación

- Unit: allowlists, filter create NC/FP, aging domains, payment amount filter
- Adapter mocks: create NC/FP, register payment wizard, reject invalid amount
- UI source tests: new pages, Publicar, Registrar pago
- `npm test` en `web/`
