# Design: CUIT/VAT (+ dirección) en partners Astro

**Fecha:** 2026-07-23  
**Estado:** approved (gap P1-3 camino a corte)  
**Repo:** servigas / `web/`

## Problema

Alta de cliente/proveedor solo pide nombre/teléfono/email. Para Factura Web y operación AR hace falta **CUIT (`vat`)** y domicilio mínimo.

## Decisión

1. Allowlist create/update: `vat`, `street`, `city` (+ existentes).
2. Forms new + edit (clientes y proveedores).
3. Listas: campo `vat` en columns/fields; `searchFields` incluye `vat`.
4. `vat` opcional (no bloquea alta mostrador).

## No-objetivos

- Validación checksum CUIT
- `l10n_ar` responsibility type / IIBB
- País/estado/CP
