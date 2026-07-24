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
| App + UI | `servigas_core` (`application: True`) — launcher, hubs, tema Liquid Glass, navegación unificada |
| Integraciones | `servigas_integrations` (`application: False`) — tile + cards en hubs (Factura Web, portales) |
| Operación | `stock`, `sale_management`, `point_of_sale`, `purchase`, `account` (menús raíz ocultos para operativos) |
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
| Protección `main` | `infra/github/` — ruleset + `apply-rulesets.sh` |

## Shell Astro — corte autorizado (condicional) (`web/`)

**Corte autorizado (condicional) — 2026-07-23.**  
Shell oficial = Astro BFF (`web/`).  
Smoke camino feliz (lectura + venta POS): **OK** 2026-07-23 (`npm run smoke:shell`, `SMOKE_MUTATE=1`).  
OWL queda como fallback hasta el día D operativo (apagar UI OWL de negocio).

**Gobernanza (ADR 0016):** postura **B** cerrada con go condicional. Spec: [go condicional](docs/superpowers/specs/2026-07-23-astro-cutover-go-condicional-design.md).

| Hoy (gobernanza) | Día D operativo (cuando pase el smoke) |
|------------------|----------------------------------------|
| Astro login → hubs → listas → POS caja = **shell oficial** | UI OWL de negocio apagada / residual |
| OWL launcher/hubs/POS = **fallback** | Odoo = backend únicamente |
| Smoke lectura + mutate POS = **OK** | UI OWL de negocio apagada / residual |

**Regla de build:** solo paridad del camino feliz, endurecer BFF, o onboarding spotlight del shell. Fuera de alcance post-go (hasta priorizar): offline, multi-caja.

**Onboarding:** tour spotlight en `ShellLayout` (inicio → hub → caja); preferencia `localStorage` (`sg_tour_done`). Spec: [onboarding spotlight](docs/superpowers/specs/2026-07-23-astro-onboarding-spotlight-design.md).

Skill: `astro-bff-shell` (personal). Plan spike: [plan spike](docs/superpowers/plans/2026-07-22-astro-bff-shell-spike.md). ADR: [0016](docs/adr/0016-astro-shell-cutover.md).

## Sistema de diseño — Liquid Glass v2 (frontend Odoo)

**Decisión:** todo trabajo de UI/UX en Odoo sigue el design system **Liquid Glass v2**, usando la skill Cursor **`liquid-glass-v2-routes`** como playbook de patrones (canvas continuo, glass KPIs, command bar, subnav, motion).

### Docs en este repo

| Doc | Contenido |
|-----|-----------|
| [docs/design/liquid-glass-odoo.md](docs/design/liquid-glass-odoo.md) | Guía de implementación Odoo (tokens `--sg-*`, SCSS, POS, checklist) |
| [docs/design/owl-liquid-glass-boundaries.md](docs/design/owl-liquid-glass-boundaries.md) | **Guardrails OWL** — qué propuestas UI no funcionan y alternativas |
| [docs/design/servigas-brand.md](docs/design/servigas-brand.md) | Identidad visual (llama, Montserrat, paleta) |
| [docs/adr/0001-liquid-glass-odoo-frontend.md](docs/adr/0001-liquid-glass-odoo-frontend.md) | ADR — por qué Liquid Glass y cómo se implementa en `servigas_core` |
| [docs/proyecto/bitacora-cambios.md](docs/proyecto/bitacora-cambios.md) | **Bitácora viva** — cambios, verificación y backlog de automatización |

### Reglas rápidas para agentes

1. **Skill:** leer `liquid-glass-v2-routes` antes de tocar frontend.
2. **Guardrails UI:** leer [owl-liquid-glass-boundaries.md](docs/design/owl-liquid-glass-boundaries.md) antes de proponer cambios visuales. Si la propuesta cae en §5.1, avisar con la plantilla §10 antes de implementar.
3. **Bitácora:** actualizar [docs/proyecto/bitacora-cambios.md](docs/proyecto/bitacora-cambios.md) al cerrar trabajo de tema, datos o infra.
4. **Prefijo CSS:** `--sg-*` / `.sg-*` — nunca `.crm-dashboard-*` de Astor en Odoo.
5. **Implementación:** `servigas_core/static/src/scss/` + `assets` en manifest.
6. **Patrones:** lista densa sin glass por fila; glass en KPIs, command bar y paneles; POS prioritario.
7. **No copiar** CSS del CRM Astro — adaptar patrones a DOM Odoo / OWL.

### Referencia origen (repo Astor)

Piloto dashboard: `astorproptech/docs/design/dashboard-v2-liquid-glass.md`  
Tokens: `astorproptech/docs/design/tokens.md`

## Decisiones

| # | Tema | Doc |
|---|------|-----|
| 0001 | Frontend Liquid Glass v2 en Odoo | `docs/adr/0001-liquid-glass-odoo-frontend.md` |
| 0002 | Sync diferido del contexto del rail | `docs/adr/0002-rail-context-sync.md` |
| 0003 | Contrato rail al navegar desde KPI cards | `docs/adr/0003-rail-kpi-navigation-contract.md` |
| 0004 | Ingreso POS desde launcher / rail | `docs/adr/0004-pos-launcher-entry.md` |
| 0005 | Tema Liquid Glass del Mostrador (contrato + SCSS) | `docs/adr/0005-pos-liquid-glass-theme-contract.md` |
| 0006 | UI recorrido operativo (panel + «Ver recorrido») | `docs/adr/0006-onboarding-recorrido-chrome.md` |
| 0007 | Verificación del camino shell (Inicio→Mostrador) | `docs/adr/0007-shell-path-verification-contract.md` |
| 0008 | Recorrido vs KPI cards (target hub + stacking) | `docs/adr/0008-recorrido-kpi-target-stacking.md` |
| 0009 | Dual recorrido: rápido y completo | `docs/adr/0009-dual-recorrido-rapido-completo.md` |
| 0010 | Motor de playlists onboarding (`quick` \| `full`) | `docs/adr/0010-onboarding-playlists-engine.md` |
| 0011 | Plantillas del recorrido completo | `docs/adr/0011-recorrido-completo-plantillas.md` |
| 0012 | UX Mostrador por fases (extiende 0005 + TDD) | `docs/adr/0012-pos-ux-phases-tdd.md` |
| 0013 | Tema pago/recibo Mostrador (hermano 0012 + TDD) | `docs/adr/0013-pos-payment-receipt-theme.md` |
| 0014 | Descuento general (Desc.) en numpad Mostrador | `docs/adr/0014-pos-order-discount-numpad.md` |
| 0015 | Sin chatter en forms operativos (plan + TDD) | `docs/adr/0015-hide-chatter-operative-forms.md` |
| 0016 | Camino a corte shell Astro (+ POS) | `docs/adr/0016-astro-shell-cutover.md` |

## Estado actual (2026-07-05)

- [x] Catálogo 8.767 productos importado en `servigas_dev`
- [x] Idioma Español (AR)
- [x] POS «Mostrador Servigas» con descuento manual (línea `%` + general **Desc.**, ADR 0014)
- [x] Tema Servigas en `servigas_core` (tokens, POS, backend, launcher, hubs)
- [x] Integraciones conectadas (tile launcher + cards Factura Web / portales)
- [x] App única Servigas para operativos; admins conservan apps nativas
- [ ] Actualizar módulos en BD y validar visualmente (`-u servigas_core,servigas_integrations`)
- [x] Venta de prueba POS validada (smoke `SMOKE_MUTATE=1` 2026-07-23)
- [ ] Stock masivo (conteo físico)
- [ ] Ubicaciones internas configuradas
- [ ] AFIP / facturación en Odoo
