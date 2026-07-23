# Design: POS — búsqueda por barcode + stock en tiles

**Fecha:** 2026-07-23  
**Estado:** approved (gap P1 camino a corte)  
**Repo:** servigas / `web/`

## Problema

`getPosCatalog` busca solo `name` / `default_code`. El barcode (código de barras del maestro) no entra. Las tiles no muestran `qty_available`.

## Decisión

1. Dominio de búsqueda: `name` OR `default_code` OR `barcode` (ilike).
2. Campos: agregar `barcode`, `qty_available`.
3. Payload producto: `barcode`, `qty_available`.
4. UI `/pos`: placeholder “nombre, código o barras”; stock en tile.

## No-objetivos

- Cliente en checkout (siguiente P1)
- IVA / centavos
- Exact-match boost / scanner buffer dedicado
