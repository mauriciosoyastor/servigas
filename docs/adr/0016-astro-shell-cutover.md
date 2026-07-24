# ADR 0016 — Camino a corte: shell operativo Astro (+ POS)

**Estado:** Aceptado  
**Fecha:** 2026-07-23  
**Proyecto:** Servigas (Odoo 19 Community)

## Contexto

El shell operativo (launcher, rail, hubs, Liquid Glass) vive en OWL dentro de Odoo. En `web/` hay un frontend Astro + BFF que ya cubre login, hubs, listas allowlisted, writes mínimos y caja POS (numpad lite / descuentos).

Hasta ahora `web/` era un **spike / laboratorio**. Hay que elegir gobernanza para no mantener dos UIs sin dueño.

Posturas evaluadas:

| Postura | Idea |
|---------|------|
| A — Piloto paralelo | Astro = lab; OWL = prod sin fecha de corte |
| **B — Camino a corte** | Astro reemplaza el shell operativo; OWL queda hasta go/no-go |
| C — Split | Astro y OWL conviven por zonas a largo plazo |

## Decisión

Adoptar la **postura B — camino a corte**, con alcance de corte **completo del camino operativo**:

1. **Meta:** Astro (`web/`) es el shell operativo oficial: login → launcher → hubs → listas allowlisted → **POS caja Astro**.
2. **2026-07-23:** corte autorizado (condicional) → smoke verde → **día D operativo**.
3. **Regla de build:** endurecer BFF / paridad mostrador; no features de laboratorio OWL.
4. **Día D (ejecutado 2026-07-23):** launcher/menú OWL solo `base.group_system`; operativos sin home OWL; Odoo = backend; Astro = UI de negocio.
5. **Alcance del día D (opción 1):** shell + listas + **POS Astro** (sin fase POS diferida).

### Checklist go/no-go (mínimo)

- [x] Smoke camino feliz contra Odoo dev: login → hubs → producto → cotización/RFQ → venta POS Astro — OK 2026-07-23 (`npm run smoke:shell` y `SMOKE_MUTATE=1`)
- [x] Session store durable (reemplazo de `MemorySessionStore`) — #13
- [x] Errores BFF seguros + logout/timeout definidos — #24
- [x] Paridad Liquid Glass “usable en mostrador” (no pixel-perfect) — #27
- [x] Decisión explícita: “corte autorizado” en `CONTEXT.md` + bitácora — go condicional 2026-07-23
- [x] Día D: UI OWL de negocio apagada para operativos (`servigas_core` 19.0.1.20.31)

### Filtro semanal

| Pedido | ¿Se hace? |
|--------|-----------|
| Gap que bloquea el camino feliz | Sí |
| Session store / smoke CI | Sí |
| Offline POS / multi-caja | No — después del go operativo |
| Onboarding spotlight Astro (inicio→hub→caja) | Sí — slice post go condicional |
| Feature nueva de shell OWL | Solo hotfix prod; no invertir en paridad OWL |

### No-hacemos (hasta después del go operativo / smoke)

- Offline / multi-caja POS
- AFIP / facturación electrónica en este corte
- Pixel-perfect vs OWL
- Iframe / proxy de formularios Odoo en el camino feliz

**Nota:** onboarding spotlight Astro (inicio→hub→caja) está permitido post go condicional.

## Consecuencias

### Positivas

- Un solo norte de producto: deja de crecer el dual-stack “por curiosidad”.
- Prioriza endurecer BFF (sesión, smoke) antes de features grandes.
- El POS Astro ya avanzado entra en el criterio de corte (no queda huérfano).

### Negativas / riesgos

- Dual-stack válido hasta el go: costo de mantenimiento temporal.
- Si el go se estira, se paga dos frontends sin beneficio de corte.
- Drift de contratos `sg.app.tile` / `sg.hub.card` si se toca OWL sin portar.

## Referencias

- Spike: `docs/superpowers/specs/2026-07-22-astro-bff-shell-design.md`
- Playbook iteración: `docs/superpowers/plans/2026-07-22-astro-frontend-iteration-playbook.md`
- Resumen backlog: `docs/superpowers/plans/2026-07-22-astro-backlog-run-summary.md`
- Código: `web/` (Astro BFF); prod actual: `custom_addons/servigas_core`
