# Task 4 Report: componente `RecordNotes.astro` + estilos

## Status

Implementado `web/src/components/RecordNotes.astro` con carga y mutaciones
same-origin contra `/api/notes`, edición inline condicionada por `canEdit`,
confirmación de borrado y actualización del DOM sin recargar la ficha.

## TDD

### RED

```powershell
$env:NODE_ENV='test'; node --experimental-strip-types --test tests/shell-ui.test.mjs
```

Exit code 1: 25 tests pasaron y el nuevo contrato falló con `ENOENT` porque
`web/src/components/RecordNotes.astro` todavía no existía.

### GREEN

```powershell
$env:NODE_ENV='test'; node --experimental-strip-types --test tests/shell-ui.test.mjs
```

Exit code 0: 26 tests, 26 pass, 0 fail.

## Verificación completa

```powershell
$env:NODE_ENV='test'; node --experimental-strip-types --test tests/*.test.mjs
npm run build
```

Suite: exit code 0, 202 tests, 202 pass, 0 fail.
Build Astro: exit code 0.

## Implementación

- Formulario con textarea, estado accesible y acción **Agregar**.
- GET al montar; POST, PATCH y DELETE actualizan la lista en memoria y el DOM.
- Edición y borrado sólo se muestran cuando `canEdit` es verdadero.
- Borrado protegido por `confirm("¿Borrar esta nota?")`.
- El cuerpo se asigna mediante `textContent`, sin HTML crudo.
- Estados vacíos y errores globales o por ítem.
- Estilos `.sg-record-notes*` al final de `list.css`, usando tokens `--sg-*`.
- No se integró el componente en páginas de detalle; queda para Task 5.

## Concerns

Ninguno conocido.
