# Design: Endurecimiento BFF — errores seguros + timeout/logout

**Fecha:** 2026-07-23  
**Estado:** approved (ADR 0016 go/no-go: errores BFF seguros + logout/timeout)  
**Repo:** servigas / `web/`  
**Base:** `cursor/astro-bff-session-store-daee` (#13)

## Problema

1. RPC a Odoo **sin timeout** → caja colgada si Odoo no responde.
2. Códigos de error divergentes entre PRs (`checkout_failed`, `action_failed`) y mensajes genéricos (“Hub no encontrado” para todo 404).
3. Si Odoo mata la sesión, la cookie BFF puede seguir viva hasta el TTL absoluto.

## Analogía

Hoy el mostrador llama a Odoo sin despertador y, si la llave Odoo ya no abre, igual guarda la llave BFF en el llavero.  
Después: hay despertador (timeout), carteles claros (códigos) y, si Odoo dice “sesión muerta”, tiramos la llave BFF.

## Decisión

1. **Timeout RPC** `ODOO_RPC_TIMEOUT_MS` (default 15000) vía `AbortSignal.timeout` en `#post`, media y logout.
2. **Catálogo de códigos** unificado: `unauthorized`, `bad_credentials`, `odoo_unavailable`, `not_found`, `validation_error`, `checkout_failed`, `action_failed` — mensajes seguros fijos (nunca `err.message` crudo).
3. **`not_found`** → mensaje “No encontrado” (no “Hub no encontrado”).
4. **`bffErrorResponse(err, cookies?)`**: si `unauthorized` y hay cookies → `invalidateBffSession`.
5. **`GET /api/auth/session`**: valida contra Odoo (`validateSession`); si muere, limpia BFF.
6. Política de logout/timeout documentada: TTL absoluto 12h (#13) + invalidación al detectar sesión Odoo muerta.

## No-objetivos

- Redis / sliding TTL
- Rate limit login / CSRF tokens / zod
- Offline POS
- Merge de gaps P0/P1 (solo unifica códigos para que no choquen)
