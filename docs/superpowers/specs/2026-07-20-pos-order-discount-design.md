# Diseño — Descuento general en el Mostrador (POS)

**Fecha:** 2026-07-20  
**Estado:** Aprobado (conversación)  
**Proyecto:** Servigas (Odoo 19 Community)  
**Extiende:** ADR 0005 / 0012 (tema POS); excepción OWL acotada (ADR a redactar en implementación)

## Resumen

Agregar un botón **Desc.** en la columna derecha del numpad (debajo de **Precio**) para aplicar un **descuento general en porcentaje** sobre el total del pedido. Se reutiliza la mecánica nativa de descuento global de Odoo 19 (producto de descuento + línea en el ticket); el trabajo custom es exponer esa acción en el numpad y estilarla con Liquid Glass.

El botón **`%`** existente sigue siendo descuento **por línea**.

## Decisiones de producto

| Tema | Elección |
|------|----------|
| Tipo | Porcentaje sobre el total del pedido |
| Convivencia con `%` de línea | Se apilan (general + líneas) |
| Presentación en ticket | Una **línea aparte** (“Descuento general X%”) |
| Ubicación UI | Columna derecha del teclado, debajo de **Precio** |
| Reaplicación | Un solo descuento general por ticket; volver a aplicar **reemplaza** esa línea |
| Monto fijo ($) | Fuera de alcance |
| Listas de precio / descuento por rol | Fuera de alcance |

## Comportamiento

1. El vendedor carga productos (puede aplicar `%` por línea).
2. Toca **Desc.** → popup nativo de porcentaje.
3. Confirma un % válido (0–100) → aparece/actualiza la línea de descuento general y baja el total.
4. Puede cobrar con total ya descontado.
5. Ticket vacío: no aplica (bloqueo o mensaje corto nativo).
6. Producto/feature de descuento global no configurado: fallo controlado (aviso/config), sin romper el POS.

## Arquitectura

```
pos.config (global discount ON + discount product)
        ↓
patch OWL numpad → botón Desc. → acción nativa apply global discount
        ↓
orderline de descuento (nativa) en el ticket
        ↓
sg_pos_theme + servigas_pos.scss (superficie del botón)
```

| Pieza | Rol |
|-------|-----|
| Config / datos | Activar descuento global en el POS «Mostrador Servigas» y asignar producto “Descuento general” vía `datos/import/configurar_pos.py` (y hook de módulo si hace falta para que quede persistente al instalar). |
| Patch OWL numpad | Único seam custom de UI: botón **Desc.** debajo de Precio que dispara el flujo nativo de % global (mismo que Acciones → Descuento). |
| Motor de cálculo | Nativo Odoo (no reinventar montos ni impuestos). |
| Tema | Superficie `order-discount-control` en `sg_pos_theme.js` + anclas SCSS bajo `.pos`. |
| ADR | Documento hermano: excepción a “sin OWL” de 0005/0012, limitada a este botón → acción nativa. |

### Separación de botones

| Control | Alcance |
|---------|---------|
| `%` (numpad) | Descuento por línea seleccionada |
| **Desc.** (numpad, nuevo) | Descuento general del pedido |

## Flujo de datos

1. Click **Desc.** → abre popup de % (nativo).
2. Confirmación → POS calcula sobre el subtotal actual (después de descuentos de línea) y deja **una** línea de producto descuento.
3. Si el carrito cambia y el vendedor reaplica **Desc.**, se recalcula/reemplaza esa línea (comportamiento nativo).

## Errores y bordes

| Caso | Comportamiento |
|------|----------------|
| Ticket vacío | No aplica |
| % fuera de 0–100 | Validación del popup nativo |
| Producto descuento ausente | Aviso/config; no crash |
| Feature global off | Botón oculto o inactivo |

## Testing

| Capa | Qué verifica |
|------|----------------|
| Config / datos | POS con descuento global ON + producto asignado |
| Contrato tema (Node) | Superficie `order-discount-control` con selector del botón **Desc.** + ancla SCSS |
| Manual Mostrador | 2+ líneas → Desc. 10% → línea aparte y total OK; línea con `%` + general apilados; segundo Desc. reemplaza; ticket vacío seguro |

Sin E2E Playwright obligatorio en este slice.

## Archivos previstos (implementación)

| Archivo | Rol |
|---------|-----|
| Patch OWL numpad (nuevo en `servigas_core` assets POS) | Botón **Desc.** |
| `datos/import/configurar_pos.py` (u hook) | Feature + producto descuento |
| `sg_pos_theme.js` / `sg_pos_theme.test.mjs` / `servigas_pos.scss` | Contrato + skin del botón |
| ADR nuevo + bitácora | Excepción OWL + cierre de verificación |
| Onboarding / shell path (opcional) | Tip a `order-discount-control` si se alinea al tour |

## Fuera de alcance

- Descuento en monto fijo ($)
- Rediseño de pago / recibo
- Fork del POS o client action propia de venta
- Listas de precio automáticas (instalador / mayorista)
- E2E visual obligatorio

## Criterios de hecho

- [ ] **Desc.** visible debajo de Precio en product screen
- [ ] Aplica % global como línea aparte; convive con `%` de línea
- [ ] Reaplicar reemplaza la línea general (no duplica)
- [ ] Config Mostrador deja feature usable sin pasos manuales opacos
- [ ] Tests Node del contrato de superficie en verde
- [ ] ADR de excepción OWL + nota en bitácora / cache bust POS
- [ ] Verificación manual en `/pos/ui`

## Referencias

- CONTEXT.md — descuentos manuales en POS; sin listas automáticas
- ADR 0005 — contrato tema Mostrador
- ADR 0012 — UX POS por fases (sin OWL salvo excepción documentada)
- `datos/import/configurar_pos.py` — `manual_discount` ya habilitado
- Docs Odoo 19 — Global Discounts / Line Discounts en Pricing del POS
