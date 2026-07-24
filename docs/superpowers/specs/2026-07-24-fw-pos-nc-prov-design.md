# Design: Factura Web + POS→FC + NC proveedor

**Fecha:** 2026-07-24  
**Estado:** approved (implementación)  
**Repo:** servigas  

## Meta

1. Cola operativa Factura Web: exportar FC pendientes, marcar “ya cargada”, filtrar pendientes  
2. Crear FC fiscal desde venta de caja (POS) con destino CF/CUIT del partner  
3. Crear/publicar NC de proveedor (`in_refund`)

## 1) Puente Factura Web

**Modelo** en `account.move` (`servigas_core`):

| Campo | Tipo | Uso |
|-------|------|-----|
| `sg_fw_loaded` | Boolean | Ya cargada en Factura Web |
| `sg_fw_loaded_at` | Datetime | Cuándo se marcó |
| `sg_fw_number` | Char | N° en Factura Web (opcional) |

**Lista** `accounting/factura-web-pending`: FC `posted` + `sg_fw_loaded=False`.  
**Acciones BFF:** `mark_fw_loaded` (write) · `GET` export CSV de pendientes.  
**UI:** botón Exportar CSV en lista; control “Marcar cargada” en ficha FC.

## 2) POS → FC

Allowlist `sales/ventas-caja` · acción `create_invoice`.  
Adapter: leer `pos.order` + líneas → `account.move` `out_invoice` (mismo shape que alta FC).  
Requisitos: estado `paid`/`done`, `partner_id` obligatorio.  
Destino CF/CUIT se hereda del partner al publicar (flujo existente).

## 3) NC proveedor

Extend `invoice-creates` (`in_refund`) + `record-actions` (`action_post`) + `new.astro` + Publicar en ficha.  
Partner picker: `purchase/vendors`. Sin check CF/CUIT.

## No-objetivos

AFIP emisión · sync automática Factura Web · bulk mark masivo en esta entrega
