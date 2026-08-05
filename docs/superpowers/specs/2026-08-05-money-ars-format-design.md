# Spec ÔÇö Formato de montos ARS en el shell Astro

**Fecha:** 2026-08-05  
**Estado:** aprobado (dise├▒o)  
**Alcance:** solo shell web Astro (puerto 4321)

## Problema

Los montos de dinero se muestran y se cargan de forma inconsistente: a veces `toLocaleString('es-AR')` con currency, a menudo n├║mero crudo, y los inputs usan `type="number"` sin `$` ni separadores. En mostrador argentino se espera `$ 1.234,50` tanto al ver como al tipear.

## Decisiones

| Tema | Decisi├│n |
|------|----------|
| D├│nde | Ver **y** cargar (display + inputs) |
| Decimales | Siempre **2** |
| M├íscara al tipear | **Centavos desde la derecha** (`1` ÔåÆ `$ 0,01`, `1234` ÔåÆ `$ 12,34`) |
| Alcance | Solo shell Astro; no Odoo nativo `:8070` |
| API / BFF | Sin cambio de contrato: siempre `number`, nunca el string formateado |

## Dise├▒o

### 1. N├║cleo

Archivo: `web/src/lib/money/ars.ts`

- `formatArs(value: number): string` ÔåÆ `$ 1.234,50` (locale `es-AR`, currency ARS, 2 decimales).
- `parseArs(text: string): number | null` ÔåÆ acepta `$`, espacios, puntos de miles y coma decimal; tambi├®n normaliza pegado con punto decimal ingl├®s cuando es inequ├¡voco; `null` si inv├ílido.
- Tests: `web/tests/money-ars.test.mjs`.

Misma fuente de verdad para display, confirmaciones (`confirm(...)`) y parse previo al submit.

### 2. Input enmascarado

- Marcador: `data-money-input` en inputs de dinero (pasar de `type="number"` a `type="text"` + `inputmode="decimal"`).
- Script compartido de init (cliente) que:
  1. Interpreta d├¡gitos como centavos desde la derecha.
  2. Reformatea en vivo con `formatArs`.
  3. Expone el valor num├®rico (p. ej. `data-money-value` o input hidden) para submit/fetch.
- Negativos: no permitidos en estos campos.
- Vac├¡o / solo `$`: inv├ílido si el campo es required; si no, omitir/`null` seg├║n el formulario actual.
- Pegar texto (`1234,5`, `$ 1.234,50`, `1234.50`): normalizar v├¡a `parseArs` y re-aplicar m├íscara.

### 3. Display

Usar `formatArs` en:

- Caja (saldos, movimientos, historial, confirmaciones de cierre).
- POS (precios / totales que hoy formatean a mano).
- OT cobro (cobrado / restante / confirm).
- Tablas y fichas: campos de dinero conocidos (`list_price`, `standard_price`, `amount`, `amount_total`, `amount_residual`, `amount_collected`, `price_unit`, `price_subtotal`, y equivalentes).

**No aplicar** a: cantidades (`qty*`), porcentajes (`discount`), stock, fechas, IDs, contadores de registros.

### 4. Lugares a cablear (inputs)

| Flujo | Campos |
|-------|--------|
| Caja | monto apertura, ingreso, egreso, contado cierre, dep├│sito, float |
| OT | monto de cobro en caja |
| Facturas | monto de pago |
| Crear OT | `amount` |
| Pedidos (SO/PO) | precio de l├¡nea en draft |
| Productos | `list_price` (crear / editar ficha) |

### 5. Flujo

```text
Usuario tipea d├¡gitos
  ÔåÆ m├íscara centavos-desde-la-derecha
  ÔåÆ texto visible: formatArs
  ÔåÆ al submit: parseArs ÔåÆ number
  ÔåÆ BFF / API (contrato actual)
```

## No-objetivos

- Pantallas Odoo nativas (`:8070`).
- Cambiar import CSV de lista de precios (ya tiene `parsePrice`; no es input UI campo a campo).
- Formatear cantidades, descuentos % ni stock.
- Soporte de monedas distintas de ARS.
- Librer├¡as externas de m├íscara (Cleave/IMask).

## Tests / verificaci├│n

1. Unit `formatArs` / `parseArs` (ARS, vac├¡o, inv├ílido, pegado mixto).
2. Unit/light de la m├íscara d├¡gito a d├¡gito (centavos).
3. Ajuste e2e de caja/pagos: helper que complete el money input (fill formateado o set del valor num├®rico v├¡a la API del widget).
4. Smoke manual: caja (open/move/close), cobro OT, precio producto.

## Criterios de ├®xito

- Todo monto de dinero visible en el shell Astro se ve como `$ X.XXX,XX`.
- Todo input de dinero del listado de ┬º4 usa m├íscara en vivo centavos-desde-la-derecha.
- Ning├║n endpoint recibe el string formateado; solo `number`.
- Cantidades / % / stock sin cambio visual de ÔÇ£monedaÔÇØ.
