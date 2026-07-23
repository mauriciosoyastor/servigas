# Task 3 Report: Host cliente de carga de imagen

## Status

**DONE**

## Summary

Created the single-mount `ProductImageUploadHost.astro` client host. It delegates click handling from product image triggers to a gallery-only picker, validates type and client-side size, previews the selected image in a modal, and POSTs `image_1920` to the provided record API path.

## Files Modified

| File | Change |
|------|--------|
| `web/src/components/ProductImageUploadHost.astro` | New picker, preview modal, validation, POST flow, target-image cache refresh, and styles |
| `web/tests/shell-ui.test.mjs` | UI contract test for the host markup and upload request |

## TDD Evidence

### RED — before implementation

```powershell
$env:NODE_ENV='test'; node --experimental-strip-types --test tests/shell-ui.test.mjs
```

**Result**: 25 pass / 1 fail. The new contract failed as intended with `ENOENT` because `ProductImageUploadHost.astro` did not yet exist.

### GREEN — after implementation

```powershell
$env:NODE_ENV='test'; node --experimental-strip-types --test tests/shell-ui.test.mjs
```

**Result**: 26 pass / 0 fail.

### Full suite — pre-commit

```powershell
$env:NODE_ENV='test'; node --experimental-strip-types --test tests/**/*.test.mjs
```

**Result**: 194 pass / 0 fail.

## Commit

```text
cd4a9a7 feat(web): add product image upload host with preview
```

## Self-Review

### Correctness

- Delegated clicks read `data-record-id`, `data-api-path`, and optional `data-image-target`.
- The input uses `accept="image/*"` and intentionally has no `capture` attribute, allowing the device gallery picker.
- Non-image files and files larger than 2.5 MB show Spanish UTF-8 validation messages.
- Saving sends the required `{ action: "update", id, values: { image_1920 } }` JSON body with same-origin credentials.
- A 401 redirects to `/login`; other API errors stay visible in the modal.
- Successful saves cache-bust the specified `<img>` target or reload the page when no valid target is supplied.
- Object URLs are revoked and the host is idempotently bound across Astro page loads.

### Scope

No `RecordTable` or detail page integration was added; that remains Task 4.

### Concerns

None. The component follows the provided Task 3 implementation, with the mojibake strings from the brief corrected to UTF-8.

## Critical review fix — stale image reader race

- Cada cambio de archivo ahora invalida inmediatamente `pending.dataUrl`, deshabilita Guardar y obtiene una generación de lectura nueva.
- El `FileReader.onload` solo conserva el data URL y reactiva Guardar si su generación sigue vigente; cancelar o abrir otro selector también invalida lecturas anteriores.
- Se extendió el contrato de fuente de `shell-ui.test.mjs` para exigir la invalidación, generación y bloqueo de Guardar, sin añadir automatización de navegador.

### Tests

```powershell
cd web
$env:NODE_ENV='test'; node --experimental-strip-types --test tests/shell-ui.test.mjs
```

Resultado: 26 pass / 0 fail.

```powershell
$env:NODE_ENV='test'; node --experimental-strip-types --test tests/**/*.test.mjs
```

Resultado: 194 pass / 0 fail.
# Task 3 Report — sessionStore + BackendClient + OdooAdapter

## Status

DONE

## Commit

- `416a44a feat(web): add Odoo BFF adapter and session store`

## Implementación

- Se agregó el puerto `BackendClient` con `login`, `logout`, `getLauncher` y `getHub`.
- Se agregó `MemorySessionStore`, el singleton `sessionStore` y `BFF_COOKIE = "sg_bff_sid"`.
- Se agregó `OdooAdapter` con inyección de `fetch`, autenticación JSON-RPC, extracción de `session_id`, llamadas `call_kw`, cookie de sesión, sección `summary` por defecto y logout best-effort.
- Se agregó `getBackend()` con caché y validación de `ODOO_URL`/`ODOO_DB`.
- Se hizo compatible `BffError` con `node --experimental-strip-types`, reemplazando parameter properties por propiedades explícitas sin cambiar su API.

## Evidencia TDD

### RED

Comando:

```text
cd web
npm test
```

Resultado esperado antes de implementar:

```text
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '.../web/src/lib/bff/odoo-adapter.ts'
tests 6
pass 5
fail 1
exit code 1
```

La suite falló porque el adaptador requerido aún no existía. Después de ampliar los casos para cubrir todos los comportamientos requeridos, se confirmó nuevamente el mismo RED antes de crear código de producción.

### GREEN

Primer intento de GREEN detectó una incompatibilidad preexistente de `errors.ts` con el runner:

```text
SyntaxError [ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX]:
TypeScript parameter property is not supported in strip-only mode
exit code 1
```

Se aplicó la corrección mínima equivalente y se volvió a ejecutar:

```text
tests 15
suites 7
pass 15
fail 0
duration_ms 258.3307
exit code 0
```

## Cobertura agregada

- Login: credenciales inválidas, éxito, URL/body JSON-RPC, cookie y error de red.
- Launcher: endpoint, modelo `sg.app.tile`, método `get_launcher_payload` y payload.
- Hub: modelo `sg.hub.card`, método `get_hub_payload`, cookie, sección explícita, default `summary` y error de red.
- Logout: endpoint, cookie y tolerancia a fallos.
- Session store: create/get/destroy, UUID y nombre de cookie.

## Verificación

- `npm test`: 15/15 tests pasan.
- `npm run build`: Astro server build completado, exit code 0.
- `git diff --cached --check`: sin errores antes del commit.

## Self-review

- Se contrastaron endpoint, modelos, métodos, argumentos, cookie y mapeos de error contra el brief.
- El alcance quedó limitado a los cinco archivos solicitados, tests y la corrección necesaria de compatibilidad en `errors.ts`.
- No se encontraron defectos críticos ni importantes pendientes.

## Concerns

Ninguno.

## Important review fixes

- `OdooAdapter.login()` ahora rechaza una autenticación con `uid` cuando Odoo no entrega la cookie `session_id`, usando `BffError("odoo_unavailable", 503, ...)`.
- `#callKw()` ahora inspecciona `payload.error`: errores relacionados con sesión/acceso se traducen a `unauthorized` (401), y los demás a `odoo_unavailable` (503).
- Las respuestas JSON-RPC sin `result` ya no se aceptan como payload exitoso.
- Se agregaron cuatro pruebas unitarias para cookie ausente, error de sesión/acceso, error general de Odoo y resultado ausente.

### Test de cobertura

Comando:

```text
cd web
npm test
```

Salida:

```text
tests 19
suites 7
pass 19
fail 0
duration_ms 226.3663
exit code 0
```
