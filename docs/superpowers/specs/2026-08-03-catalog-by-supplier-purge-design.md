# Diseño — Catálogo por proveedor + purge

**Fecha:** 2026-08-03  
**Estado:** Aprobado (conversación)  
**Proyecto:** Servigas (Odoo 19 Community + Astro BFF)  
**Alcance:** Vaciar catálogo (script), import CSV con categoría (tipo) + proveedor, UI de borrado de productos por categoría

## Resumen

Una sola base (`servigas_dev`). El catálogo se organiza por **tipo de producto** (`product.category`) y **proveedor** (`res.partner` + `product.supplierinfo`). Se vacía el catálogo actual con un script híbrido, se extiende el import de lista de precios, se reimporta con archivos del usuario, y después se habilita en el frontend borrar productos de una categoría.

## Decisiones

| Tema | Elección |
|------|----------|
| Bases Odoo | Una sola; no multi-DB por proveedor |
| Organización | Categoría = tipo; proveedor = partner + supplierinfo |
| Borrado | Híbrido: `unlink` → si falla, `active=false` + reporte |
| Wipe total | Solo script ops (una vez); sin botón “vaciar todo” en UI |
| UI purge | Después del reimport; por categoría exacta (`categ_id`), no recursivo |
| Import | Extender CSV/wizard existente (columnas `categoria` + `proveedor`) |

## Secuencia

1. **Wipe** — script `web/scripts/purge-product-catalog.mjs`
2. **Import extendido** — columnas nuevas en plantilla/parse/apply
3. **Reimport** — CSV del usuario vía UI
4. **UI purge** — ficha Categorías + API `purge-by-category`

## Import CSV

Plantilla:

```
barcode,default_code,name,list_price,standard_price,categoria,proveedor
```

| Columna | Crear | Actualizar |
|---------|-------|------------|
| `categoria` | get-or-create `product.category` por nombre; set `categ_id` | set `categ_id` si viene |
| `proveedor` | get-or-create `res.partner` (`supplier_rank>=1`); upsert `product.supplierinfo` (price = `standard_price` si viene) | misma lógica |

Sin columna → comportamiento actual. Match de producto: barcode → `default_code` → nombre.

## Wipe (script)

- Auth JSON-RPC Odoo (`ODOO_URL`, `ODOO_DB`, login/password env).
- Domain: `product.template` activos; flag `--include-archived`.
- Por id: unlink; catch → archive.
- No borra partners ni categorías.
- Output: deleted / archived / errors.

## UI purge por categoría

- Ruta ficha: `/lists/inventory/categories/:id`
- Preview: N productos activos con ese `categ_id`
- Confirmación: usuario escribe el nombre de la categoría
- API: `POST /api/inventory/products/purge-by-category` `{ categoryId, confirmName }`
- Resumen: X eliminados, Y archivados, Z errores

## Fuera de v1

Vaciar catálogo desde frontend; multi-DB; PDF→create; borrar la categoría misma; purge recursivo a subcategorías.

## Criterios de aceptación

1. Plantilla CSV incluye `categoria` y `proveedor`.
2. Apply crea/actualiza categoría y supplierinfo cuando vienen en la fila.
3. Script de wipe reporta deleted/archived/errors sin tumbar partners.
4. Purge por categoría exige `confirmName` igual al nombre de la categoría.
5. Purge solo afecta productos con ese `categ_id` exacto.
6. Productos con historial que no se pueden unlink quedan archivados y contados.
