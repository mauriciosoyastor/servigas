# Design: Endurecer BFF — smoke extendido + validaciones (opción 3/3)

**Fecha:** 2026-07-23  
**Estado:** approved (cola corte; smoke **real** contra Odoo sigue diferido)  
**Rama:** `cursor/astro-bff-harden-smoke-validation-daee`

## Problema

El smoke actual para en `/pos` HTML y no toca cotización/RFQ/catálogo API. Login acepta body vacío y responde como fallo Odoo genérico.

## Decisión

1. **Smoke** (`smoke-shell-path.mjs`) suma pasos GET (sin mutar datos):
   - listas cotizaciones + RFQ
   - `GET /api/pos/catalog`
   - páginas `quotations/new` y `rfq/new` (HTML)
2. Mutaciones (`POST` checkout/create) solo si `SMOKE_MUTATE=1` (off por default).
3. **Login:** login/password vacíos → `validation_error` 400.
4. **Records create:** body sin JSON objeto → `validation_error` 400.

## No-objetivos

- Correr smoke en este entorno (Odoo/Astro down)
- Rate limit / CSRF / Redis
