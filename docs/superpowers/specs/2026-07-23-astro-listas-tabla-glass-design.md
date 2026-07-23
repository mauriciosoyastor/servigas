# Design: Listas Astro — tabla glass (híbrido desktop/móvil)

**Fecha:** 2026-07-23  
**Estado:** approved (diseño)  
**Repo:** servigas / `web/`  
**Superficie:** todas las rutas de lista que renderizan `RecordTable` + `ListToolbar` vía `lists/[...slug].astro`

## Problema

Las listas operativas se ven como planilla blanca dentro del shell oscuro Liquid Glass.

## Decisión

Híbrido C: desktop tabla densa glass; móvil cards &lt;768px. Un sistema para todas las listas.

## Alcance

En alcance: isla glass contenedor, on-dark, sticky charcoal, zebra+hover flame, cards móvil con data-label.  
Fuera: BFF, split maestro-detalle, detalle [id], POS.

## Verificación

`cd web && npm test`; checklist visual productos + lista sin imagen + móvil.
