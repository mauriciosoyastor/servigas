# Plan automatizado — iteración corte Astro (opciones 1→2→3)

**Fecha:** 2026-07-23  
**Estado:** cerrado (#1–#3 mergeados)  
**ADR:** 0016  
**Smoke:** diferido (script listo; no bloquea esta corrida)

## Cola automática

| # | Opción | Rama / PR | Done cuando | Estado |
|---|--------|-----------|-------------|--------|
| **1** | Liquid Glass usable en mostrador | `cursor/astro-liquid-glass-mostrador-daee` (#27) | CTA flame, search command-bar, densidad POS, tokens alineados; suite verde | mergeado |
| **2** | Huecos camino feliz (`coming_soon` / fricciones) | `cursor/astro-happy-path-gaps-daee` (#28) | Inventario de tiles/rutas coming_soon + cerrar al menos 1 gap operativo allowlisted; suite verde | mergeado |
| **3** | Endurecer BFF (sin exigir Odoo up) | `cursor/astro-bff-harden-smoke-validation-daee` (#29) | Smoke script extendido (cotiz/RFQ/checkout steps) + validaciones API más claras; suite verde; smoke real = más tarde | mergeado |

## Reglas

- Solo paridad camino feliz o endurecer BFF (ADR 0016).
- Un PR draft por opción; merge ordenado después.
- Actualizar checklist ADR al cerrar cada ítem aplicable.

## Orden de merge

`#27 Liquid Glass` → `#28 gaps` → `#29 BFF` → (smoke real más tarde) → corte autorizado.
