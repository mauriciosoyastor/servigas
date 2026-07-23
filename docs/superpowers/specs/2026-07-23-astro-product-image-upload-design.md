# Design: Carga/reemplazo de imagen de producto (galería + cámara)

**Fecha:** 2026-07-23  
**Estado:** approved (diseño verbal); pendiente review del archivo  
**Repo:** servigas / `web/`  
**Precede:** `2026-07-22-astro-native-products-list-design.md`  
**Superficies:** lista `/lists/inventory/products` + ficha `/lists/inventory/products/:id`

## Problema

En Inventario → Productos ya se muestran miniaturas (`image_128`) y la ficha muestra foto o “Sin foto”, pero el shell Astro no permite cargar ni reemplazar la imagen desde el dispositivo. Completar fotos hoy requiere Odoo u otros flujos (p. ej. import batch).

## Objetivos

1. Icono en **lista** y **ficha** para abrir galería del dispositivo.
2. En celular, el mismo flujo ofrece acceso a **cámara** (picker nativo).
3. Funciona con productos **sin** foto y para **reemplazar** una existente.
4. Vista previa + confirmación (Guardar / Cancelar) antes de persistir.
5. Persistencia solo vía BFF → Odoo (`product.template`); el browser nunca habla con Odoo.

## No objetivos

- Recorte, filtros o editor de imagen
- Múltiples fotos por producto
- Variantes (`product.product` / `inventory/variants`)
- Import masivo de imágenes
- Endpoint multipart nuevo
- Cambiar fotos de otros modelos (clientes, etc.)

## Decisiones

| Tema | Decisión |
|------|----------|
| Ubicación UI | Lista (celda thumbnail) + ficha (foto / “Sin foto”) |
| Sin foto / con foto | Mismo control: agregar o reemplazar |
| Captura | `<input type="file" accept="image/*">` — el SO ofrece galería; en móvil también cámara |
| Confirmación | Modal con preview; Guardar / Cancelar |
| Campo Odoo | Escribir `image_1920` (Odoo deriva `image_128` / `image_256`) |
| API | Reusar `POST /api/records/inventory/products` con `action: "update"` |
| Allowlist | Agregar `image_1920` a writes de `inventory/products` + validación de payload |
| Límites | Solo MIME `image/*`; tamaño máximo ~2.5 MB; error en el modal si falla |
| Tras guardar | Actualizar `src` del thumb/foto con cache-bust (`?v=timestamp`) o recargar fila/ficha |
| Click nombre | Sigue abriendo la ficha; el icono no navega |

## Arquitectura

```text
Browser (icono → file picker → preview → Guardar)
    │  POST /api/records/inventory/products
    │  { action: "update", id, values: { image_1920: "<base64>" } }
    ▼
Astro BFF (cookie httpOnly sg_bff_sid)
    │  getRecordWriteDef + filterWritableValues
    │  validar base64 / tipo / tamaño
    ▼
OdooAdapter.call_kw(product.template, write, [[id], { image_1920 }])
    ▼
Odoo genera miniaturas
    ▼
UI refresca /api/media/product.template/{id}/image_128?...
```

Misma frontera que el resto del shell: handlers dependen de `BackendClient`, no de Odoo crudo.

## Contratos

### Request (browser → BFF)

```ts
POST /api/records/inventory/products
{
  action: "update",
  id: number,
  values: {
    // El cliente envía data-URL (`data:image/jpeg;base64,...`) o base64 puro.
    // El BFF normaliza siempre a base64 puro antes del write a Odoo.
    image_1920: string
  }
}
```

### Validación BFF

- Solo `inventory/products`.
- Solo campo allowlisted `image_1920` (además de los writes existentes: `default_code`, `list_price`).
- Rechazar si el MIME no es `image/*`, si el base64 es inválido, o si supera ~2.5 MB decodificado.
- El filtro de writes trata `image_1920` como campo binario allowlisted (normaliza data-URL → base64; no lo pasa por el mismo path de campos de texto cortos).

### Response

```ts
{ ok: true }
```

Errores: mismos códigos BFF (`validation_error`, `unauthorized`, `not_found`, etc.).

### Lectura (sin cambios de contrato)

- Lista/ficha siguen usando `image_url` / `imageUrl` → `GET /api/media/product.template/{id}/image_128`.

## UX

### Lista

- Celda imagen: thumbnail + botón-icono (cámara/imagen) siempre visible en productos.
- Icono dispara el flujo de carga; no reemplaza el link del nombre a la ficha.

### Ficha

- Sobre la foto o el bloque “Sin foto”: mismo icono + label “Agregar foto” / “Cambiar foto”.

### Modal preview

1. Usuario elige archivo → se muestra preview local (`URL.createObjectURL` o data-URL).
2. **Guardar** → loading → POST → éxito cierra modal y refresca imagen.
3. **Cancelar** → cierra y revoca object URL; no escribe.
4. Fallo de red/validación → mensaje en el modal; preview permanece para reintentar.

### Errores

| Caso | Comportamiento |
|------|----------------|
| Cancela el picker | No-op |
| No imagen / muy pesado | Mensaje en modal; no POST |
| Sesión vencida | Redirect login (patrón BFF existente) |
| Fallo Odoo/red | Mensaje en modal; reintentar |

## Componentes tocados (orientativo)

- `web/src/components/RecordTable.astro` — botón en celda `kind: image` para productos
- `web/src/components/RecordDetailBody.astro` — control en foto / empty
- Script cliente compartido (inline o módulo pequeño) para picker + modal + POST
- `web/src/lib/shell/record-writes.ts` — allowlist `image_1920`
- `web/src/lib/bff/odoo-adapter.ts` / filtros — normalización y validación de imagen
- Tests: `record-writes`, `odoo-adapter` (write con imagen), smoke UI del icono si aplica

## Testing

1. Unit: allowlist acepta `image_1920` en productos; rechaza en otros listKeys / campos.
2. Unit/adapter: `write` envía `[[id], { image_1920: "..." }]` filtrado.
3. Unit: rechazo por payload no-imagen / oversized.
4. UI: icono presente en lista/ficha de productos (sin subir archivo real en CI).

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Payload JSON grande | Techo ~2.5 MB; mensaje claro |
| Cache del browser en `/api/media` | Cache-bust en `src` tras guardar |
| Click accidental en lista | Preview + confirmar antes de write |
| `capture` forzando solo cámara | No usar `capture` obligatorio; `accept="image/*"` deja elegir galería o cámara |

## Criterios de aceptación

- [ ] En lista de productos, icono permite elegir imagen del dispositivo.
- [ ] En ficha, mismo flujo sobre foto / “Sin foto”.
- [ ] En celular, el picker ofrece galería y cámara.
- [ ] Productos con y sin foto pueden cargar/reemplazar.
- [ ] Preview + Guardar/Cancelar antes de persistir.
- [ ] Tras Guardar, la imagen se ve actualizada en UI y en Odoo (`image_1920` / miniaturas).
- [ ] Escritura solo por BFF allowlisted; sin endpoint multipart nuevo.
)
