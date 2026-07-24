# Design: Búsqueda por barcode en listas de productos

**Fecha:** 2026-07-23  
**Estado:** approved (gap P1-5 camino a corte)  
**Repo:** servigas / `web/`

## Problema

Las listas de productos/variantes buscan solo `name` / `default_code`. El código de barras del maestro no entra (el POS ya sí).

## Decisión

1. Agregar `barcode` a `searchFields` de listas product (`products`, `variants`, `no-stock`, `stockables`, `no-price`).
2. Incluir `barcode` en `fields` / columna “Barras” donde aplique.
3. Placeholder de toolbar: mencionar barras si es lista de producto (opcional vía hint).

## No-objetivos

- Exact match / scanner buffer en listas
- Cambiar POS (ya cubierto en #18)
