# Launcher Cool Accents + Brand Mark Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar acentos fríos (teal/cyan/blue/indigo) a las 4 tiles inferiores del home y reemplazar el logo en caja por isotipo (llama sola) + wordmark tipográfico «Servigas» en rail Astro, login Astro y login Odoo.

**Architecture:** Los `accent_key` viven en Odoo (`sg.app.tile`); Astro solo mapea keys a CSS vars. El mark es un PNG transparente compartido (web public + Odoo static); el nombre es texto HTML/CSS.

**Tech Stack:** Odoo 19 (`servigas_core` / `servigas_integrations`), Astro shell (`web/`), SCSS tokens, CSS tokens.

## Global Constraints

- Paleta inferior fija: Integraciones `#26A69A`, POS `#00BCD4`, Apps `#42A5F5`, Ajustes `#5C6BC0`.
- Keys: `cool-teal`, `cool-cyan`, `cool-blue`, `cool-indigo`.
- Wordmark: Sentence case **Servigas** (no all-lowercase).
- No cambiar acentos de la fila superior (`flame-*`).
- No commitear secretos; commits solo si el usuario lo pide.

---

## File map

| File | Responsibility |
|------|----------------|
| `custom_addons/servigas_core/static/src/scss/servigas_tokens.scss` | Tokens `$sg-cool-*` / CSS vars |
| `custom_addons/servigas_core/static/src/scss/servigas_launcher.scss` | Map `$sg-launcher-accents` |
| `custom_addons/servigas_core/models/sg_app_tile.py` | `setup_launcher_tile_accents` mapping |
| `custom_addons/servigas_core/static/src/img/servigas_mark.png` | Isotipo Odoo |
| `custom_addons/servigas_core/views/login_templates.xml` | Login Odoo mark + wordmark |
| `custom_addons/servigas_core/static/src/scss/servigas_login.scss` | Estilos mark/wordmark login |
| `custom_addons/servigas_core/__manifest__.py` | Bump version para assets/data |
| `web/src/styles/tokens.css` | CSS vars cool |
| `web/src/lib/bff/types.ts` | `AccentKey` union |
| `web/src/components/TileCard.astro` | Mapa accent → color |
| `web/public/servigas-mark.png` | Isotipo Astro |
| `web/src/components/RailNav.astro` | Brand mark + texto |
| `web/src/pages/login.astro` | Login brand mark + texto |
| `web/tests/shell-ui.test.mjs` (o test acentos) | Assert keys/CSS cool presentes |

---

### Task 1: Tokens cool + mapping Odoo + Astro TileCard

**Files:**
- Modify: `custom_addons/servigas_core/static/src/scss/servigas_tokens.scss`
- Modify: `custom_addons/servigas_core/static/src/scss/servigas_launcher.scss` (`$sg-launcher-accents`)
- Modify: `custom_addons/servigas_core/models/sg_app_tile.py` (`setup_launcher_tile_accents`)
- Modify: `custom_addons/servigas_core/__manifest__.py` (version bump patch)
- Modify: `web/src/styles/tokens.css`
- Modify: `web/src/lib/bff/types.ts`
- Modify: `web/src/components/TileCard.astro`
- Modify: `web/tests/shell-ui.test.mjs` (assert `cool-teal` / `--sg-cool-teal` en sources relevantes)

**Interfaces:**
- Consumes: xmlids existentes de tiles
- Produces: `accent_key` values `cool-teal|cool-cyan|cool-blue|cool-indigo` en DB tras setup; CSS vars `--sg-cool-*`

- [x] **Step 1:** Añadir tokens SCSS/CSS y keys al mapa launcher + TileCard + AccentKey
- [x] **Step 2:** Actualizar mapping en `setup_launcher_tile_accents` (reemplazar bg-* de las 4 tiles)
- [x] **Step 3:** Bump `__manifest__.py` version (p.ej. `19.0.1.20.32`)
- [x] **Step 4:** Test: assert en test suite que `TileCard`/`tokens.css` contienen `cool-teal` y hex `#26A69A` (o var)
- [x] **Step 5:** Aplicar accents en DB: `python odoo-bin -c ../config/servigas.conf -d servigas_dev --http-port=8070 -u servigas_core --stop-after-init` (o llamar `setup_launcher_tile_accents` vía shell)

---

### Task 2: Isotipo llama + wordmark (Astro rail/login + Odoo login)

**Files:**
- Create: `web/public/servigas-mark.png`
- Create: `custom_addons/servigas_core/static/src/img/servigas_mark.png`
- Modify: `web/src/components/RailNav.astro`
- Modify: `web/src/pages/login.astro`
- Modify: `custom_addons/servigas_core/views/login_templates.xml`
- Modify: `custom_addons/servigas_core/static/src/scss/servigas_login.scss`

**Interfaces:**
- Consumes: mark PNG transparente
- Produces: UI con llama + texto «Servigas», sin caja del logo compuesto

- [x] **Step 1:** Generar mark (recortar llama del logo oficial, fondo transparente) y copiar a ambos paths
- [x] **Step 2:** Rail: `<img class="sg-brand-mark" src="/servigas-mark.png?v=2">` + `<span class="sg-brand-name">Servigas</span>`
- [x] **Step 3:** Login Astro: mismo patrón (reemplazar logo compuesto)
- [x] **Step 4:** Login Odoo: img `servigas_mark.png` + span wordmark; estilos en `servigas_login.scss`
- [x] **Step 5:** Verificar visual: home `4321`, login Astro, `/web/login` en `8070`

---

## Verification checklist

- [ ] Home: 4 tiles inferiores con colores fríos distintos a flame-*
- [ ] Rail: llama sola + Servigas, sin caja oscura
- [ ] Login Astro + login Odoo: misma marca
- [ ] Tests web relevantes pasan
