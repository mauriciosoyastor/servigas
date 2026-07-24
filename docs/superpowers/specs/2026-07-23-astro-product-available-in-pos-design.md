# Design: Product create defaults `available_in_pos`

**Fecha:** 2026-07-23  
**Estado:** approved (gap P0-2 camino a corte)  
**Repo:** servigas / `web/`

## Problema

Alta de producto en Astro setea `sale_ok` + `is_storable` pero no `available_in_pos`. El catálogo de caja filtra `available_in_pos = true`, así que el producto nuevo no aparece en `/pos`.

## Decisión

1. Agregar `available_in_pos: true` a `createDefaults` de `inventory/products`.
2. No exponer el flag en el form (default server-side allowlisted).
3. Actualizar hint de alta: vendible, almacenable y disponible en caja.

## No-objetivos

- Toggle UI para desactivar POS
- Migrar productos ya creados sin el flag
- Barcode / categoría
