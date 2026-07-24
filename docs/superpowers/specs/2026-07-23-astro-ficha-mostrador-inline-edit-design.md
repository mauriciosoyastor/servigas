# Ficha mostrador: panel único + Editar inline + Notas laterales

**Fecha:** 2026-07-23  
**Estado:** aprobado en chat  
**Superficie:** shell Astro — todas las páginas que usan `RecordDetailBody`

## Problema

Hoy la ficha se siente fragmentada:

1. Card de lectura (foto + campos).
2. Bloque separado **Editar** con subconjunto de campos.
3. **Archivar** suelto.
4. **Notas** abajo, lejos del contexto.

El usuario quiere un solo panel de negocio, con **Editar** arriba a la derecha, campos editables dentro de esa misma card, y **Notas** al costado (desktop).

## Decisión

### Layout (desktop)

```text
┌─ Cabecera página: eyebrow + título + ← Volver ─────────────────────┐
│                                                                     │
│  ┌─ Panel ficha (sg-glass) ──────────────┐  ┌─ Notas (sg-glass) ─┐ │
│  │  [foto?]     campos…      [ Editar ]  │  │  Agregar / lista   │ │
│  │  (lectura o inputs si editing)        │  │                    │ │
│  │  [Guardar] [Cancelar]  (solo edit)    │  │                    │ │
│  │  líneas/tabla si aplica               │  │                    │ │
│  └───────────────────────────────────────┘  └────────────────────┘ │
│  Archivar / Confirmar (secundario, bajo el panel o en footer)       │
└─────────────────────────────────────────────────────────────────────┘
```

### Mobile (&lt; ~900px)

- Panel ficha a ancho completo.
- Notas **debajo** del panel (no columna).
- Botón Editar sigue arriba a la derecha del panel.

### Modo lectura vs edición

| Modo | Comportamiento |
|------|----------------|
| Lectura | Campos como hoy (`dt`/`dd`); botón **Editar** visible si la página define campos editables |
| Edición | Al tocar Editar: los campos **editables** pasan a inputs **dentro del mismo panel**; aparecen **Guardar** y **Cancelar**; el botón Editar se oculta o pasa a estado activo |
| Sin edit | Páginas solo lectura (p. ej. muchas de contabilidad): no hay botón Editar |

No se elimina ningún campo del formulario de edición: se **incorporan al panel** (los que ya define cada `[id].astro` vía `RecordEditForm`).

Los campos de solo lectura (p. ej. stock, activo) siguen visibles en lectura; en edición solo se vuelven inputs los allowlisteados.

### Notas

- Desktop: columna derecha del layout de ficha (mismo alto visual razonable; scroll interno si hay muchas notas).
- Mobile: debajo del panel.
- Misma API / `RecordNotes` (sin cambiar contrato de notas).

### Archivar / Confirmar

Quedan **fuera** del toggle Editar (no mezclar destructivo con edición):

- Archivar: bajo el panel o al pie de la columna izquierda.
- Confirmar / Validar: igual, secundario respecto al panel.

### Alcance

Todas las fichas con `RecordDetailBody`. Páginas con `RecordEditForm` + `RecordNotes` adoptan el layout completo; el resto gana cabecera/panel unificado y, si no hay edit/notas, solo cambia la presentación.

### Implementación orientativa (no es plan)

1. Extender `RecordDetailBody` (o wrapper `RecordFicha.astro`) con:
   - slot / props para `editFields`, `apiPath`, `listKey`, `recordId`
   - slot para notas (o render condicional de `RecordNotes`)
   - toggle client-side lectura ↔ edición
2. Migrar páginas `[id].astro` que hoy apilan Edit/Notes debajo: pasar props/slots al body; quitar secciones sueltas.
3. CSS en `list.css` (o parcial ficha): grid 2 cols desktop, stack mobile; botón Editar absolute/flex top-right del panel.
4. Reutilizar lógica de submit de `RecordEditForm` (extraer script compartido si hace falta).

### Fuera de alcance

- Nuevos endpoints BFF.
- Edición inline de líneas de pedido.
- Cambiar allowlists de campos escribibles.
- Rediseño profundo del contenido de Notas (solo ubicación).

## Verificación

1. Producto: panel con foto + campos; **Editar** arriba derecha; al editar, Referencia/Precio (y los que defina la página) como inputs en el mismo panel; Guardar persiste; Cancelar vuelve a lectura.
2. Cliente/proveedor: mismo patrón con sus campos.
3. Pedido/cotización/OC con notas: notas a la derecha en desktop, abajo en mobile.
4. Ficha solo lectura (sin edit): sin botón Editar; layout no se rompe.
5. Tests de contrato shell actualizados (clases / presencia de `data-record-edit` dentro del panel).

## Analogía

Antes: mostrador + libreta de edición en otra mesa + notas en el fondo del local.  
Después: una sola ficha en el mostrador; tocás Editar y escribís ahí; las notas están en el atril al costado.
