# Design: Liquid Glass usable en mostrador (Astro)

**Fecha:** 2026-07-23  
**Estado:** approved (go/no-go ADR 0016 — paridad usable, no pixel-perfect)  
**Repo:** servigas / `web/`  
**Plan cola:** `docs/superpowers/plans/2026-07-23-astro-cutover-iteration-1-2-3.md` opción 1

## Problema

El shell Astro ya usa Montserrat y tokens `--sg-*`, pero la caja `/pos` no “se lee” como mostrador Servigas: el botón Cobrar es glass débil, la búsqueda es chica, la selección de línea/numpad no usa acento llama, y el chrome del shell resta viewport.

## Analogía

Hoy el mostrador tiene las herramientas correctas pero con luz de depósito.  
Queremos la luz de la llama Servigas en lo que el cajero mira todo el día: buscar, seleccionar, cobrar.

## Decisión (mínimo usable)

1. **Tokens:** `--sg-primary` / `--sg-accent`; `--sg-radius-card: 12px` (alineado OWL/Tailwind).
2. **`/pos` Cobrar:** fondo `--sg-flame-gradient`, texto blanco, min-height ~3rem, sombra flame.
3. **Búsqueda POS:** command-bar lite — min-height ~2.75rem, pill, focus naranja, tipo ~1.05rem.
4. **Selección:** línea `is-selected` y modo numpad activo con tinte flame + borde/acento.
5. **Hit targets:** qty ± ≥ 2rem.
6. **Chrome compacto en POS:** `ShellLayout` con `compact` (menos margen topbar) + heading Caja más chico.
7. **Login CTA:** `var(--sg-flame-gradient)` completo.

## No-objetivos

- Pixel-perfect vs OWL
- Categorías POS / logo isotipo SVG
- Stagger animations nuevas (reduced-motion ya existe)
- Cambiar flujos de negocio

## Verificación

- `cd web && npm test`
- Checklist visual mental: Cobrar se ve “llama”; search grande; ticket seleccionable
