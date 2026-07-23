# Spec — Lenguaje de mostrador (Argentina) en shell Astro

**Fecha:** 2026-07-23  
**Estado:** approved  
**Rama:** `cursor/astro-copy-mostrador-ar-daee`  
**Enfoque:** A — glosario fijo + barrido de copy + renombre de rutas con redirect

## Problema

El shell Astro mezcla español con jerga de producto/Odoo/inglés (`RFQ`, `SKU`, `quants`, `Qty`, `VAT`, `allowlisted`, “camino a corte”, `hub`, `launcher`). Eso frena a un vendedor de mostrador en Argentina.

## Decisión

Adoptar tono **mostrador claro**:

- Español de Argentina con **voseo**.
- Vocabulario de comercio (cotización, pedido a proveedor, caja, existencias).
- Sin jerga técnica ni de migración en pantallas.
- **UI + rutas visibles** renombradas; URLs viejas hacen **redirect** a las nuevas.
- Tiles/cards cuyo texto viene de Odoo **fuera de alcance** de este slice.

## Reglas de voz

1. Preferir “qué hace” sobre “cómo está implementado”.
2. Mantener siglas del rubro: **CUIT**, **IVA**, **OC**, **NC**, **FC** (si ya se usan).
3. Prohibido en UI: RFQ, SKU, POS (como etiqueta suelta), Qty, VAT, quants, KPI, hub, launcher, allowlisted, BFF, Astro, “camino a corte”, nombres de campo Odoo (`list_price`, estado `sale`).
4. Errores: mensaje humano; no mostrar `error.code` al usuario.
5. “Próximamente” puede quedarse; el detalle no menciona Astro/corte.

## Glosario (mínimo obligatorio)

| Hoy | Nuevo |
|-----|--------|
| Nueva RFQ | Nuevo pedido a proveedor |
| Borradores RFQ | Pedidos a proveedor (borrador) |
| RFQ enviadas | Pedidos a proveedor (enviados) |
| Solicitudes abiertas (hint con RFQ) | Pedidos a proveedor abiertos |
| Historial POS | Ventas de caja |
| Pedido POS / Ficha de pedido POS | Venta de caja / Ficha de venta de caja |
| Qty | Cant. |
| Variantes SKU | Variantes |
| Existencias (quants) | Existencias por ubicación |
| CUIT / VAT | CUIT |
| Plantillas activas… | Productos activos — buscá por nombre, código o barras |
| Contactos con rango de cliente/proveedor | Clientes / Proveedores (hint sin “rango”) |
| Tags CRM… | Etiquetas de venta |
| Oportunidades upsell / upselling | Pedidos con venta pendiente |
| Pedidos… en estado sale | Pedidos de venta confirmados |
| list_price en cero… | Sin precio de venta |
| Stock almacenable (calco) | Productos con stock |
| No se pudo abrir el launcher | No se pudieron cargar los accesos |
| No se pudo abrir el hub / Hub no encontrado | No se pudo cargar esta sección / Sección no encontrada |
| ← Volver al hub | ← Volver |
| Secciones del hub | Secciones |
| «…» todavía no tiene pantalla Astro… | Esta pantalla todavía no está disponible. |
| Campos mínimos allowlisted | Solo los datos necesarios para venderlo en caja. |
| Cambios allowlisted: se guardan en Odoo vía BFF. | Los cambios se guardan al tocar Guardar. |
| ¿Confirmar este documento en Odoo? | ¿Confirmás este documento? |
| Integraciones de sync manual | Carga manual desde portales |
| Texto Apps/Ajustes sobre shell Astro / Odoo nativo | Explicar en lenguaje de negocio (“esta pantalla todavía no está”) |
| Centro de operaciones (opcional) | Puede quedar; no es jerga dura |

## Mapa de rutas (page + list key + API)

Claves internas de lista / records alineadas al path público. Alias o redirect desde la clave vieja.

| Clave / path viejo | Clave / path nuevo |
|--------------------|--------------------|
| `purchase/rfq` → `/lists/purchase/rfq…` | `purchase/solicitudes` → `/lists/purchase/solicitudes…` |
| `purchase/rfq-draft` | `purchase/solicitudes-borrador` |
| `purchase/rfq-sent` | `purchase/solicitudes-enviadas` |
| `sales/pos-orders` | `sales/ventas-caja` |
| `inventory/quants` | `inventory/existencias` |

También:

- Página `lists/purchase/rfq/new.astro` → `lists/purchase/solicitudes/new.astro` (o equivalente).
- `detailPath` / `create` / links en home, POS, adapter, smoke.
- `/api/lists/…` y `/api/records/…`: misma renombre + **compat** (redirect o resolución de alias) para claves viejas.

Redirect HTTP (302 o 301) page path viejo → nuevo. Preferir un helper único de alias en el router de listas/records para no duplicar defs.

## Archivos típicos a tocar

- `web/src/lib/shell/record-lists.ts` (titles, hints, paths, keys)
- Order/create/action defs que referencien `purchase/rfq`, `sales/pos-orders`
- Pages/components con copy hardcodeado (POS, login, index, hubs, forms, ComingSoon, apps, settings, shell)
- `web/src/lib/bff/http.ts` / mensajes visibles si aplica
- `web/src/lib/bff/odoo-adapter.ts` (`detailPath` POS, etc.)
- Tests + `web/scripts/smoke-shell-path.mjs`
- Alias/redirect module (nuevo o en slug handlers)

## Fuera de alcance

- Labels de `sg.app.tile` / `sg.hub.card` en Odoo
- Pixel-perfect / Liquid Glass
- i18n multi-idioma / diccionario runtime completo
- Apagar OWL
- Docs de agentes salvo mención mínima si un link de producto queda obsoleto

## Criterios de aceptación

- [x] Ningún string de UI del glosario “Hoy” permanece en pages/components/list titles-hints visibles
- [x] Rutas nuevas responden; rutas viejas redirigen (pages) y API acepta alias o redirige
- [x] Home strip: “Nuevo pedido a proveedor” → path nuevo
- [x] POS: “Ventas de caja” → path nuevo
- [x] Suite `web` verde; smoke script usa paths nuevos (y/o prueba redirect)
- [x] Spec marcada `approved` al cerrar implementación

## Verificación

```bash
cd web && npm test
# opcional con Odoo:
# npm run smoke:shell
```

## Self-review

- Sin TBD operativos.
- Scope acotado: copy + rutas + redirects; no tiles Odoo.
- No contradice go condicional ADR 0016 (solo lenguaje de producto).
- Acrónimos del rubro (CUIT/IVA/OC) preservados a propósito.
