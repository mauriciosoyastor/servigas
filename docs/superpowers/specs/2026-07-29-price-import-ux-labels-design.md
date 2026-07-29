# Design: UX clara en carga CSV de productos/precios

**Fecha:** 2026-07-29  
**Estado:** implementado  
**Alcance:** `/lists/inventory/products/import` (preview)  
**Relacionado:** `2026-07-23-inventory-price-list-import-design.md` (lógica de match/apply intacta)

## Problema

El preview muestra códigos internos (`create`, `no_match`, `invalid_price`, `missing_name`). Quien carga el CSV no sabe qué corregir ni cuántas filas se van a importar al confirmar.

## Objetivo

Claridad en español + guía en el paso 2 (preview), **sin** cambiar reglas de negocio (sigue exigiendo nombre y precio de venta válidos; errores no se importan).

## No-goals

- Editar celdas en vivo en el preview
- Aceptar productos sin precio de venta
- Cambiar el contrato JSON de `/api/inventory/price-list-import` (los `reason`/`status` codes se mantienen)
- Filtros avanzados / wizard multi-paso nuevo

## Enfoque

Glosario en el módulo puro + UI que lo consume.

### 1. Glosario (`web/src/lib/shell/price-list-import.ts`)

Exportar helpers puros (testables):

- `labelImportStatus(status)` → texto corto de columna Estado  
  - `create` → Crear  
  - `update` → Actualizar  
  - `review` → Revisar  
  - `error` → Error  

- `labelImportReason(reason)` → mensaje accionable de Motivo  
  - `no_match` → Producto nuevo (no encontrado en stock)  
  - `barcode` / `default_code` / `name` → Encontrado por código de barras / código / nombre  
  - `ambiguous_*` → Varios productos coinciden; revisá el CSV  
  - `invalid_price` → Falta o es inválido el precio de venta  
  - `missing_name` → Falta el nombre  
  - desconocido → el código tal cual (fallback)

Los codes en `MatchResult.reason` / `status` **no cambian**.

### 2. UI preview (`import.astro`)

- Contadores: chips legibles (`Crear 17 · Actualizar 0 · Revisar 0 · Error 2`), no solo texto plano con inglés.
- Si `counts.error > 0`: caja alerta arriba de la tabla —  
  `«N filas con error no se van a importar. Corregí el CSV o confirmá solo las filas OK.»`
- Tabla: Estado y Motivo muestran labels del glosario (no codes).
- Botón apply: `Confirmar e importar (N)` donde N = cantidad de checkboxes tildados (excluye errores disabled). Se actualiza al togglear checkboxes.
- Si N = 0: botón disabled.

### 3. Tests

- Unit: `labelImportStatus` / `labelImportReason` para todos los codes conocidos + fallback.
- Shell UI contract (si aplica): import page usa labels / chips / alerta (match de strings o data-attrs estables, p. ej. `data-import-error-banner`, `data-apply-count`).

## Criterios de aceptación

1. Con el CSV del caso real (17 create + 2 error), el usuario lee motivos en español.
2. Ve alerta de 2 errores y el botón muestra `(17)` (o el N de checks activos).
3. `npm test` verde; e2e `price-list-import` sigue pasando (puede ajustar asserts de texto si mira UI).
4. API preview/apply sin cambios de contrato.

## Analogía

Antes: el ticket decía “SKU_ERR_42”.  
Después: “Falta el precio de venta” y “vas a cobrar 17 ítems; 2 quedan fuera”.
