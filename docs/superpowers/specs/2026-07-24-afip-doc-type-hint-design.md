# Design: Tipo de comprobante sugerido + prep. `l10n_ar` (fase 3a/3b)

**Fecha:** 2026-07-24  
**Estado:** approved (implementación)  
**Padre:** [cf-cuit-invoice-destination](./2026-07-24-cf-cuit-invoice-destination-design.md)  
**Repo:** servigas (`web/`, `servigas_integrations`, docs)

## Meta

Mostrar **tipo de comprobante sugerido** según CF/CUIT y documentar instalación `l10n_ar`, sin emisión AFIP.

## 3a — App

| Destino | short | label |
|---------|-------|-------|
| CF | B/C | Factura B/C (consumidor final) |
| CUIT | A/B | Factura A/B (CUIT) |

Nota UI: *Sugerido según destino. El tipo final lo define AFIP/l10n_ar según tu condición IVA.*

- Helper `suggestedDocType*` en `invoice-dest.ts` (derivado, sin campo Odoo nuevo).
- Lista clientes: columna Tipo sug.
- Ficha cliente / FC: Tipo sugerido (+ nota).
- Alta FC: hint al elegir cliente.
- Factura Web `process_notes`: mencionar CF→B/C y CUIT→A/B.

## 3b — Docs

- `docs/proyecto/checklist-l10n-ar-afip.md`
- `CONTEXT.md`: prep hecha; emisión AFIP sigue pendiente (3c)

## No-objetivos (3c)

WSFE, CAE, certificados, auto-emitir al Publicar, IIBB.
