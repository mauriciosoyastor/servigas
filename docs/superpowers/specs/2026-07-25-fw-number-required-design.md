# Design: Número Factura Web obligatorio al marcar (P1.5)

**Fecha:** 2026-07-25  
**Estado:** approved  
**Repo:** servigas (`web/`)  
**Relacionado:** [fw-bulk-mark](./2026-07-25-fw-bulk-mark-design.md) · puente FW en `fw-bridge.ts`

## Meta

Al marcar una FC como cargada en Factura Web, **siempre** persistir `sg_fw_number`. En bulk, **un número distinto por factura**.

## Decisiones

| Decisión | Elección |
|----------|----------|
| ¿Obligatorio? | Sí (ficha + bulk) |
| Bulk | Nº **por fila** (no un solo valor para todas) |
| Formato | Texto trim, 1–64 chars (sin regex AFIP; es nº externo FW) |

## Comportamiento

### Ficha (1 FC)

| Pieza | Detalle |
|-------|---------|
| UI | Input “N° Factura Web” (deja de decir “opcional”); botón disabled / error si vacío |
| API | `mark_fw_loaded` + `values.fwNumber` **requerido** |
| BFF | `filterMarkFwLoadedValues` → `null` si falta / vacío / >64 |
| Odoo | `sg_fw_loaded=true` + `sg_fw_number` |

### Bulk (cola pendientes)

| Pieza | Detalle |
|-------|---------|
| UI | Input por fila (junto al checkbox); “Marcar seleccionadas” exige nº en **cada** fila tildada |
| API | `mark_fw_loaded_bulk` con pares id+número (ver abajo) |
| Skip | Sigue omitiendo no-markable (`skipped`); si falta nº en el payload → **400** de toda la request |
| Límite | Máx. 100 ítems (igual que hoy) |

## API bulk (breaking menor)

Antes (P0.4):

```json
{ "action": "mark_fw_loaded_bulk", "ids": [10, 11], "values": { "fwNumber": "opcional-mismo" } }
```

Después (P1.5):

```json
{
  "action": "mark_fw_loaded_bulk",
  "items": [
    { "id": 10, "fwNumber": "0001-00000010" },
    { "id": 11, "fwNumber": "0001-00000011" }
  ]
}
```

- No se acepta `values.fwNumber` global.
- Helper nuevo: `filterMarkFwBulkItems(raw)` → `{ id, fwNumber }[] | null`.

## Analogía

No alcanza con decir “ya pagué el estacionamiento”: hay que anotar el **ticket de cada auto**.

## Fuera de alcance

- Validar formato AFIP/punto de venta  
- Editar `sg_fw_number` después de marcado  
- Sync automática con Factura Web  
- Desmarcar / deshacer  

## Criterios de aceptación

1. Ficha: sin nº → no marca (UI + API 400).  
2. Ficha: con nº → `sg_fw_loaded` + `sg_fw_number` al recargar.  
3. Bulk: fila seleccionada sin nº → no envía / error claro.  
4. Bulk: 2 FC con nº distintos → cada una guarda el suyo.  
5. Tests: `fw-bridge` filter required + items; adapter; UI wired (ficha + bulk).  

## Nota sobre P0.4

El design de bulk decía “nº distinto por fila = fuera de alcance”. Este P1.5 **lo incorpora** y endurece el contrato a obligatorio.
