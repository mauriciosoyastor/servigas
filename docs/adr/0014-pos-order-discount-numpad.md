# ADR 0014 — Descuento general en numpad del Mostrador

**Estado:** Aceptado  
**Fecha:** 2026-07-20  
**Proyecto:** Servigas (Odoo 19 Community)

## Contexto

El Mostrador ya tiene `%` (descuento por línea vía `manual_discount`). El vendedor necesita un **descuento general en %** sobre el total, como línea aparte en el ticket, con botón **Desc.** debajo de Precio.

ADR 0005 / 0012 evitan parches OWL del POS. Exponer ese botón en el numpad exige un patch acotado.

## Decisión

1. Depender de **`pos_discount`** (Community) y reutilizar `PosStore.applyDiscount` + NumberPopup.
2. Patch OWL de **`ProductScreen`** (`sg_product_screen_order_discount.js`) que:
   - arma un numpad 5×4 con **Desc.** bajo Precio (`sg_pos_order_discount.js`);
   - al tocar Desc. abre el popup nativo y llama `pos.applyDiscount(percent)`.
3. Config: `module_pos_discount`, producto «Descuento general», `discount_pc` default 10 — vía `hooks._ensure_pos_order_discount` + `datos/import/configurar_pos.py`.
4. Tema: superficie `order-discount-control` → `.pos .numpad-order-discount` (mismo rol `discount` que el `%` de línea).

### Separación

| Control | Alcance |
|---------|---------|
| `%` | Línea seleccionada |
| **Desc.** | Pedido completo (línea de producto descuento) |

## Consecuencias

### Positivas

- Misma contabilidad/impuestos que Acciones → Discount.
- Upgrade-safe en el cálculo; el seam frágil es solo el layout del numpad.

### Negativas / riesgos

- Patch OWL: si Odoo cambia `getNumpadButtons` / Numpad, hay que ajustar.
- Numpad 5×4 fuerza `numpad-5-cols` → override SCSS a 4 columnas.

### No-hacemos

- Monto fijo ($)
- Reescribir el motor de descuento
- Quitar el botón Discount del menú Acciones (sigue disponible)

## Referencias

- Spec: `docs/superpowers/specs/2026-07-20-pos-order-discount-design.md`
- ADR 0005, 0012
- Código: `sg_pos_order_discount.js`, `sg_product_screen_order_discount.js`
