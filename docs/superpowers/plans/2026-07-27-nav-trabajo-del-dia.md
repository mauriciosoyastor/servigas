# Nav trabajo del día (opción B) — Implementation Plan

> **For agentic workers:** Implement task-by-task with TDD. Steps use checkbox syntax.

**Goal:** Reorganizar la navegación Astro por trabajo del día (Mostrador/Caja/Stock/Compras/Cobros), hubs flacos e Inicio con atajos primero.

**Architecture:** Extraer seams puros (`rail-nav`, `hub-nav`, `launcher-nav`) consumidos por `RailNav`, hubs e `index`. Sin cambiar rutas `/lists/*` ni allowlists; solo presentación y rail.

**Tech Stack:** Astro BFF, Node test runner (`web/tests/*.test.mjs`)

## Global Constraints

- Labels rail: Inicio · Mostrador · Caja · Stock · Compras · Cobros
- Hubs Odoo keys intactas: `inventory` | `sales` | `purchase` | `accounting`
- Secciones `reporting` + `config` detrás de «Más»
- Resumen hub: máx. 5 cards visibles
- POS/Caja: `active` rail `pos` / `caja`

## Contrato (aceptación)

1. Rail muestra Mostrador→`/pos`, Caja→`/caja`, Stock→`/hubs/inventory`, Compras→`/hubs/purchase`, Cobros→`/hubs/accounting` (sin Ventas en rail).
2. Hub subnav: secciones primarias visibles; Informes/Config en «Más».
3. Hub resumen: como máximo 5 cards.
4. Inicio: ops-strip primero; tiles hub en «Áreas»; tiles action en «Más accesos» colapsable; labels Stock/Cobros en display.
5. `/pos` y `/caja*` marcan rail `pos`/`caja`.

## Tasks

- [x] T1: `rail-nav.ts` + tests; wire `RailNav.astro`; active pos/caja
- [x] T2: `hub-nav.ts` + tests; wire hub page + HubSubnav «Más»; labels
- [x] T3: `launcher-nav.ts` + tests; wire `index.astro`
- [x] T4: tour + shell-ui contracts; `npm test`
---
