# Task 4 — Cablear icono en lista + ficha

## Resultado

- Agregado el control de carga de imagen para filas de `inventory/products` y para la ficha de producto.
- El disparador conserva los enlaces de nombre y mantiene el botón fuera del enlace de la miniatura.
- La ficha recibe `recordId` desde su ruta, sin asumir que existe en `RecordDetailPayload`.
- Se montó `ProductImageUploadHost` únicamente en la lista y ficha de productos.

## TDD

1. Se agregó el contrato `wires product image upload triggers on table and detail`.
2. Verificación RED: falló como se esperaba porque faltaba `imageUploadApiPath` en `RecordTable.astro`.
3. Se implementó el cableado, los destinos de actualización de imagen, etiquetas `Agregar foto` / `Cambiar foto` y estilos.
4. Verificación GREEN: `shell-ui.test.mjs` pasó con 27 pruebas.

## Verificación

- `NODE_ENV=test node --experimental-strip-types --test tests/shell-ui.test.mjs`: 27/27 pruebas aprobadas.
- `NODE_ENV=test node --experimental-strip-types --test tests/**/*.test.mjs`: 195/195 pruebas aprobadas.
- `npm run build`: compilación Astro exitosa.

## Revisión propia

- Confirmado: el botón de la lista no está dentro del enlace de la miniatura.
- Confirmado: solo `inventory/products` recibe la ruta BFF y el host de carga.
- Confirmado: los placeholders y las imágenes usan los selectores requeridos por el host.
- Confirmado: no se modificaron otros flujos de listas o fichas.

## Smoke manual

No ejecutado: no se dispuso de una instancia Odoo autenticada durante esta tarea.
