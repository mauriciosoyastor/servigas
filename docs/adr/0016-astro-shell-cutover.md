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
2. **Hoy (2026-07-23):** **corte autorizado (condicional)** — Astro = shell oficial; OWL = fallback; smoke real = deuda pre-prod (`CONTEXT` + bitácora).
3. **Regla de build:** solo slices que suman **paridad del camino feliz** o **endurecen el BFF**; no features de laboratorio.
4. **Después del día D operativo** (smoke verde en el entorno objetivo): hubs/launcher/POS OWL dejan de ser UI de negocio; Odoo sigue como backend (y assets residuales si hacen falta).
5. **Alcance del día D (opción 1):** shell + listas + **POS Astro** en un solo corte operativo (no fase POS diferida).

### Checklist go/no-go (mínimo)

- [ ] Smoke camino feliz contra Odoo dev: login → hubs → producto → cotización/RFQ → venta POS Astro — **deuda pre-prod del go condicional** (`cd web && npm run smoke:shell`)
- [x] Session store durable (reemplazo de `MemorySessionStore`) — #13
- [x] Errores BFF seguros + logout/timeout definidos — #24
- [x] Paridad Liquid Glass “usable en mostrador” (no pixel-perfect) — #27
- [x] Decisión explícita: “corte autorizado” en `CONTEXT.md` + bitácora — go condicional 2026-07-23

### Filtro semanal

| Pedido | ¿Se hace? |
|--------|-----------|
| Gap que bloquea el camino feliz | Sí |
| Session store / smoke CI | Sí |
| Offline POS / recorrido / onboarding | No — después del go |
| Feature nueva de shell OWL | Solo hotfix prod; no invertir en paridad OWL |

### No-hacemos (hasta después del go)

- Offline / multi-caja POS
- Recorrido / onboarding Astro
- AFIP / facturación electrónica en este corte
- Pixel-perfect vs OWL
- Iframe / proxy de formularios Odoo en el camino feliz

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
