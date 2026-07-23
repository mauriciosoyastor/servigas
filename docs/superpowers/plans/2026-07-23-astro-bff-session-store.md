# BFF Session Store Durable Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el session store en memoria por un puerto con TTL y backend file durable para desbloquear go/no-go ADR 0016.

**Architecture:** `SessionStore` interface; `MemorySessionStore` (tests) y `FileSessionStore` (JSON por sid); factory por env; cookie `maxAge` = TTL.

**Tech Stack:** Astro 7 SSR (`web/`), Node `fs`, tests `node:test`.

## Global Constraints

- No Redis en este slice.
- Default store: `memory` en test; `file` fuera de test salvo override.
- TTL default: `43200` (12h).
- Allowlist ADR 0016: no offline/recorrido.

## File map

| File | Role |
|------|------|
| `web/src/lib/bff/session-store.ts` | Interface, Memory+TTL, File, factory, cookie name |
| `web/src/lib/bff/http.ts` | Cookie maxAge desde TTL |
| `web/tests/session-store.test.mjs` | Unit TTL + file persist |
| `web/tests/odoo-adapter.test.mjs` | Ajustar assert entry si agrega expiresAt |
| `web/.env.example` | Vars nuevas |
| `web/scripts/smoke-shell-path.mjs` | Smoke camino feliz |
| `web/README.md` | Documentar store |
| `docs/adr/0016-astro-shell-cutover.md` | Marcar progreso session store si aplica |

---

## Task 1: Tests Memory + TTL

- [x] Crear `web/tests/session-store.test.mjs` con create/get/destroy + expiración
- [x] Extender `MemorySessionStore` con `expiresAt` y purge en `get`
- [x] Verde

## Task 2: FileSessionStore

- [x] Tests: persistencia entre instancias, destroy borra, expired purge
- [x] Implementar write atómico + read
- [x] Verde

## Task 3: Factory + cookie maxAge + wiring

- [x] `getSessionStore()` / env `BFF_SESSION_STORE`, `BFF_SESSION_TTL_SECONDS`, `BFF_SESSION_DIR`
- [x] `setBffCookie` usa maxAge = TTL
- [x] Mantener compat de imports `sessionStore`
- [x] Suite completa verde (140/140)

## Task 4: Smoke script + docs

- [x] `scripts/smoke-shell-path.mjs` (login → launcher → hub → products list → /pos)
- [x] README + `.env.example`
- [ ] Commit / PR
