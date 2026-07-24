# Design: FC create + publicar con destino CF/CUIT (fase 2a)

**Fecha:** 2026-07-24  
**Estado:** draft (pendiente revisión humana)  
**Repo:** servigas (`web/`, helpers en `servigas_core` ya con `sg_invoice_dest`)  
**Padre:** [cf-cuit-invoice-destination](./2026-07-24-cf-cuit-invoice-destination-design.md)  
**Usuario día a día:** administrativo de mostrador

## Problema

Las FC en Astro son solo lectura. El admin no puede crear ni publicar una Factura de Cliente, ni ver el destino fiscal (CF/CUIT) del partner en la ficha de la FC.

## Meta (entrega 2a)

Crear FC manual con líneas, heredar destino del cliente, mostrar badge CF/CUIT, y **Publicar** (`action_post`) con validación fiscal si destino = CUIT.

## Alcance acordado

| Incluye (2a) | No incluye (2a) |
|--------------|-----------------|
| Alta manual FC (`out_invoice`) + líneas | Crear FC desde pedido (entrega **2b**) |
| Destino heredado del partner (solo lectura) | Override de destino en la FC |
| Badge CF/CUIT en lista/ficha FC | AFIP / tipos A-B-C |
| Publicar borrador → posted | Factura Web automatizada |
| Validar CUIT + calle/ciudad al publicar si destino CUIT | Alta NC / FP |
| | Editar líneas post-create en esta entrega |

Arco D completo = **2a (C)** → **2b (B: desde pedido)**.

## Glosario

- **FC** = Factura de cliente (`account.move` / `out_invoice`)
- **CF / CUIT** = destino fiscal del `res.partner` (`sg_invoice_dest`)
- **Publicar** = `action_post` (borrador → publicado)

## UX

### Lista `accounting/customer-invoices`

- CTA **Nueva factura** → `/lists/accounting/customer-invoices/new`
- Columna **Destino fiscal** (badge CF/CUIT vía partner)

### Alta

Patrón: multi-línea como presupuestos (`OrderCreateForm` o hermano).

1. Cliente obligatorio (picker customers).  
2. Al elegir: badge destino; aviso no bloqueante si CUIT incompleto.  
3. Líneas: producto, cantidad, precio.  
4. Guardar → create `account.move` draft → redirect a ficha.

### Ficha

- Campos existentes + **Destino fiscal** (solo lectura, del partner).  
- Si `state = draft`: **Publicar** (`RecordConfirmControl`, label Publicar).  
- Publicar con datos incompletos (destino CUIT): error, no postea.

### Copy

| Caso | Mensaje |
|------|---------|
| CUIT faltante al publicar | `Este cliente es Con CUIT: cargá el CUIT para publicar.` |
| Calle/ciudad faltante al publicar | `Este cliente es Con CUIT: cargá calle y ciudad para publicar.` |

Guardar borrador **no** exige domicilio completo (solo Publicar). Create sí exige cliente + ≥1 línea.

## Flujo

```text
Nueva FC → partner_id + invoice lines → draft
                ↓
         badge CF|CUIT (partner.sg_invoice_dest)
                ↓
         Publicar (action_post)
                ↓
    si dest=cuit: vat + street + city OK → posted
    si no → 400 con copy
```

## Técnica

### Create

- Extender patrón `order-creates` (o módulo hermano `invoice-creates.ts`) para listKey `accounting/customer-invoices`:
  - model `account.move`
  - vals: `move_type: out_invoice`, `partner_id`, `invoice_line_ids` como comandos `[0,0,{product_id, quantity, price_unit}]`
- `canCreateRecord` / list CTA deben reconocerlo.
- Reusar picker de productos/clientes del form de cotizaciones donde se pueda.

### Publicar

- `record-actions.ts`:  
  - keys: `accounting/customer-invoices`, `accounting/drafts` (si el detalle de borrador FC usa esa lista), `accounting/receivable` no confirma.  
  - Preferencia: action en listKeys cuyo detail sea FC cliente draft: `accounting/customer-invoices` y `accounting/drafts` cuando `move_type` out_invoice (si drafts mezcla in/out, validar tipo en adapter antes de post).
- method: `action_post`
- confirmableStates: `["draft"]`
- En `confirmRecord` (odoo-adapter): si listKey es FC, cargar partner del move y correr validación destino antes de `action_post`.

### Badge / campo derivado

- En `getRecordList` / `getRecordDetail` para `account.move` de cliente: batch-read partners `sg_invoice_dest` y exponer en row/fields como `sg_invoice_dest` (valor `cf`|`cuit`).
- UI: `RecordTable` / `RecordDetailBody` ya saben formatear `sg_invoice_dest`.

### Validación compartida

Extender `invoice-dest.ts`:

- `publishInvoiceDestError(partner: { sg_invoice_dest, vat, street, city }): string | null`
- Mensajes de publicar (distintos al de “guardar” partner de fase 1).

## No-objetivos 2a

- 2b Crear FC desde `sales/to-invoice`
- Pagos desde Astro, NC, FP
- AFIP / Factura Web auto
- Checksum CUIT / IIBB

## Verificación

- Unit: filter create FC; publish CF ok; publish CUIT sin vat falla; sin street/city falla.
- Unit/UI: new page + Publicar + columna destino.
- Manual (si hay Odoo): create + post en `servigas_dev`.

## Éxito

Admin crea FC con líneas, ve CF/CUIT, publica solo cuando el partner CUIT tiene vat + domicilio; CF publica sin CUIT.

## Entrega 2b (backlog inmediato)

- En ficha/lista de pedidos a facturar: acción **Crear FC** (wizard Odoo `_create_account_invoices` / equivalente 19) heredando partner y líneas.
- Misma validación de publicar (o post automático según comportamiento nativo; documentar en plan 2b).

## Alternativas

| Opción | Decisión |
|--------|----------|
| Solo header sin líneas | Rechazado: FC inútil para mostrador |
| Exigir domicilio también al guardar borrador | Rechazado: fricción; se exige al publicar |
| D completo (2a+2b) en un solo PR | Diferido: secuencial acordado |
