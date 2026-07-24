# Lenguaje de mostrador AR — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Copy de mostrador (Argentina) en shell Astro + renombre de rutas visibles con alias/redirect.

**Architecture:** Claves canónicas nuevas en `record-lists` (`solicitudes`, `ventas-caja`, `existencias`); mapa de alias viejo→nuevo en `resolveRecordListKey`; páginas redirigen si el slug es alias; API acepta alias. Barrido de strings UI según glosario de la spec.

**Tech Stack:** Astro pages, TypeScript shell libs, node:test.

## Global Constraints

- Voz: mostrador claro, voseo, sin RFQ/SKU/POS suelto/Qty/VAT/quants/hub/launcher/allowlisted/BFF/Astro/corte.
- Mantener CUIT, IVA, OC, NC, FC.
- Redirect/alias desde paths/keys viejos.
- Tiles Odoo fuera de alcance.
- Suite `web` verde.

---

### Task 1: Alias + renombre de keys/paths

- [x] Export `resolveRecordListKey` + `LIST_KEY_ALIASES`
- [x] Renombrar keys/paths/titles/hints canónicos
- [x] `getRecordListDef` resuelve alias → def canónica
- [x] Actualizar order-creates / record-actions (+ alias)

### Task 2: Páginas, redirects y links

- [x] Mover pages (`solicitudes/new`, `ventas-caja/[id]`)
- [x] Redirects en `astro.config.mjs` + slug handlers
- [x] Links home/POS/forms/adapter

### Task 3: Barrido de copy UI

- [x] Aplicar glosario
- [x] Tests shell-ui actualizados

### Task 4: Smoke + cierre

- [x] `smoke-shell-path.mjs` paths nuevos
- [x] Spec `approved`; suite **163** verde
- [x] Commit / push / PR
