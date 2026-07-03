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
| Identidad visual | Hecho | Tokens llama + Montserrat (`servigas_tokens.scss`) |
| Backend Odoo | Hecho | Navbar, acentos flame, `servigas_hub.scss` |
| Hubs App Shell | **Hecho** | Inventario, Ventas, Compras, Facturación (`v19.0.1.4.0`) |
| POS | En curso | Tema oscuro + glass en header |
| Catálogo / datos | Hecho | 8.767 SKU importados |
| Facturación fiscal | Pendiente | Factura Web manual por ahora |
| Web pública (`web/`) | Iniciado | Astro scaffold, sin integrar aún |

**Docs de referencia hubs:** [plan-hub-rail-kpi-ingreso.md](./plan-hub-rail-kpi-ingreso.md) · [plan-liquid-glass-kpi-routes.md](./plan-liquid-glass-kpi-routes.md)

---

## Entradas

### 2026-07-03 — Bitácora: kit automatización hubs App Shell

**Área:** docs  
**Motivo:** documentar cómo replicar rails + KPI cards en futuros proyectos Odoo sin reimplementar desde cero.

**Archivos:**
- `docs/proyecto/bitacora-cambios.md` *(este archivo)*

**Cambios:**
- Sección **Kit reutilizable — App Hub Shell** (checklist, mapa 4 apps, contrato `sg.hub.card`).
- Propuesta **`hub.yaml`** + comando `scaffold_odoo_hub.py` (backlog A8–A9).
- Refactor **hub OWL genérico** (A10), skill Cursor (A11), tests smoke (A12).
- Tabla errores frecuentes y verificación estándar.
- Resumen ejecutivo actualizado: hubs **Hecho** en v19.0.1.4.0.

**Verificación:** agente o humano sigue checklist «Por cada app Odoo» en nuevo repo.

**Automatización:** implementar A8–A12 en repo `odoo-hub-scaffold` o script en `scripts/`.

---

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
| **A8** | **`hub.yaml` → `hub_<app>_data.xml` + menú + JS hub** | **2026-07-03 hubs** | **M** | **Alto** |
| **A9** | **Script `scaffold-odoo-hub <app>`** (secciones + cards base) | **2026-07-03 hubs** | **M** | **Alto** |
| **A10** | **Hub OWL genérico `SgAppHub` (un JS, N apps por config)** | **2026-07-03 hubs** | **M** | **Alto** |
| **A11** | **Skill Cursor `odoo-liquid-glass-hubs`** | **2026-07-03 hubs** | **S** | **Alto** |
| **A12** | **Test smoke hubs: RPC `get_hub_payload` + menú Resumen** | **2026-07-03 hubs** | **M** | **Medio** |

**Leyenda esfuerzo:** S = horas · M = 1–2 iteraciones agente · L = varios días

---

## Kit reutilizable — App Hub Shell (nuevo proyecto Odoo)

Checklist para replicar el patrón **rail + KPI cards de ingreso** en otro cliente. Tiempo estimado manual: **1 app piloto + 30–45 min por app adicional** si se copia la estructura Servigas.

### Prerrequisitos (una sola vez por proyecto)

1. [ ] Módulo `*_core` con tema Liquid Glass (tokens, backend, hub SCSS)
2. [ ] Modelos `sg.hub.section` y `sg.hub.card` (copiar de Servigas o extraer a módulo `web_hub_base`)
3. [ ] Componentes OWL compartidos: `SgSectionRail`, `SgEntryCard`, servicio `sg_hub`
4. [ ] `servigas_hub.scss` (o `<marca>_hub.scss`) en `web.assets_backend`
5. [ ] `security/ir.model.access.csv` con grupo manager por app

### Por cada app Odoo (stock, sale, purchase, account, …)

| Paso | Qué hacer | Archivo / artefacto |
|------|-----------|---------------------|
| 1 | Definir `app` en selection (`inventory`, `sales`, …) | `models/sg_hub_*.py` |
| 2 | Crear 5 secciones rail (Resumen + 4 dominio) | `data/hub_<app>_data.xml` |
| 3 | Crear 15–25 cards con `action_id` XML válido | idem |
| 4 | Registrar `ir.actions.client` + menú «Resumen» `sequence=0/1` | `views/hub_menus.xml` |
| 5 | Hub OWL: copiar `*_hub.js` + `.xml` + `*_action.js` | `static/src/js/hubs/` |
| 6 | Añadir dependencia Odoo + assets en manifest | `__manifest__.py` |
| 7 | `odoo-bin -u <modulo> -d <bd>` y probar cards | — |

### Mapa Servigas implementado (referencia)

| App `sg.hub.*` | Módulo Odoo | Menú padre XML | Client tag | Cards | Grupo menú |
|----------------|-------------|----------------|------------|-------|------------|
| `inventory` | `stock` | `stock.menu_stock_root` | `servigas_inventory_hub` | 20+ | `stock.group_stock_user` |
| `sales` | `sale_management` | `sale.sale_menu_root` | `servigas_sales_hub` | 22 | `sales_team.group_sale_salesman` |
| `purchase` | `purchase` | `purchase.menu_purchase_root` | `servigas_purchase_hub` | 19 | `purchase.group_purchase_user` |
| `accounting` | `account` | `account.menu_finance` | `servigas_accounting_hub` | 23 | `account.group_account_invoice` |

**No implementar hub en:** POS (UI propia), Ajustes (`res.config.settings`), listas/form estándar.

### Archivos núcleo (copiar tal cual entre proyectos)

```
<modulo>_core/
├── models/
│   ├── sg_hub_section.py
│   └── sg_hub_card.py          # incluye get_hub_payload + métricas
├── data/
│   └── hub_<app>_data.xml      # ÚNICO archivo custom por app
├── views/
│   └── hub_menus.xml           # append por app
└── static/src/
    ├── scss/<marca>_hub.scss   # una vez
    └── js/
        ├── services/sg_hub_service.js
        ├── components/         # SgSectionRail, SgEntryCard
        └── hubs/
            ├── <app>_hub.js      # ~60 líneas; cambiar appLabel + loadHub("app")
            ├── <app>_hub.xml     # título de app
            └── <app>_hub_action.js  # registry.add("servigas_<app>_hub", ...)
```

### Contrato `sg.hub.card` (campos para YAML futuro)

| Campo | Obligatorio | Uso |
|-------|-------------|-----|
| `app` | sí | `inventory` \| `sales` \| `purchase` \| `accounting` |
| `section` | sí | código sección (`summary`, `orders`, …) |
| `show_in_summary` | no | aparece en Resumen |
| `label`, `hint`, `icon`, `enter_label` | sí / no | UI card |
| `action_id` | sí | `ir.actions.act_window` (ref XML módulo Odoo) |
| `domain`, `context` | no | filtro al abrir vista |
| `metric_model`, `metric_domain` | sí p/métrica | `search_count` / `read_group` |
| `metric_aggregate` | no | `count` (default) \| `sum` |
| `metric_field` | si sum | ej. `amount_total` |
| `metric_date_field` + `metric_date_scope` | no | `today` para KPIs del día |
| `metric_suffix` | no | ej. ` $` |
| `variant` | no | `warning` para alertas |

### Propuesta `hub.yaml` (borrador para A8)

Archivo declarativo por app; un generador Jinja emitiría `hub_<app>_data.xml` y fragmentos de menú/JS.

```yaml
# hubs/inventory.yaml — ejemplo
app: inventory
odoo_module: stock
menu_parent: stock.menu_stock_root
menu_groups: stock.group_stock_user
client_tag: servigas_inventory_hub
title: Inventario

sections:
  - code: summary
    name: Resumen
    icon: fa-th-large
    sequence: 1
  - code: products
    name: Productos
    icon: fa-cube
    sequence: 2
  # …

cards:
  - id: catalog
    section: summary
    show_in_summary: true
    sequence: 10
    label: Productos
    hint: Plantillas activas
    icon: fa-cube
    enter_label: Ver catálogo →
    action_xml_id: stock.product_template_action_product
    metric:
      model: product.template
      domain: "[('active', '=', True)]"
      aggregate: count
  - id: low_stock
    section: summary
    show_in_summary: true
    variant: warning
    action_xml_id: stock.stock_product_normal_action
    domain: "[('is_storable', '=', True), ('qty_available', '<=', 0)]"
    metric:
      model: product.product
      domain: "[('is_storable', '=', True), ('qty_available', '<=', 0)]"
  - id: sales_today
    section: summary
    metric:
      model: sale.order
      domain: "[('state', '=', 'sale')]"
      aggregate: sum
      field: amount_total
      date_field: date_order
      date_scope: today
      suffix: " $"
```

**Comando objetivo (A9):**

```bash
python scripts/scaffold_odoo_hub.py \
  --module servigas_core \
  --config hubs/inventory.yaml \
  --odoo-version 19
```

Salida esperada: `data/hub_inventory_data.xml`, entradas en `hub_menus.xml`, stubs JS si no existe hub genérico.

### Refactor recomendado (A10) — un solo componente OWL

Hoy cada app tiene `*_hub.js` casi idéntico. Para automatizar:

```javascript
// hubs/generic_hub.js — propuesta
export function buildHubComponent({ templateName, appId, title }) {
    return class extends Component {
        // setup igual; loadHub(appId, section); title en template
    };
}
```

O pasar `app` y `title` vía `ir.actions.client` `params` en XML:

```xml
<record id="action_inventory_hub" model="ir.actions.client">
    <field name="tag">servigas_app_hub</field>
    <field name="context">{'hub_app': 'inventory', 'hub_title': 'Inventario'}</field>
</record>
```

Así **nuevas apps = solo YAML/XML de datos**, sin JS nuevo.

### Verificación estándar (checklist A12)

```bash
# 1. Actualizar módulo
odoo-bin -u servigas_core -d servigas_dev

# 2. Por cada app instalada:
#    - Menú «Resumen» visible como primer ítem
#    - Rail: 5 secciones cambian cards sin error consola
#    - Clic card → abre vista Odoo con dominio correcto
#    - Valores KPI numéricos (no «—» salvo sin permiso)
#    - Rail colapsa/expande; preferencia persiste tras F5

# 3. RPC directo (debug)
# En shell Odoo:
env['sg.hub.card'].get_hub_payload('inventory', 'summary')
```

### Errores frecuentes al replicar

| Síntoma | Causa | Fix |
|---------|-------|-----|
| Menú no aparece | `depends` falta módulo Odoo | Añadir `stock` / `sale_management` / … en manifest |
| Card abre vista vacía | `action_id` XML id incorrecto para versión Odoo | Verificar en GitHub `odoo/odoo/<version>/addons/` |
| Métrica «—» | `metric_model` sin permiso o dominio inválido | Probar `search_count` en shell |
| `receipt_status` falla | `purchase_stock` no instalado | Instalar stock + purchase |
| Hub en blanco | assets JS no en manifest | Listar `*_hub_action.js` al final del bundle |
| Duplicar menú Resumen | `sequence` no es 0/1 | Ajustar vs Dashboard nativo |

---

## Kit reutilizable — Tema (copiar a nuevo proyecto)

Checklist mínimo para clonar el enfoque Servigas en otro Odoo:

1. [ ] Módulo `cliente_core` con dependencias `base`, `web`, `point_of_sale`
2. [ ] `*_tokens.scss` — paleta + mixins glass
3. [ ] `*_primary_variables.scss` — override `$o-brand-*` en `web._assets_primary_variables`
4. [ ] `*_backend.scss` — navbar, botones, acentos
5. [ ] `*_pos.scss` — tema oscuro POS (si aplica mostrador)
6. [ ] `*_hub.scss` — App Hub Shell (si aplica hubs)
7. [ ] Logo PNG en `static/src/img/`
8. [ ] `__manifest__.py` con bundles de assets + data hubs
9. [ ] Modelos `sg.hub.section` / `sg.hub.card` (si aplica hubs)
10. [ ] `docs/design/<marca>-brand.md` — análisis de identidad
11. [ ] Entrada en esta bitácora (o bitácora del nuevo repo)
12. [ ] Actualizar `CONTEXT.md` del proyecto

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

## Entrada consolidada — Hubs App Shell (2026-07-03)

**Área:** tema · UI · inventario · ventas · compras · contabilidad  
**Motivo:** pantalla «Resumen» por app con rail de secciones + KPI cards de ingreso (plan [hub-rail-kpi-ingreso.md](./plan-hub-rail-kpi-ingreso.md)).  
**Versión módulo:** `19.0.1.4.0`

**Archivos núcleo (reutilizables):**

| Capa | Paths |
|------|-------|
| Modelos | `models/sg_hub_section.py`, `models/sg_hub_card.py` |
| SCSS | `static/src/scss/servigas_hub.scss`, tokens rail en `servigas_tokens.scss` |
| OWL compartido | `static/src/js/services/sg_hub_service.js`, `components/sg_*` |
| Datos por app | `data/hub_inventory_data.xml`, `hub_sales_data.xml`, `hub_purchase_data.xml`, `hub_accounting_data.xml` |
| Menús | `views/hub_menus.xml` |
| Hubs JS | `static/src/js/hubs/{inventory,sales,purchase,accounting}_hub*` |

**Automatización para futuros proyectos:** ver sección **Kit reutilizable — App Hub Shell** y backlog **A8–A12** arriba.

---

### 2026-07-03 — Hub Facturación (réplica hubs operativos)

**Área:** tema · contabilidad  
**Motivo:** replicar App Hub Shell para app Facturación / `account` (plan hub-rail-kpi-ingreso).

**Archivos:**
- `custom_addons/servigas_core/data/hub_accounting_data.xml`
- `custom_addons/servigas_core/static/src/js/hubs/accounting_hub.*`
- `custom_addons/servigas_core/views/hub_menus.xml`

**Cambios:**
- Menú Facturación → **Resumen** (`servigas_accounting_hub`), sequence 0.
- 5 secciones: Resumen, Clientes, Proveedores, Informes, Configuración.
- 23 KPI cards: por cobrar/pagar, borradores, pagos, facturado hoy, análisis, plan contable.
- Dependencia `account`.

**Verificación:** `odoo-bin -u servigas_core -d servigas_dev` → Facturación → Resumen.

**Automatización:** copiar bloque `hub_accounting_data.xml`; ver mapa apps en Kit Hub Shell.

---

### 2026-07-03 — Hub Compras (réplica Inventario/Ventas)

**Área:** tema · compras  
**Motivo:** replicar App Hub Shell para app Compras (plan hub-rail-kpi-ingreso H5).

**Archivos:**
- `custom_addons/servigas_core/data/hub_purchase_data.xml`
- `custom_addons/servigas_core/static/src/js/hubs/purchase_hub.*`
- `custom_addons/servigas_core/views/hub_menus.xml`

**Cambios:**
- Menú Compras → **Resumen** (`servigas_purchase_hub`).
- 5 secciones rail + 19 KPI cards (RFQ, OC, recepciones, proveedores, informes).
- Dependencia `purchase`; métricas con `receipt_status` (purchase_stock).

**Verificación:** `odoo-bin -u servigas_core -d servigas_dev` → Compras → Resumen.

**Automatización:** plantilla sección `orders` + cards RFQ/OC en `hub.yaml`.

---

### 2026-07-03 — Hub Ventas (réplica Inventario)

**Área:** tema · ventas  
**Motivo:** replicar App Hub Shell para app Ventas (plan hub-rail-kpi-ingreso H4).

**Archivos:**
- `custom_addons/servigas_core/data/hub_sales_data.xml`
- `custom_addons/servigas_core/static/src/js/hubs/sales_hub.*`
- `custom_addons/servigas_core/views/hub_menus.xml`
- `custom_addons/servigas_core/models/sg_hub_card.py` (filtro métrica «hoy»)

**Cambios:**
- Menú Ventas → **Resumen** (`servigas_sales_hub`).
- 5 secciones rail + 22 KPI cards (pedidos, clientes, informes, config).
- Métricas «hoy» vía `metric_date_scope` en `sg.hub.card`.
- Dependencia `sale_management`.

**Verificación:** `odoo-bin -u servigas_core -d servigas_dev` → Ventas → Resumen.

**Automatización:** métricas `metric_date_scope: today` reutilizables desde `hub.yaml`.

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

**Automatización:** ver **Kit reutilizable — App Hub Shell** y propuesta `hub.yaml` (A8).

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
| Automatización hubs A8–A12 | `hub.yaml`, scaffold script, hub OWL genérico, skill Cursor, tests smoke |
| Hub OWL unificado (`SgAppHub`) | Eliminar 4× `*_hub.js` duplicados (refactor A10) |
| Rail expandible contextual | Ver [plan-rail-expandible-odoo.md](./plan-rail-expandible-odoo.md) — fase R3+ opcional |
| Montserrat en Odoo | Cargar Google Font en backend/POS |
| Modo oscuro Odoo (`web.assets_web_dark`) | Tokens glass para dark mode |
| Web Astro (`web/`) | Integración con marca pendiente |
| Validación venta POS | CONTEXT — pendiente |
| Stock masivo / ubicaciones | CONTEXT — pendiente |

---

*Última actualización: 2026-07-03 (automatización hubs App Shell)*
