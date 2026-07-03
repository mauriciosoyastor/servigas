# ADR 0001 — Frontend Odoo con Liquid Glass v2

**Estado:** Aceptado  
**Fecha:** 2026-07-03  
**Proyecto:** Servigas (Odoo 19 Community)

## Contexto

Servigas necesita un frontend Odoo (backend web + POS) con identidad visual propia, alineada al design system **Liquid Glass v2** ya usado en productos Astor (CRM dashboard, agenda, etc.).

El stack Odoo no usa Astro/React: la UI se personaliza vía **módulo `servigas_core`**, assets SCSS/CSS y parches OWL/XML cuando haga falta.

## Decisión

Adoptar **Liquid Glass v2** como sistema de diseño de referencia para todo trabajo de frontend Odoo en Servigas, siguiendo la skill **`liquid-glass-v2-routes`** y mapeando sus patrones a Odoo (ver `docs/design/liquid-glass-odoo.md`).

### Principios heredados (invariantes)

1. **Canvas continuo** — fondo ambiental sin costuras entre secciones.
2. **Superficies glass** — blur, borde luminoso y fill semitransparente solo en KPIs, command bars y paneles de resumen (no en listas densas).
3. **Un scroll owner** por vista — evitar scrolls anidados conflictivos.
4. **Subnav sticky** con track transparente y pill activa (cuando haya sub-vistas).
5. **Motion con `prefers-reduced-motion`** — stagger y transiciones opcionales, nunca obligatorias.
6. **Tokens con prefijo de módulo** — `--sg-*` / `.sg-*` en Servigas; no reutilizar `.crm-dashboard-*` de Astor en producción Odoo.

### Implementación técnica

| Capa | Ubicación |
|------|-----------|
| Tokens CSS | `custom_addons/servigas_core/static/src/scss/servigas_tokens.scss` |
| Estilos globales backend | `custom_addons/servigas_core/static/src/scss/servigas_backend.scss` |
| Estilos POS | `custom_addons/servigas_core/static/src/scss/servigas_pos.scss` |
| Assets manifest | `custom_addons/servigas_core/__manifest__.py` → `assets` |
| Parches OWL (si aplica) | `custom_addons/servigas_core/static/src/js/` |

### Patrones por pantalla Odoo

| Pantalla Odoo | Patrón Liquid Glass |
|---------------|---------------------|
| POS mostrador | Híbrido — barra de búsqueda/command, tiles producto limpios; glass ligero en header |
| Inventario — lista productos | Lista densa (grammar Contactos) — sin glass por fila |
| Inventario — formulario producto | Paneles glass en bloques de resumen / precios |
| Compras / Ventas — listas | Lista densa; glass solo en KPIs de cabecera si hay dashboard |
| Informes / resúmenes | Dashboard v2 — KPI cards + paneles glass |
| Ajustes | Secciones agrupadas, scroll único |

## Consecuencias

### Positivas

- Paridad visual con el ecosistema Astor sin reescribir Odoo desde cero.
- Reglas claras para agentes y desarrolladores (skill + docs en repo).
- CSS scoped en `servigas_core`; upgrades de Odoo más controlables.

### Negativas / riesgos

- Odoo impone estructura DOM distinta a Astro — requiere adaptación, no copiar-pegar CSS del CRM.
- POS usa bundle separado; hay que mantener dos hojas de estilo (backend + POS).
- Algunos widgets estándar Odoo no admiten glass sin parche OWL.

## Referencias

- Skill Cursor: `liquid-glass-v2-routes` (`~/.cursor/skills/liquid-glass-v2-routes/SKILL.md`)
- Doc de implementación Odoo: `docs/design/liquid-glass-odoo.md`
- Piloto origen (repo Astor): `astorproptech/docs/design/dashboard-v2-liquid-glass.md`
