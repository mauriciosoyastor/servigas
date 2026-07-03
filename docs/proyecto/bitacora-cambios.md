# Bitácora de cambios — Servigas

> Documento vivo: registra **qué** cambiamos, **por qué**, **dónde** y **qué se podría automatizar** en proyectos futuros.
>
> **Mantenerlo:** al cerrar cada sesión de trabajo significativa, agregar una entrada con la plantilla de abajo. Los agentes de Cursor deben leer este archivo antes de tocar tema/UI y actualizarlo al terminar.

**Relacionado:** [CONTEXT.md](../../CONTEXT.md) · [liquid-glass-odoo.md](../design/liquid-glass-odoo.md) · [servigas-brand.md](../design/servigas-brand.md)

---

## Cómo usar esta bitácora

| Rol | Acción |
|-----|--------|
| **Humano** | Revisa el backlog de automatización al planificar un cliente nuevo |
| **Agente Cursor** | Añade entrada al implementar; marca oportunidades de script/plantilla |
| **Futuro yo** | Copia la sección «Kit reutilizable» como base para otro Odoo + marca |

### Plantilla para nuevas entradas

```markdown
### YYYY-MM-DD — Título breve

**Área:** tema | datos | POS | compras | infra | docs | …
**Motivo:** por qué se hizo
**Archivos:** lista de paths tocados
**Cambios:** bullets concretos
**Verificación:** comando o paso manual para validar
**Automatización:** qué se podría templatizar / scriptear (o «ninguna»)
```

---

## Resumen ejecutivo (estado al 2026-07-03)

| Área | Estado | Notas |
|------|--------|-------|
| Identidad visual | En curso | Tokens llama + Montserrat definidos |
| Backend Odoo | En curso | Navbar y acentos sin morado Odoo |
| POS | En curso | Tema oscuro + glass en header |
| Catálogo / datos | Hecho | 8.767 SKU importados |
| Facturación fiscal | Pendiente | Factura Web manual por ahora |
| Web pública (`web/`) | Iniciado | Astro scaffold, sin integrar aún |

---

## Entradas

### 2026-07-03 — Fundación del tema Liquid Glass en `servigas_core`

**Área:** tema · docs  
**Motivo:** ADR 0001 — unificar frontend Odoo (backend + POS) con identidad Servigas y patrones Liquid Glass v2.

**Archivos:**
- `custom_addons/servigas_core/static/src/scss/servigas_tokens.scss`
- `custom_addons/servigas_core/static/src/scss/servigas_backend.scss`
- `custom_addons/servigas_core/static/src/scss/servigas_pos.scss`
- `custom_addons/servigas_core/static/src/img/servigas_logo.png`
- `custom_addons/servigas_core/__manifest__.py`
- `docs/design/servigas-brand.md`
- `docs/design/liquid-glass-odoo.md`
- `docs/adr/0001-liquid-glass-odoo-frontend.md`

**Cambios:**
- Tokens SCSS/CSS `--sg-*` (llama, carbón, glass, Montserrat).
- POS: fondo ambiental oscuro, header glass, logo, botón cobrar con gradiente.
- Backend: tipografía, fondos papel/canvas, sheets con glass ligero, links en color llama.
- Bundles Odoo: `web.assets_backend` y `point_of_sale._assets_pos`.

**Verificación:** `odoo-bin -u servigas_core -d servigas_dev` → abrir POS y cualquier app del backend.

**Automatización:**
- Plantilla de módulo `*_core` con los 3 SCSS + manifest de assets vacío.
- Script que copie tokens desde un `brand.yaml` (colores, fuente, logo) y genere `*_tokens.scss`.

---

### 2026-07-03 — Eliminación del morado Odoo en navbar y acentos globales

**Área:** tema  
**Motivo:** la barra de submenús (Clientes, Proveedores, etc.) y botones primarios seguían usando `$o-brand-odoo` (#71639e).

**Archivos:**
- `custom_addons/servigas_core/static/src/scss/servigas_primary_variables.scss` *(nuevo)*
- `custom_addons/servigas_core/static/src/scss/servigas_backend.scss`
- `custom_addons/servigas_core/__manifest__.py`

**Cambios:**

1. **Variables primarias Odoo** (`web._assets_primary_variables`):
   - `$o-brand-odoo`, `$o-brand-primary`, `$o-action` → `#E64A19`
   - Navbar: fondo transparente, hover/activo con tinte llama
   - Mapa `$o-btns-bs-override` para botón primario Bootstrap

2. **Navbar — `.o_menu_sections`:**
   - CSS vars `--NavBar-entry-*` con paleta Servigas
   - Fondo de ítems transparente (integrado al gradiente carbón)
   - Activo: fondo óxido + texto amarillo llama

3. **Acentos UI backend:**
   - Mixin `sg-btn-flame` → gradiente en `.btn-primary`, `.btn-fill-primary`, statusbar, kanban, listas
   - Outline, tabs/pills, focus inputs, checkboxes, `.text-action`

**Verificación:**
1. Actualizar módulo: `odoo-bin -u servigas_core -d servigas_dev`
2. Hard refresh (Ctrl+Shift+R)
3. Abrir Facturación → confirmar submenú sin franja morada
4. Crear/editar registro → botones primarios en gradiente llama

**Automatización:**
- **Checklist visual** post-tema: script Playwright que capture navbar + formulario y compare screenshot baseline.
- **Generador de `*_primary_variables.scss`** desde `brand.yaml` con mapeo estándar Odoo (ver tabla abajo).
- **Skill Cursor** `odoo-brand-theme`: dado un logo + paleta, aplicar los 4 archivos SCSS y manifest.

---

### 2026-07-03 — Bitácora y registro de automatización

**Área:** docs  
**Motivo:** documentar avances para replicar en proyectos futuros y reducir trabajo manual.

**Archivos:**
- `docs/proyecto/bitacora-cambios.md` *(este archivo)*
- `CONTEXT.md` *(enlace)*

**Cambios:** creación del documento vivo y backlog de automatización.

**Automatización:** ver sección siguiente.

---

## Mapa Odoo → Servigas (referencia para scripts)

Útil al generar temas para otros clientes Odoo Community/Enterprise.

| Variable / selector Odoo | Valor Servigas | Archivo |
|--------------------------|----------------|---------|
| `$o-brand-odoo` | `#E64A19` | `servigas_primary_variables.scss` |
| `$o-brand-primary` | `#E64A19` | idem |
| `$o-navbar-background` | `transparent` | idem |
| `.o_menu_sections .o_nav_entry` background | `transparent` + vars CSS | `servigas_backend.scss` |
| `.btn-primary` | gradiente llama | `servigas_backend.scss` |
| POS fondo | `$sg-bg-ambient` | `servigas_pos.scss` |
| Logo navbar POS | `--navbar-logo` | `servigas_tokens.scss` |

### Bundles de assets (Odoo 19)

```python
"web._assets_primary_variables": [
    ("after", "web/static/src/webclient/navbar/navbar.variables.scss",
     "<modulo>/static/src/scss/<marca>_primary_variables.scss"),
],
"web.assets_backend": [
    ("before", "web/static/src/scss/bootstrap_overridden.scss",
     "<modulo>/static/src/scss/<marca>_tokens.scss"),
    "<modulo>/static/src/scss/<marca>_backend.scss",
],
"point_of_sale._assets_pos": [
    ("after", "point_of_sale/static/src/app/pos_app.scss",
     "<modulo>/static/src/scss/<marca>_tokens.scss"),
    "<modulo>/static/src/scss/<marca>_pos.scss",
],
```

---

## Backlog de automatización

Prioridad sugerida para cuando haya un segundo proyecto Odoo con marca propia.

| ID | Idea | Entrada | Esfuerzo | Impacto |
|----|------|---------|----------|---------|
| A1 | `brand.yaml` → 4 archivos SCSS + manifest snippets | 2026-07-03 tema | M | Alto |
| A2 | Cookiecutter / script `scaffold-odoo-theme <nombre>` | 2026-07-03 tema | M | Alto |
| A3 | Skill Cursor `odoo-brand-theme` | 2026-07-03 tema | S | Alto |
| A4 | Test visual navbar + btn-primary (Playwright) | 2026-07-03 tema | M | Medio |
| A5 | `odoo-bin -u` + reload assets en un comando dev | todas | S | Medio |
| A6 | Import catálogo Excel → plantilla parametrizada | fundación datos | L | Alto |
| A7 | Planilla puente Factura Web → generador por cliente | CONTEXT | M | Medio |

**Leyenda esfuerzo:** S = horas · M = 1–2 días · L = varios días

### Propuesta `brand.yaml` (borrador para A1)

```yaml
name: servigas
font_family: '"Montserrat", "Segoe UI", system-ui, sans-serif'
colors:
  flame_yellow: "#FFD600"
  flame_orange: "#F57C00"
  flame_deep: "#E64A19"
  flame_rust: "#BF360C"
  bg_deep: "#1A1A1A"
  bg_charcoal: "#2B2B2B"
  paper: "#F7F5F2"
odoo:
  brand_primary: "{colors.flame_deep}"
  navbar_background: transparent
assets:
  logo: static/src/img/servigas_logo.png
```

Un script Python/Jinja podría emitir `servigas_tokens.scss`, `servigas_primary_variables.scss`, y fragmentos del manifest.

---

## Kit reutilizable (copiar a nuevo proyecto)

Checklist mínimo para clonar el enfoque Servigas en otro Odoo:

1. [ ] Módulo `cliente_core` con dependencias `base`, `web`, `point_of_sale`
2. [ ] `*_tokens.scss` — paleta + mixins glass
3. [ ] `*_primary_variables.scss` — override `$o-brand-*` en `web._assets_primary_variables`
4. [ ] `*_backend.scss` — navbar, botones, acentos
5. [ ] `*_pos.scss` — tema oscuro POS (si aplica mostrador)
6. [ ] Logo PNG en `static/src/img/`
7. [ ] `__manifest__.py` con los 3 bundles de assets
8. [ ] `docs/design/<marca>-brand.md` — análisis de identidad
9. [ ] Entrada en esta bitácora (o bitácora del nuevo repo)
10. [ ] Actualizar `CONTEXT.md` del proyecto

---

### 2026-07-03 — Hub Inventario MVP (rail + KPI cards de ingreso)

**Área:** tema · inventario  
**Motivo:** implementar patrón App Hub Shell — rail de secciones + KPI cards clicables (plan hub-rail-kpi-ingreso H0–H3).

**Archivos:**
- `custom_addons/servigas_core/static/src/scss/servigas_hub.scss`
- `custom_addons/servigas_core/static/src/js/**` (servicio, componentes, hub)
- `custom_addons/servigas_core/models/sg_hub_card.py`, `sg_hub_section.py`
- `custom_addons/servigas_core/data/hub_inventory_data.xml`
- `custom_addons/servigas_core/views/hub_menus.xml`
- `custom_addons/servigas_core/__manifest__.py` (v19.0.1.1.0)

**Cambios:**
- Menú Inventario → **Resumen** (`ir.actions.client` `servigas_inventory_hub`).
- Rail izq: 5 secciones; centro: KPI cards con métricas RPC y `doAction`.
- Modelo `sg.hub.card` configurable; 20+ cards de datos XML.

**Verificación:** `odoo-bin -u servigas_core -d servigas_dev` → Inventario → Resumen.

**Automatización:** replicar `hub_inventory_data.xml` para Ventas/Compras.

---

### 2026-07-03 — Plan hub: rail secciones + KPI cards de ingreso

**Área:** docs · tema  
**Motivo:** unificar rail (navegación por secciones) y KPI cards (puntos de ingreso a subvistas) en patrón App Hub Shell.

**Archivos:**
- `docs/proyecto/plan-hub-rail-kpi-ingreso.md` *(nuevo)*

**Cambios:**
- Patrón: rail izq por secciones + grid KPI cards clicables en centro.
- Inventario completo: 5 secciones, ~20 cards con métricas y acciones Odoo.
- Esquemas Ventas, Compras, Facturación; modelo `sg.hub.card`; fases H0–H7.
- Descarta rail derecho en listas v1; hub como única puerta de entrada.

**Verificación:** aprobar piloto Inventario (H3) como MVP.

**Automatización:** modelo `sg.hub.card` editable sin redeploy JS.

---

### 2026-07-03 — Plan rail expandible para interacciones Odoo

**Área:** docs · tema  
**Motivo:** evaluar y planificar barra lateral expandible para interacciones secundarias (KPIs, filtros, navegación) complementaria al plan KPI cards.

**Archivos:**
- `docs/proyecto/plan-rail-expandible-odoo.md` *(nuevo)*
- `docs/proyecto/plan-liquid-glass-kpi-routes.md` *(enlace cruzado)*

**Cambios:**
- Evaluación variantes A (rail izq global), B (rail der contextual), C (ViewShell completo).
- Decisión: variante B+C híbrido progresivo; sin rail en POS ni forms con chatter.
- Mapa de interacciones Odoo por ruta; 6 fases R0–R6; integración con SgKpiCard.

**Verificación:** revisar con stakeholder; piloto en Hub Inventario (R2) tras componente base (R1).

**Automatización:** modelo `servigas.rail.config` para activar rail por acción sin hardcode JS.

---

### 2026-07-03 — Plan Liquid Glass KPI cards por ruta

**Área:** docs · tema  
**Motivo:** evaluar todas las rutas y botones Odoo para modernización UI con KPI cards estratégicas (ADR 0001).

**Archivos:**
- `docs/proyecto/plan-liquid-glass-kpi-routes.md` *(nuevo)*

**Cambios:**
- Inventario completo de rutas: Inventario, POS, Ventas, Compras, Facturación, Ajustes.
- Taxonomía de 16 tipos de botón con decisión KPI vs flame CTA.
- 7 fases de implementación (SCSS → POS → Hub OWL → forms → strips → hubs → informes).
- Matriz esfuerzo/impacto y KPIs de datos por modelo Odoo.

**Verificación:** revisar plan con stakeholder; iniciar Fase 0 al aprobar.

**Automatización:** plantilla `SgKpiCard` reutilizable para futuros clientes Odoo con marca propia.

---

## Pendientes documentados (no implementados)

| Tema | Notas |
|------|-------|
| Plan KPI routes | Ver [plan-liquid-glass-kpi-routes.md](./plan-liquid-glass-kpi-routes.md) — Fase 0 pendiente |
| Plan hub rail + KPI ingreso | Ver [plan-hub-rail-kpi-ingreso.md](./plan-hub-rail-kpi-ingreso.md) — H0 pendiente (**MVP**) |
| Plan rail expandible | Ver [plan-rail-expandible-odoo.md](./plan-rail-expandible-odoo.md) — superseded parcialmente por hub |
| Montserrat en Odoo | Falta cargar Google Font en backend/POS si no está en sistema |
| Modo oscuro Odoo (`web.assets_web_dark`) | Tokens glass para dark mode no definidos |
| Web Astro (`web/`) | Scaffold separado; integración con marca pendiente |
| Validación venta POS | CONTEXT — pendiente |
| Stock masivo / ubicaciones | CONTEXT — pendiente |

---

*Última actualización: 2026-07-03 (plan KPI routes)*
