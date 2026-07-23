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

## Resumen ejecutivo (estado al 2026-07-23)

| Área | Estado | Notas |
|------|--------|-------|
| Identidad visual | Hecho | Tokens llama + Montserrat (`servigas_tokens.scss`) |
| Backend Odoo | Hecho | Navbar, acentos flame, `servigas_hub.scss` |
| Hubs App Shell (OWL) | **Fallback** | Residual hasta día D operativo (smoke verde) |
| POS OWL | **Fallback** | Tema oscuro + glass; norte = POS Astro |
| Catálogo / datos | Hecho | 8.767 SKU importados |
| Facturación fiscal | Pendiente | Factura Web manual por ahora |
| Shell Astro BFF (`web/`) | **Shell oficial (go condicional)** | Corte autorizado 2026-07-23; deuda = smoke real Odoo |
| Infra GitHub (`main`) | Documentado | Ruleset versionado; aplicar con script o UI |

**Docs de referencia hubs:** [plan-hub-rail-kpi-ingreso.md](./plan-hub-rail-kpi-ingreso.md) · [plan-liquid-glass-kpi-routes.md](./plan-liquid-glass-kpi-routes.md)

---

## Entradas

### 2026-07-23 — Corte autorizado (condicional) shell Astro

**Área:** docs | web  
**Motivo:** cerrar el go/no-go de ADR 0016 sin fingir smoke real; Astro pasa a ser shell oficial con deuda pre-prod explícita.  
**Archivos:**
- `CONTEXT.md`
- `docs/adr/0016-astro-shell-cutover.md`
- `docs/proyecto/bitacora-cambios.md`
- `docs/superpowers/specs/2026-07-23-astro-cutover-go-condicional-design.md`
- `docs/superpowers/plans/2026-07-23-astro-cutover-go-condicional.md`
- `web/README.md`

**Cambios:**
- Texto canónico: corte autorizado (condicional); Astro = oficial; OWL = fallback; smoke = deuda.
- Checklist ADR: corte autorizado `[x]`; smoke sigue abierto como deuda pre-prod.
- Resumen ejecutivo alineado.

**Verificación:** leer `CONTEXT.md` § shell + ADR 0016 checklist; `cd web && npm test`. Smoke real: `cd web && npm run smoke:shell` (más tarde).  
**Automatización:** enganchar smoke shell a CI cuando haya Odoo deciable en el entorno.

---

### 2026-07-23 — Gobernanza: camino a corte Astro (ADR 0016)

**Área:** docs | web  
**Motivo:** fijar postura B (Astro reemplaza shell operativo OWL, incluyendo POS) y checklist go/no-go.  
**Archivos:**
- `docs/adr/0016-astro-shell-cutover.md`
- `CONTEXT.md`
- `docs/proyecto/bitacora-cambios.md`
- `web/README.md`

**Cambios:**
- Decisión B + alcance día D = shell + listas + POS Astro.
- OWL sigue prod hasta go explícito; filtro semanal anti-lab.
- Resumen ejecutivo actualizado a “camino a corte”.

**Verificación:** leer ADR 0016 + sección shell en `CONTEXT.md`.  
**Automatización:** checklist go/no-go → issues/smoke CI cuando haya session store durable.

---

### 2026-07-03 — Bitácora: kit automatización hubs App Shell

**Área:** docs  
**Motivo:** documentar cómo replicar rails + KPI cards en futuros proyectos Odoo sin reimplementar desde cero.

**Archivos:**
- `docs/proyecto/bitacora-cambios.md` *(este archivo)*

**Cambios:**
- Sección **Kit reutilizable — App Hub Shell** (checklist, mapa 4 apps, contrato `sg.hub.card`).
- Propuesta **`hub.yaml`** + comando `scaffold_odoo_hub.py` (backlog A9–A10).
- Refactor **hub OWL genérico** (A11), skill Cursor (A12), tests smoke (A13).
- Tabla errores frecuentes y verificación estándar.
- Resumen ejecutivo actualizado: hubs **Hecho** en v19.0.1.4.0.

**Verificación:** agente o humano sigue checklist «Por cada app Odoo» en nuevo repo.

**Automatización:** implementar A9–A13 en repo `odoo-hub-scaffold` o script en `scripts/`.

---

### 2026-07-22 — Spike Astro BFF shell (Fase A) — verificación

**Área:** web | docs  
**Motivo:** cerrar el spike `feature/astro-bff-shell`: shell Astro con BFF contra Odoo (login, launcher, rail, hub inventory) y dejar constancia de qué está probado y qué falta antes de un corte a producción.

**Archivos:**
- `web/` — SSR (`@astrojs/node`), `OdooAdapter`, rutas API auth/launcher/hub, páginas login/home/hubs, estilos `--sg-*`
- `web/tests/*.test.mjs` — 36 tests (adaptador, rutas, tile-nav, contratos UI)
- `docs/superpowers/plans/2026-07-22-astro-bff-shell-spike.md` — plan Tasks 1–7

**Cambios:**
- BFF con cookie httpOnly; sesión Odoo solo server-side.
- Launcher desde `sg.app.tile`; hub `inventory` desde `sg.hub.card` (sección `summary`).
- Tiles no-hub y clicks de cards → UI «Próximamente» (sin embed Odoo).
- Liquid Glass razonable vía tokens/shell CSS en Astro (paridad visual no validada contra instancia real).

**Verificación:**

| Check | Resultado |
|-------|-----------|
| `cd web && npm test` | **PASS** — 36/36 (11 suites) |
| Login contra Odoo dev | **Pendiente** — sin instancia/credenciales en esta sesión |
| Tiles reales en home | **Pendiente** |
| Rail → hub inventory | **Pendiente** (cubierto parcialmente por tests de contrato UI) |
| Cards reales en hub | **Pendiente** |
| No-hub / cards → Próximamente | **PASS** (unit: `tile-nav`, `shell-ui`) |
| Look Liquid Glass razonable | **Pendiente** — revisión visual manual |

**Commits del spike (rama `feature/astro-bff-shell`):** `434c5b2` … `f30ffff` (Tasks 1–6).

**Automatización:** smoke E2E con Odoo dev levantado (`web` + `ODOO_URL`); script CI `npm test` en `web/`; checklist manual Fase A reutilizable para Fase B (skill molde).
