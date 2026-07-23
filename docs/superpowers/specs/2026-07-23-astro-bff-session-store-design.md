# Design: BFF session store durable (TTL + file)

**Fecha:** 2026-07-23  
**Estado:** approved (continuación ADR 0016 / go/no-go)  
**Repo:** servigas / `web/`

## Problema

`MemorySessionStore` pierde sesiones al reiniciar el proceso Astro y no sirve multi-proceso. Es bloqueante del checklist go/no-go (ADR 0016).

## Decisiones

| Tema | Decisión |
|------|----------|
| Puerto | Interface `SessionStore` (`create` / `get` / `destroy`) |
| TTL | Absolute TTL configurable (`BFF_SESSION_TTL_SECONDS`, default 12h) |
| Expiración | Lazy: `get` purga si `expiresAt` pasó; cookie `maxAge` alineado |
| Store prod-dev single node | `FileSessionStore` (un JSON por sid bajo `BFF_SESSION_DIR`) |
| Store tests | `MemorySessionStore` (default si `BFF_SESSION_STORE=memory` o `NODE_ENV=test`) |
| Factory | `getSessionStore()` singleton; export `sessionStore` = proxy al factory |
| Redis | Fuera de este slice (multi-instancia después del go) |

## No-objetivos

- Redis / Upstash
- Sliding TTL complejo
- Encrypt-at-rest del archivo
- Multi-caja / sticky sessions

## Verificación

- Unit: TTL expira, file sobrevive new store instance, destroy borra archivo
- Suite `npm test` verde
- Smoke shell documentado (requiere Odoo; falla claro si down)
