# Design: Huecos camino feliz (opción 2/3)

**Fecha:** 2026-07-23  
**Estado:** approved (cola corte automatizada)  
**Rama:** `cursor/astro-happy-path-gaps-daee`  
**Plan:** `docs/superpowers/plans/2026-07-23-astro-cutover-iteration-1-2-3.md`

## Inventario coming_soon (hoy)

| Caso | Resultado |
|------|-----------|
| Hub `client_tag` desconocido | `coming_soon` |
| Action sin `act_window` / sin allowlist | `coming_soon` |
| Modelos no allowlisted (ej. `res.users`) | `coming_soon` |
| Apps / Ajustes Odoo nativos | Landings Astro (no coming_soon) |
| Hubs inventory/sales/purchase/accounting + listas allowlisted | Ruteados |

Los hubs operativos ya tienen buena cobertura de listas. El gap real del **camino feliz del mostrador** no es un modelo suelto: es que el inicio depende 100% de tiles Odoo y no ofrece atajos fijos a Caja / Cotización / RFQ.

## Decisión (este slice)

1. **Tira operativa en `/`:** enlaces fijos a `/pos`, `/lists/sales/quotations/new`, `/lists/purchase/rfq/new`.
2. **Coming soon con contexto:** el toast muestra el label del tile que no se pudo abrir.
3. Doc de inventario (esta spec) para no reabrir el tema a ciegas.

## No-objetivos

- Migrar módulo Apps/Ajustes Odoo
- Offline / onboarding
- Nuevas listas de laboratorio
