# Diseño — Cargar lista de precios (Inventario)

**Fecha:** 2026-07-23  
**Estado:** Aprobado (conversación)  
**Proyecto:** Servigas (Odoo 19 Community)  
**Alcance:** Hub Inventario → Productos; asistente de importación Excel/CSV (upsert precios + altas)

## Resumen

Agregar en **Inventario → Productos** una tarjeta **Cargar lista de precios** que abre un asistente de 4 pasos. El usuario sube un Excel/CSV (ordenado o con columnas a mapear), revisa un preview de filas a **crear / actualizar / revisar / error**, y confirma. El sistema hace **upsert**: actualiza precio de venta y costo si el producto existe; si no, lo crea. Matching: barcode → código interno → nombre (con confirmación manual si hay ambigüedad).

**Fuera de v1:** imágenes, PDF/OCR, stock/cantidades, listas de precio Odoo (mayorista, etc.), auto-creación de categorías.

## Decisiones de producto

| Tema | Elección |
|------|----------|
| Enfoque | Asistente Servigas (no solo atajo al import nativo) |
| Formatos v1 | `.xlsx` / `.csv` |
| PDF / imagen | Rechazo amable: “Convertí a Excel primero” |
| Operación | Crear nuevos **y** actualizar existentes (casi siempre juntos) |
| Matching | Barcode → `default_code` → nombre exacto; ambiguo → Revisar |
| Precios | `list_price` (venta) + `standard_price` (costo) |
| Imágenes | No en v1 |
| Nombre al actualizar | No se pisa salvo opción explícita del usuario |
| Entrada UX | Card en hub Inventario, sección Productos |

## Comportamiento (wizard)

```
1. Subir archivo → 2. Mapear columnas → 3. Preview / revisar → 4. Confirmar e importar
```

1. **Subir:** acepta Excel/CSV; ofrece descarga de plantilla Servigas; PDF/imagen → mensaje de conversión.
2. **Mapear:** asocia columnas a `barcode`, `default_code`, `name`, `list_price`, `standard_price`. Si los headers coinciden con la plantilla, autocompleta.
3. **Preview:** tabla con estado por fila (Crear / Actualizar / Revisar / Error). El usuario puede desmarcar filas o resolver Revisar (elegir producto o omitir).
4. **Confirmar:** aplica solo filas marcadas válidas; muestra resumen (X creados, Y actualizados, Z omitidos).

## Matching (por fila)

| Resultado | Condición |
|-----------|-----------|
| **Actualizar** | Match único por barcode; si no, por `default_code`; si no, por nombre exacto único |
| **Crear** | Sin match usable |
| **Revisar** | Varios candidatos, o solo parecido por nombre → no aplica solo |
| **Error** | Falta nombre, o precios inválidos (no numéricos, negativos) |

Orden estricto: **barcode → código → nombre**. Filas Revisar/Error nunca se aplican sin acción del usuario.

## Campos escritos

| Campo | Al crear | Al actualizar |
|-------|----------|---------------|
| Nombre | Obligatorio | No se pisa (salvo opción explícita) |
| Barcode | Si viene | Si viene y está vacío en Odoo (o siempre, si se configura) |
| `default_code` | Si viene | Misma política que barcode |
| `list_price` | Sí | Sí |
| `standard_price` | Sí | Sí |
| Tipo producto | Almacenable por defecto | No cambia |
| Categoría | Default / “Sin categoría” Servigas | No cambia |
| Imagen | No | No |

## Plantilla Servigas (descargable)

| Columna | Uso |
|---------|-----|
| `barcode` | Código de barras |
| `default_code` | Código interno / referencia |
| `name` | Nombre |
| `list_price` | Precio de venta |
| `standard_price` | Costo |

## Permisos y auditoría

- Requiere permisos de crear/escribir productos (grupo inventario / manager según configuración actual).
- Traza por importación: usuario, fecha/hora, nombre de archivo, conteos crear/actualizar/omitir.

## Arquitectura (alto nivel)

```
Hub card Inventario → Productos
        ↓
Wizard (OWL y/o TransientModel)
        ↓
Parser Excel/CSV (backend)
        ↓
Motor de match (barcode → code → name)
        ↓
Aplicador → product.template / product.product (create + write precios)
        ↓
Registro de importación (auditoría)
```

| Pieza | Rol |
|-------|-----|
| `hub_inventory_data.xml` | Card “Cargar lista de precios” |
| Wizard UI | Pasos 1–4, preview, resolve Revisar |
| Backend import | Parse, match, apply, audit |
| Plantilla | Archivo `.xlsx`/`.csv` descargable |

## Errores y bordes

| Caso | Comportamiento |
|------|----------------|
| PDF / imagen | Mensaje: convertir a Excel |
| Excel sin columnas mapeables | Bloqueo en paso 2 hasta mapear mínimo (`name` + al menos un precio o identificador según reglas) |
| Precio vacío en fila de actualización | No pisa ese campo (solo escribe precios presentes y válidos) |
| Match ambiguo | Estado Revisar; no auto-aplica |
| Sin permiso de escritura | No muestra acción o error controlado al abrir |
| Fila sin nombre al crear | Error |

## Fuera de alcance (v1)

- Imágenes (URL, embebidas, ZIP)
- PDF / OCR / escaneos
- Actualizar stock o cantidades
- `product.pricelist` / reglas mayoristas
- Crear categorías nuevas automáticamente
- Import “traga cualquier cosa” sin preview

## Testing (orientativo)

| Capa | Qué verifica |
|------|----------------|
| Unit / backend | Match barcode/code/name; upsert precios; no pisar nombre; filas Revisar omitidas |
| Integración | Wizard completo con CSV plantilla; preview conteos; apply |
| Manual hub | Card visible en Inventario → Productos; PDF rechazado con mensaje claro |

## Criterios de éxito

1. Desde Inventario → Productos se puede cargar una lista Excel/CSV y ver preview antes de aplicar.
2. Productos existentes se actualizan en venta + costo con match confiable.
3. Productos nuevos se crean con datos mínimos de la fila.
4. Ambigüedades no generan duplicados silenciosos.
5. PDF/imagen no rompen el flujo; guían a Excel.
6. Queda traza de quién importó y el resultado.
