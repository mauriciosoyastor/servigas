# Liquid Glass v2 — adaptación a Odoo (Servigas)

**Estado:** acordado · **ADR:** [0001-liquid-glass-odoo-frontend.md](../adr/0001-liquid-glass-odoo-frontend.md)  
**Skill de referencia:** `liquid-glass-v2-routes` (patrones CRM Astro → mapeo Odoo)

Este documento es la guía canónica para modificar el frontend de Odoo 19 en Servigas. No copiar CSS del CRM Astro tal cual: **traducir patrones** a SCSS + assets del módulo `servigas_core`.

---

## Objetivo UX (igual que dashboard v2)

Experiencia **Liquid Glass iOS (Regular)**:

- Fondo ambiental continuo (sin bandas horizontales entre bloques).
- Islas glass (KPIs, command bar, paneles de resumen) con blur + borde luminoso.
- Microinteracciones suaves con respeto a `prefers-reduced-motion`.
- Un solo scroll vertical por vista.
- Listas operativas (productos, movimientos) **sin** glass por fila.

---

## Arquitectura en Odoo

```
servigas_core/
├── static/src/scss/
│   ├── servigas_tokens.scss      # --sg-* (mapeo desde --crm-glass-*)
│   ├── servigas_backend.scss     # backend web (formularios, listas, menú)
│   └── servigas_pos.scss         # Punto de venta
├── static/src/js/                # parches OWL opcionales
└── __manifest__.py               # bundles assets_backend, point_of_sale.assets
```

### Bundles Odoo 19

```python
# __manifest__.py (cuando se implementen estilos)
'assets': {
    'web.assets_backend': [
        'servigas_core/static/src/scss/servigas_tokens.scss',
        'servigas_core/static/src/scss/servigas_backend.scss',
    ],
    'point_of_sale._assets_pos': [
        'servigas_core/static/src/scss/servigas_tokens.scss',
        'servigas_core/static/src/scss/servigas_pos.scss',
    ],
},
```

---

## Tokens — namespace Servigas (`--sg-*`)

Mapeo desde tokens CRM Astor (`docs/design/tokens.md` en repo astorproptech):

| Token Astor (referencia) | Token Servigas | Uso en Odoo |
|--------------------------|----------------|-------------|
| `--crm-paper` | `--sg-paper` | Fondo base módulo / pantalla |
| `--crm-canvas` | `--sg-canvas` | Fondo secundario shell |
| `--crm-glass-fill` | `--sg-glass-fill` | Paneles, cards resumen |
| `--crm-glass-fill-strong` | `--sg-glass-fill-strong` | Command bar, subnav pill activa |
| `--crm-glass-blur` | `--sg-glass-blur` | `backdrop-filter` paneles |
| `--crm-glass-border` | `--sg-glass-border` | Borde semitransparente |
| `--crm-glass-rim` | `--sg-glass-rim` | Highlight superior (`inset` shadow) |
| `--astor-accent-lime` | `--sg-accent` | KPI positivo, badge stock OK |
| `--astor-accent-purple` | `--sg-accent-alt` | Filtro activo, tab seleccionada |
| `--astor-primary-dark` | `--sg-primary` | CTA fuerte, botón cobrar POS |

**Regla:** no usar clases `.crm-dashboard-*` en Odoo. Prefijo obligatorio: `.sg-*` o `.o_servigas_*`.

### Ejemplo token base

```scss
// servigas_tokens.scss
:root {
  --sg-paper: #f5f4f1;
  --sg-canvas: #ebeae6;
  --sg-glass-fill: rgba(255, 255, 255, 0.55);
  --sg-glass-fill-strong: rgba(255, 255, 255, 0.72);
  --sg-glass-blur: 16px;
  --sg-glass-border: rgba(255, 255, 255, 0.35);
  --sg-glass-rim: inset 0 1px 0 rgba(255, 255, 255, 0.6);
  --sg-accent: #b5ff00;
  --sg-accent-alt: #8620f2;
  --sg-primary: #111111;
  --sg-radius-card: 12px;
  --sg-radius-pill: 999px;
}
```

---

## Patrones por tipo de pantalla

Elegir patrón **antes** de codificar (skill §1):

| Pantalla Servigas | Patrón | Notas Odoo |
|-------------------|--------|------------|
| **POS mostrador** | Híbrido | Búsqueda por código fabricante prominente; glass en header/categorías; grid producto limpio |
| **Lista productos / movimientos** | Lista densa | Sin `backdrop-filter` por fila; tipografía y spacing del skill Contactos |
| **Ficha producto** | Híbrido | Glass en bloques precio/stock; form estándar Odoo debajo |
| **Informes inventario / ventas** | Dashboard v2 | KPI cards glass + paneles; un scroll |
| **Compras / proveedores** | Lista densa + glass header | KPIs opcionales arriba |
| **Ajustes empresa** | Secciones agrupadas | Scroll único, sin forzar ViewShell completo |

**No forzar** ViewShell + subnav si la pantalla es solo una lista CRUD estándar Odoo.

---

## Superficies glass (clases Servigas)

| Superficie | Clase | Equivalente dashboard |
|------------|-------|------------------------|
| Command bar / búsqueda POS | `.sg-command-bar` | `.crm-dashboard-command-bar` |
| KPI / resumen stock | `.sg-glass-kpi` | `.crm-dashboard-glass-kpi` |
| Panel lateral / agrupación | `.sg-glass-panel` | `.crm-dashboard-glass-panel` |
| Subnav interna (si hay tabs) | `.sg-subnav` | `.crm-dashboard-subnav` |

### Mixin glass recomendado

```scss
@mixin sg-glass-surface($elevated: false) {
  background: if($elevated, var(--sg-glass-fill-strong), var(--sg-glass-fill));
  backdrop-filter: blur(var(--sg-glass-blur));
  border: 1px solid var(--sg-glass-border);
  box-shadow: var(--sg-glass-rim);
  border-radius: var(--sg-radius-card);
}
```

**Prohibido:** `linear-gradient` vertical paper→canvas en contenedores de página (deja costura entre cards).

---

## Layout y scroll

### Flex chain (backend)

```
.sg-module-root     → flex: 1; flex-basis: 0; min-height: 0; flex-direction: column
  └─ .sg-page       → flex: 1; min-height: 0; background: transparent
       └─ .sg-scroll → height: 100%; overflow-y: auto  (único scroll owner)
```

### Frame de contenido

```scss
.sg-content-frame {
  width: 100%;
  max-width: 80rem;
  margin-inline: auto;
  padding-inline: 1rem;
  @media (min-width: 768px) { padding-inline: 1.5rem; }
}
```

### Subnav sticky (si hay sub-vistas)

- `position: sticky; top: 0` **dentro** del scroll area.
- Track **transparente**; solo pill en tab activa.
- Mismo padding horizontal que `.sg-content-frame`.

---

## Motion

| Clase | Uso |
|-------|-----|
| `.sg-view-enter` | Primera carga de vista custom |
| `.sg-stagger-list` / `.sg-stagger-item` | Entrada de bloques KPI |
| `.sg-motion-control` | Botones glass (press scale) |

Siempre respetar `prefers-reduced-motion: reduce`.

---

## POS — prioridades Servigas

1. **Búsqueda por código fabricante** — campo grande, estilo command bar (`.sg-command-bar`).
2. **Categorías** — pills horizontales (patrón subnav).
3. **Línea de pedido** — legible, sin glass excesivo.
4. **Botón cobrar** — `--sg-primary`, alto contraste.
5. **Descuento manual** — control visible; no ocultar en menús profundos.

---

## Checklist por pantalla Odoo

```
Liquid Glass Odoo — <pantalla>:
- [ ] 1. Patrón elegido (lista / dashboard / híbrido / POS)
- [ ] 2. Tokens --sg-* usados (no crm-dashboard-*)
- [ ] 3. Canvas continuo sin gradientes verticales
- [ ] 4. Scroll owner único
- [ ] 5. Glass solo en KPIs / command bar / paneles
- [ ] 6. prefers-reduced-motion respetado
- [ ] 7. Assets en manifest correcto (backend vs POS)
- [ ] 8. Prueba manual en 1280px y móvil (POS tablet)
```

---

## Errores conocidos (Odoo)

| Síntoma | Causa probable | Fix |
|---------|----------------|-----|
| Estilos no aplican | Bundle incorrecto en manifest | Verificar `web.assets_backend` vs `point_of_sale._assets_pos` |
| POS se rompe tras SCSS | Selector demasiado agresivo | Scope bajo `.pos` o `.o_pos_*` |
| Doble scroll | List view Odoo + wrapper custom | No envolver listas estándar; solo vistas custom |
| Glass ilegible | Blur sobre fondo busy | Subir `--sg-glass-fill-strong` o bajar blur |

---

## Fuentes canónicas (fuera de este repo)

| Recurso | Ruta |
|---------|------|
| Skill Cursor | `~/.cursor/skills/liquid-glass-v2-routes/SKILL.md` |
| Playbook migración | `astorproptech/docs/design/migration-liquid-glass-v2-routes.md` |
| Dashboard piloto | `astorproptech/docs/design/dashboard-v2-liquid-glass.md` |
| Tokens | `astorproptech/docs/design/tokens.md` |

---

## Orden de implementación sugerido

1. `servigas_tokens.scss` + carga en manifest  
2. **POS** — mayor impacto mostrador  
3. **Inventario → Productos** — lista + formulario  
4. Informes / KPIs  
5. Compras y contabilidad
