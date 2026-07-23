# Go condicional corte Astro — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Registrar en docs el corte autorizado condicional (Astro = shell oficial; smoke real = deuda pre-prod).

**Architecture:** Solo gobernanza documental alineada a ADR 0016 y a la spec `2026-07-23-astro-cutover-go-condicional-design.md`. Sin cambios de runtime.

**Tech Stack:** Markdown (`CONTEXT.md`, bitácora, ADR, spec).

## Global Constraints

- Texto canónico de la spec sin alterar el sentido.
- Smoke real permanece `[ ]` con nota de deuda.
- No tocar código OWL ni scripts de deploy.
- Suite `web` debe seguir verde.

---

### Task 1: CONTEXT.md — sección shell

**Files:**
- Modify: `CONTEXT.md`

- [x] **Step 1:** Retitular a “Shell Astro — corte autorizado (condicional)” y reemplazar párrafo/tabla Hoy/Meta con Astro = oficial, OWL = fallback, deuda smoke.
- [x] **Step 2:** Commit.

### Task 2: Bitácora + resumen ejecutivo

**Files:**
- Modify: `docs/proyecto/bitacora-cambios.md`

- [x] **Step 1:** Actualizar resumen ejecutivo (hubs/POS OWL → fallback; Astro → shell oficial condicional).
- [x] **Step 2:** Agregar entrada `2026-07-23 — Corte autorizado (condicional)`.
- [x] **Step 3:** Commit.

### Task 3: ADR 0016 + spec approved

**Files:**
- Modify: `docs/adr/0016-astro-shell-cutover.md`
- Modify: `docs/superpowers/specs/2026-07-23-astro-cutover-go-condicional-design.md`

- [x] **Step 1:** Checkbox corte autorizado `[x]`; smoke con nota deuda del go condicional; ajustar “Hoy” en decisión si hace falta.
- [x] **Step 2:** Spec `Estado: approved`.
- [x] **Step 3:** `cd web && npm test` (docs-only; confirmar verde).
- [ ] **Step 4:** Commit, push, actualizar PR.
