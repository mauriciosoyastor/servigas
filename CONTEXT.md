# CONTEXT — Servigas

> Lenguaje de negocio, límites del proyecto y decisiones que guían implementación. Actualizalo cuando cambie el alcance.

## Negocio

| Campo | Valor |
|-------|-------|
| **Nombre** | Servigas |
| **Rubro** | Casa de repuestos — calefacción, termotanques, cocinas, calefactores, anafes |
| **País** | Argentina |
| **Canal principal** | Mostrador (POS) |
| **Facturación fiscal** | Factura Web (temporal); AFIP/ARCA al final del proyecto |

## Objetivo

Operar stock, ventas en mostrador, compras y contabilidad en **Odoo 19 Community**, con catálogo por código de fabricante y descuentos manuales aplicados por el vendedor en POS.

## Alcance incluido

- Inventario con ubicaciones internas (Recepción, Depósito, Mostrador)
- Punto de venta (POS) — búsqueda por código fabricante
- Compras y recepciones
- Contabilidad operativa (sin facturación electrónica en esta fase)
- Catálogo importado desde planillas Excel de proveedores
- Puente manual Odoo ↔ Factura Web
- Frontend personalizado con **Liquid Glass v2** (ver abajo)
- Idioma: **Español (AR)**

## Fuera de alcance (por ahora)

- Facturación electrónica AFIP / ARCA en Odoo
- eCommerce
- Listas de precio automáticas (instalador / mayorista) — descuento manual en POS
- Integración automática con portales web de marcas (sync manual al inicio)
- Odoo Enterprise

## Módulos Odoo

| Área | Módulos |
|------|---------|
| Core custom | `servigas_core` (estilos Liquid Glass, extensiones UI) |
| Operación | `stock`, `sale_management`, `point_of_sale`, `purchase`, `account` |
| Localización (fase final) | `l10n_ar` + EDI |

## Integraciones

| Sistema | Modo |
|---------|------|
| Factura Web | Manual — planilla puente (`datos/import/planilla_puente_factura_web.xlsx`) |
| Portales proveedores (2–3 marcas) | Manual / Excel periódico |

## Datos e importación

| Recurso | Ubicación |
|---------|-----------|
| Maestro final (8.767 SKU) | `datos/import/maestro_import_odoo_final.xlsx` |
| Scripts import / consolidación | `datos/import/*.py` |
| Stock inicial conocido | 75 productos (Excel Fercor); resto en 0 hasta conteo físico |

## Entorno local

| Campo | Valor |
|-------|-------|
| BD dev | `servigas_dev` |
| Puerto HTTP | `8069` (default Odoo; config puede decir otro) |
| Config Odoo | `../odoo-workspace/config/servigas.conf` |
| Runtime Odoo 19 | `../odoo-workspace/odoo-19/` |
| Repo | https://github.com/mauriciosoyastor/servigas |

## Sistema de diseño — Liquid Glass v2 (frontend Odoo)

**Decisión:** todo trabajo de UI/UX en Odoo sigue el design system **Liquid Glass v2**, usando la skill Cursor **`liquid-glass-v2-routes`** como playbook de patrones (canvas continuo, glass KPIs, command bar, subnav, motion).

### Docs en este repo

| Doc | Contenido |
|-----|-----------|
| [docs/design/liquid-glass-odoo.md](docs/design/liquid-glass-odoo.md) | Guía de implementación Odoo (tokens `--sg-*`, SCSS, POS, checklist) |
| [docs/adr/0001-liquid-glass-odoo-frontend.md](docs/adr/0001-liquid-glass-odoo-frontend.md) | ADR — por qué Liquid Glass y cómo se implementa en `servigas_core` |

### Reglas rápidas para agentes

1. **Skill:** leer `liquid-glass-v2-routes` antes de tocar frontend.
2. **Prefijo CSS:** `--sg-*` / `.sg-*` — nunca `.crm-dashboard-*` de Astor en Odoo.
3. **Implementación:** `servigas_core/static/src/scss/` + `assets` en manifest.
4. **Patrones:** lista densa sin glass por fila; glass en KPIs, command bar y paneles; POS prioritario.
5. **No copiar** CSS del CRM Astro — adaptar patrones a DOM Odoo / OWL.

### Referencia origen (repo Astor)

Piloto dashboard: `astorproptech/docs/design/dashboard-v2-liquid-glass.md`  
Tokens: `astorproptech/docs/design/tokens.md`

## Decisiones

| # | Tema | Doc |
|---|------|-----|
| 0001 | Frontend Liquid Glass v2 en Odoo | `docs/adr/0001-liquid-glass-odoo-frontend.md` |

## Estado actual (2026-07-03)

- [x] Catálogo 8.767 productos importado en `servigas_dev`
- [x] Idioma Español (AR)
- [x] POS «Mostrador Servigas» con descuento manual
- [ ] Venta de prueba POS validada
- [ ] Stock masivo (conteo físico)
- [ ] Ubicaciones internas configuradas
- [ ] Assets Liquid Glass en `servigas_core`
- [ ] AFIP / facturación en Odoo
