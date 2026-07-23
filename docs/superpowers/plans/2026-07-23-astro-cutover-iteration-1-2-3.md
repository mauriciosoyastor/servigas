# Plan automatizado — iteración corte Astro (opciones 1→2→3)

**Fecha:** 2026-07-23  
**Estado:** en ejecución (empezar por opción 1)  
**ADR:** 0016  
**Smoke:** diferido (no bloquea esta corrida)

## Cola automática

| # | Opción | Rama | Done cuando |
|---|--------|------|-------------|
| **1** | Liquid Glass usable en mostrador | `cursor/astro-liquid-glass-mostrador-daee` | CTA flame, search command-bar, densidád POS, tokens alineados; suite verde |
| **2** | Huecos camino feliz (`coming_soon` / fricciones) | `cursor/astro-happy-path-gaps-daee` | Inventario de tiles/rutas coming_soon + cerrar al menos 1 gap operativo allowlisted; suite verde |
| **3** | Endurecer BFF (sin exigir Odoo up) | `cursor/astro-bff-harden-smoke-validation-daee` | Smoke script extendido (cotiz/RFQ/checkout steps) + validaciones API más claras; suite verde; smoke real = más tarde |

## Reglas

- Solo paridad camino feliz o endurecer BFF (ADR 0016).
- Un PR draft por opción; merge ordenado después.
- Actualizar checklist ADR al cerrar cada ítem aplicable.

## Orden de merge sugerido

`#1 Liquid Glass` → `#2 gaps` → `#3 BFF` → (smoke real más tarde) → corte autorizado.
