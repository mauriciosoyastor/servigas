# Plan — Catálogo por proveedor + purge

**Spec:** `docs/superpowers/specs/2026-08-03-catalog-by-supplier-purge-design.md`  
**Fecha:** 2026-08-03

## Tasks

### 1. Pure helpers + tests
- `web/src/lib/shell/product-purge.ts` — confirm name + hybridPurgeIds
- Extender `price-list-import.ts` — mapping/normalize/template
- Tests: `product-purge.test.mjs`, ampliar `price-list-import.test.mjs`

### 2. Wipe script
- `web/scripts/purge-product-catalog.mjs`
- npm script `purge:products`

### 3. Adapter + types + backend-client
- `applyPriceListImport` con categ_id + supplierinfo
- `purgeProductsByCategory` / `countProductsInCategory`
- Types preview/apply lines

### 4. API + UI import
- Preview columns categoria/proveedor
- Template actualizado

### 5. API + UI purge
- `POST /api/inventory/products/purge-by-category`
- `lists/inventory/categories/[id].astro` + control

### 6. Ops
- Correr wipe en servigas_dev
- Reimport cuando el usuario entregue CSV
