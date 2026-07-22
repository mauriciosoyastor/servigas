# Lista Productos Astro-native — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Hub Inventario → Productos abre una lista 100% Astro alimentada por BFF (sin iframe).

**Architecture:** Allowlist `inventory/products` → `BackendClient.getRecordList` → `OdooAdapter` `search_read`/`search_count` → página SSR + tabla densa OWL.

**Tech Stack:** Astro SSR, `OdooAdapter`, Node test runner, CSS `--sg-*`.

**Spec:** `docs/superpowers/specs/2026-07-22-astro-native-products-list-design.md`

## File map

| File | Role |
|------|------|
| `web/src/lib/bff/types.ts` | `RecordListPayload` |
| `web/src/lib/shell/record-lists.ts` | Allowlist + metadata de Productos |
| `web/src/lib/bff/backend-client.ts` | `getRecordList(session, listKey)` |
| `web/src/lib/bff/odoo-adapter.ts` | JSON-RPC listado |
| `web/src/pages/api/lists/inventory/products.ts` | API |
| `web/src/pages/lists/inventory/products.astro` | Página SSR |
| `web/src/components/RecordTable.astro` | Tabla densa |
| `web/src/styles/list.css` | Port de `servigas_list` |
| `web/src/lib/shell/tile-nav.ts` | Productos → `/lists/...`; resto coming_soon |

## Tasks

### Task 1: Allowlist + tile-nav

- [x] Test: `product.template` → `/lists/inventory/products`; otras actions → `coming_soon`
- [x] Implement `record-lists.ts` + update `tile-nav.ts`
- [x] Tests green

### Task 2: Adapter listado

- [x] Test: `getRecordList` llama `search_read`/`search_count` con domain allowlisted
- [x] Implement types + BackendClient + OdooAdapter
- [x] Tests green

### Task 3: API + página + UI

- [x] API route + página SSR + `RecordTable` + estilos
- [x] Contract test shell-ui
- [x] `npm test` green; smoke manual si Odoo up

**Out of scope:** retirar archivos opción B en este plan (pueden quedar huérfanos).
