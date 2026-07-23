# Task 3 Report: API `/api/notes`

## Status

Implementada la ruta Astro SSR `web/src/pages/api/notes.ts` con handlers
completos para GET, POST, PATCH y DELETE. Todos requieren sesión BFF,
usan `session.uid` como `viewerUid` y traducen errores mediante
`bffErrorResponse`.

## TDD

### RED

```powershell
$env:NODE_ENV='test'; node --experimental-strip-types --test tests/api-routes.test.mjs
```

Exit code 1: `ERR_MODULE_NOT_FOUND` al importar
`web/src/pages/api/notes.ts`, la causa esperada antes de implementar la ruta.

Casos escritos antes de producción:

1. GET sin sesión devuelve 401.
2. GET con `listKey` inválido propaga 404 seguro.
3. POST con cuerpo vacío devuelve 400 y `Escribí una nota`.
4. PATCH de nota ajena devuelve 403 y el mensaje permitido.
5. POST exitoso normaliza el texto y pasa `session.uid` al backend.

### GREEN

```powershell
$env:NODE_ENV='test'; node --experimental-strip-types --test tests/api-routes.test.mjs
```

Exit code 0: 18 tests, 18 pass, 0 fail.

## Verificación completa

```powershell
$env:NODE_ENV='test'; node --experimental-strip-types --test tests/**/*.test.mjs
```

Exit code 0: 201 tests, 201 pass, 0 fail.

## Implementación

- GET valida `listKey` y `recordId`, lista notas y entrega `{ notes }`.
- POST valida JSON, destino y texto; normaliza `body` y entrega
  `{ ok: true, note }`.
- PATCH valida `id` y texto; normaliza `body` y entrega
  `{ ok: true, note }`.
- DELETE valida `id`, elimina la nota y entrega `{ ok: true }`.
- JSON no-objeto o malformado devuelve `validation_error` 400.
- No se implementó UI.

## Concerns

Ninguno conocido.
