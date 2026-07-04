# Límites OWL/Odoo + Liquid Glass v2 — Guardrails de diseño

**Estado:** vigente · **Proyecto:** Servigas (Odoo 19 Community)  
**Propósito:** Antes de proponer o implementar cualquier cambio de UI, validar si es viable en OWL/Odoo. Si no lo es, **avisar explícitamente** y ofrecer alternativa.

**Leer junto con:**

- [liquid-glass-odoo.md](./liquid-glass-odoo.md) — cómo implementar
- [servigas-brand.md](./servigas-brand.md) — tokens de marca
- [ADR 0001](../adr/0001-liquid-glass-odoo-frontend.md) — decisión arquitectónica
- Skill Cursor: `liquid-glass-v2-routes` (patrones origen Astro → traducir, no copiar)

---

## 1. Stack real (de abajo hacia arriba)

```
PostgreSQL + Python (lógica de negocio, ir.ui.view, workflows)
        ↓
XML views (campos, botones, acciones — INTOCABLES en rediseño visual)
        ↓
OWL runtime (@odoo/owl) — componentes, servicios, action manager
        ↓
Vistas genéricas Odoo (List, Form, Kanban, Search, Graph, Pivot…)
        ↓
Bootstrap 5 + variables SCSS Odoo ($o-*, .o_*)
        ↓
Capa Servigas: tokens --sg-* + SCSS + componentes OWL custom (hubs)
        ↓
Liquid Glass v2 (patrones visuales — glass, rail, KPI, command bar)
```

**Regla de oro:** el rediseño vive en la **capa Servigas**. No reescribir la capa OWL/Odoo salvo client actions nuevas.

---

## 2. Qué es cada cosa (para no confundir)

| Concepto | Qué hace | Qué NO es |
|----------|----------|-----------|
| **OWL** | Framework de componentes (como React) | Design system |
| **Odoo web client** | Shell + vistas + servicios (`orm`, `action`, `dialog`) | App SPA independiente |
| **Liquid Glass v2** | Sistema visual (tokens, glass, motion) | Librería npm instalable en Odoo |
| **servigas_core** | Módulo que aplica LG v2 a Odoo | Reemplazo del core Odoo |

---

## 3. Tres capas de implementación (S / O / X)

Todo cambio de UI debe clasificarse **antes** de codificar:

| Capa | Sigla | Qué incluye | Riesgo upgrade | Cuándo usar |
|------|-------|-------------|----------------|-------------|
| **Estilos** | **S** | SCSS, variables `$o-*` / `--sg-*`, selectores `.o_*` | Bajo | Navbar, botones, colores, POS, stat buttons |
| **OWL custom** | **O** | Componentes nuevos, `ir.actions.client`, servicios | Medio | Hubs, KPI strip, dashboards, command bar POS |
| **XML inherit** | **X** | Herencia de vistas/templates Odoo | Medio-alto | Añadir clases, banners, slots — no reestructurar DOM |

### Orden de preferencia

1. **S** si alcanza
2. **S + X** si hace falta enganchar markup
3. **O** solo para pantallas nuevas o envoltorios (hubs)
4. **Nunca** reemplazar List/Form/Kanban completos

---

## 4. Lo que SÍ se puede modernizar (sin romper Odoo)

| Superficie | Enfoque LG v2 | Capa | Ejemplo Servigas |
|------------|---------------|------|------------------|
| Entrada por app | Hub + rail + KPI cards glass | O+S | `InventoryHub`, `SgEntryCard` |
| Navbar global | Tema carbón + acentos llama | S | `servigas_backend.scss` |
| Botones CTA | Gradiente llama | S | `servigas_primary_variables.scss` |
| POS completo | Tema oscuro + glass header/tiles | S | `servigas_pos.scss` |
| Búsqueda POS | Command bar glass | S (+O si wrapper) | `.pos-search-bar input` |
| Stat buttons en forms | Mini KPI glass | S | `.oe_stat_button` |
| Informes | Dashboard KPI + paneles | O+S | Pendiente |
| Listas operativas | Lista densa + KPI strip arriba | S+O | Pendiente `.sg-kpi-strip` |
| Ajustes | Secciones agrupadas, scroll único | S | Sin glass excesivo |

---

## 5. Lo que NO funciona (avisar siempre)

### 5.1 Propuestas que deben rechazarse o redirigirse

| Propuesta del usuario | Por qué NO funciona en OWL/Odoo | Alternativa viable |
|----------------------|----------------------------------|-------------------|
| «Reemplazar el navbar por sidebar fija tipo Notion» | El navbar es OWL core; menús vienen de `ir.ui.menu` dinámico | Hub con rail **dentro** de cada app (ya hecho) |
| «Command palette global ⌘K en todo Odoo» | Requiere interceptar action service + menús globales | Command bar solo en POS / búsqueda productos |
| «Glass en cada fila de lista de 8.767 productos» | `backdrop-filter` × N filas = ilegible + lag | Lista densa sin glass; glass solo en header/KPI strip |
| «Copiar CSS del CRM Astro (`.crm-dashboard-*`)» | DOM distinto; clases no existen en Odoo | Traducir a `--sg-*` / `.sg-*` |
| «Un solo scroll con ViewShell envolviendo listas estándar» | List views tienen scroll propio en `.o_list_view` | ViewShell **solo** en client actions (hubs) |
| «Reescribir Form view de producto en OWL» | Pierde widgets, chatter, smart buttons, workflows | SCSS en stat buttons + paneles; form nativo |
| «Usar Tailwind/MUI en backend Odoo» | Compite con Bootstrap/Odoo bundles | Tokens `--sg-*` + mixins SCSS propios |
| «Eliminar statusbar / botones Guardar del form» | Definidos en XML; rompe workflow | Restyle con flame CTA (S) |
| «POS y backend con el mismo bundle CSS» | Bundles separados (`web.assets_backend` vs `point_of_sale._assets_pos`) | Dos hojas: `servigas_backend.scss` + `servigas_pos.scss` |
| «Dark mode backend igual que POS» | Listas largas en oscuro = fatiga; Odoo tiene dark mode propio | Backend claro (paper) + POS oscuro (marca) |
| «Iframe de Odoo dentro de app externa» | Fuera de alcance módulo; pierde sesión/acciones | Client actions + SCSS dentro de Odoo |
| «Cambiar orden de columnas/campos por CSS» | Campos vienen del XML | `ir.ui.view` inherit (X) — solo si negocio lo pide |
| «Animación stagger en listas con 500 filas» | Performance + accesibilidad | Stagger solo en hubs (≤8 cards) |
| «Quitar Discuss / apps del app switcher» | Menús/reglas de seguridad | `servigas_integrations` oculta menús (datos), no OWL |

### 5.2 Señales de alerta en una propuesta

Si la propuesta incluye **cualquiera** de estas frases, **detener y avisar**:

- «Reemplazar la list view / form view»
- «Copiar-pegar de Astro/React»
- «Envolver todas las pantallas en un layout custom»
- «Glass en toda la UI»
- «Unificar POS y backend en un solo tema/archivo»
- «Modificar `@odoo/owl` o el módulo `web` core»
- «Sin probar en bundle correcto del manifest»

---

## 6. Árbol de decisión (agentes y humanos)

```
¿La pantalla es vista estándar Odoo (list/form/kanban)?
├─ SÍ → ¿Solo cambia apariencia (color, tipografía, botones)?
│        ├─ SÍ → Capa S (SCSS). Sin glass en filas.
│        └─ NO → ¿Necesita layout nuevo (dashboard, rail)?
│                 ├─ SÍ → ¿Puede ser pantalla de ENTRADA separada?
│                 │        ├─ SÍ → Client action OWL (hub) + S
│                 │        └─ NO → ⚠️ AVISAR: alto riesgo; proponer KPI strip o SCSS parcial
│                 └─ NO → Capa S
└─ NO → ¿Es client action o POS?
         ├─ POS → Capa S (+ O si componente nuevo). Bundle POS.
         └─ Client action → Capa O+S. Aplicar invariantes LG v2 completos.
```

---

## 7. Invariantes Liquid Glass v2 en Odoo (no negociables)

1. **Canvas continuo** — sin gradientes verticales que corten secciones
2. **Glass solo** en KPIs, command bar, paneles — **nunca** por fila en listas
3. **Un scroll owner** por vista (hubs sí; listas estándar no envolver)
4. **Subnav sticky** con pill activa (hubs, categorías POS)
5. **`prefers-reduced-motion: reduce`** siempre
6. Prefijos **`--sg-*` / `.sg-*`** — nunca `.crm-dashboard-*`
7. **Funcionalidad Odoo intacta:** mismos campos, botones, workflows, permisos

---

## 8. Bundles — error más común

Los estilos **no aplican** si el manifest no registra assets:

| Bundle | Contenido Servigas |
|--------|-------------------|
| `web._assets_primary_variables` | `servigas_primary_variables.scss` |
| `web.assets_backend` | tokens → backend → hub (en ese orden) |
| `point_of_sale._assets_pos` | tokens → pos |

**Verificación obligatoria:** tras cambio de tema, `odoo-bin -u servigas_core` y hard refresh.

---

## 9. Componentes OWL permitidos (patrón Servigas)

### Crear componentes OWL nuevos cuando

- Pantalla es `ir.actions.client` (hubs)
- Necesitás KPI strip, dashboard o command bar con lógica
- Reutilización entre apps (rail, entry card)

### Usar componentes `@web/*` cuando

- Dropdown, dialog, pager, checkbox estándar
- No reinventar lo que Odoo ya mantiene

### Patrón de referencia en repo

```
servigas_core/static/src/js/
├── components/     → SgSectionRail, SgEntryCard
├── hubs/           → InventoryHub, SalesHub, …
└── services/       → sg_hub (orm + action.doAction)
```

**Navegación desde hub:** siempre `action.doAction(card.action)` — no rutas custom.

---

## 10. Protocolo para agentes Cursor

Antes de **proponer o implementar** cambios de UI:

1. Leer este documento + [liquid-glass-odoo.md](./liquid-glass-odoo.md) + skill `liquid-glass-v2-routes`
2. Clasificar capa (S / O / X) y pantalla (hub / lista / form / POS)
3. Cruzar con tabla §5.1 — si hay match → **avisar al usuario antes de continuar**
4. Verificar bundle manifest
5. No tocar lógica Python/XML de negocio salvo pedido explícito
6. Al cerrar: entrada en [bitacora-cambios.md](../proyecto/bitacora-cambios.md)

### Plantilla de aviso al usuario

> ⚠️ **Límite OWL/Odoo:** [propuesta] no es viable porque [razón].  
> **Alternativa recomendada:** [enfoque S/O/X concreto], alineada a Liquid Glass v2.

---

## 11. Alcance máximo del diseño moderno (realista)

Lo más radical **permitido** sin romper Odoo:

| Nivel | Alcance | Percepción usuario |
|-------|---------|-------------------|
| **N1 — Tema** | Variables + navbar + CTAs flame | «Odoo con marca Servigas» |
| **N2 — POS** | Tema oscuro glass completo | «App de mostrador propia» |
| **N3 — Hubs** | Rail + KPI cards por app (4 apps) | «Entrada moderna por módulo» |
| **N4 — Strip + stats** | KPI compacto en listas + stat buttons glass | «Datos antes de entrar» |
| **N5 — Informes** | Dashboards OWL en informes clave | «Panel ejecutivo» |

**Fuera de alcance (N6+):** reemplazo total del shell Odoo, SPA externa, reescritura de vistas CRUD.

---

## 12. Checklist pre-merge UI

- [ ] Capa S/O/X identificada
- [ ] No está en tabla §5.1 (propuestas inviables)
- [ ] Invariantes §7 respetados
- [ ] Bundle manifest correcto
- [ ] POS y backend probados por separado si aplica
- [ ] Venta POS / guardar form / abrir acción desde hub verificados
- [ ] Bitácora actualizada
