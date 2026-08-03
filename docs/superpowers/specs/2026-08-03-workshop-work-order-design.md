# Design: Taller — Órdenes de trabajo + historial de artefactos (v1)

**Fecha:** 2026-08-03  
**Estado:** implemented (v1)  
**Repo:** servigas (`web/` + `servigas_core`)  
**Usuario día a día:** gasista / administrativo de taller-mostrador

## Problema

Las órdenes de trabajo del taller viven en papel (fecha, propietario, artefacto, GN/GE, problema, observación, trabajos, materiales, importe). No hay historial por nº de serie de artefacto en el sistema.

## Meta

Área **Taller** en el shell Astro: cargar OT digital (campos del papel + foto de chapa opcional), registrar artefactos por nº de serie y consultar historial de servicios.

## Decisiones

| Tema | Decisión |
|------|----------|
| Alcance v1 | Solo taller digital (sin FC, sin descontar stock) |
| Propietario | Híbrido: texto libre + cliente Odoo opcional |
| Chapa / serie | Campos manuales; foto opcional (sin OCR) |
| Navegación | Hub launcher **Taller** (`workshop`) |

## Modelo de datos

### `sg.appliance`

| Campo | Tipo | Notas |
|-------|------|--------|
| `serial_number` | Char required | Unique normalized (upper, strip spaces) |
| `brand`, `model`, `name` | Char | Marca / modelo / descripción |
| `gas_type` | Selection `gn`/`ge`/False | |
| `partner_id` | Many2one res.partner | Último cliente conocido (opcional) |
| `work_order_ids` | One2many | Historial |

### `sg.work.order`

| Campo | Tipo | Notas |
|-------|------|--------|
| `name` | Char | Secuencia / display |
| `date` | Date required | |
| `appliance_id` | Many2one required | |
| `owner_name`, `owner_phone` | Char | Texto del papel |
| `partner_id` | Many2one opcional | |
| `problem`, `observation`, `work_done`, `materials` | Text | |
| `amount` | Float | Informativo |
| `state` | `draft` / `done` | |
| adjuntos | ir.attachment | Foto chapa u otras |

**Upsert:** al crear OT, normalizar serie → buscar/crear appliance → linkear OT.

## UX

- Launcher **Taller** → `/hubs/workshop`
- Cards: Nueva orden, Órdenes, Artefactos
- Alta OT: form papel + lookup serie (“Ya atendido N veces”)
- Ficha artefacto: timeline de OT
- Ficha OT: campos + adjuntos + cerrar (draft→done)

## Fuera de v1

OCR, facturar, stock de materiales, PDF idéntico al papel, offline.

## Verificación

Unit normalización/allowlists; shell-ui hub/new; manual 2 OT misma serie → historial.
