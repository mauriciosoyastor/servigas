# Design: Pickers con búsqueda en alta cotización / RFQ

**Fecha:** 2026-07-23  
**Estado:** approved (gap P0-1 camino a corte)  
**Repo:** servigas / `web/`

## Problema

`OrderCreateForm` usa `<select>` precargado con página 1 (`limit: 50`). Con ~8.7k SKUs y muchos partners, la mayoría son inalcanzables.

## Decisión

1. Reemplazar selects por **typeahead** (input + lista + id oculto).
2. Buscar vía BFF existente: `GET /api/lists/{listKey}?q=&page=1`.
3. Listas: partners `sales/customers` o `purchase/vendors`; productos `inventory/variants`.
4. Helpers puros en `order-create-pickers.ts` (labels + URL).
5. Páginas `new.astro` ya no precargan 50 filas SSR.

## No-objetivos

- Multi-línea (P0-4)
- Crear partner/producto inline
- Infinite scroll en el picker (page 1 de resultados de búsqueda alcanza)
