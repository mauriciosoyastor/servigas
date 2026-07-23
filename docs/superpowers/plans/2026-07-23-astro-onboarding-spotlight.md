# Onboarding spotlight — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tour spotlight inicio → hub → caja con overlay oscuro, hueco iluminado, Omitir / No volver a mostrar en localStorage.

**Architecture:** Módulo puro `onboarding-tour.ts` (pasos + storage); UI `OnboardingTour.astro` en `ShellLayout`; targets vía `data-tour`; spotlight con cutout `box-shadow`.

**Tech Stack:** Astro, TypeScript, CSS, node:test, localStorage/sessionStorage.

## Global Constraints

- Voz mostrador AR (voseo); sin jerga técnica en copy.
- Sin librería externa.
- Skip targets faltantes.
- Suite `web` verde.

---

### Task 1: Módulo + tests

- [ ] Crear `web/src/lib/shell/onboarding-tour.ts`
- [ ] Tests `web/tests/onboarding-tour.test.mjs`
- [ ] `npm test` verde en ese archivo

### Task 2: UI overlay + anchors

- [ ] `OnboardingTour.astro` + `onboarding.css`
- [ ] Montar en `ShellLayout`
- [ ] `data-tour` en index, RailNav, TileCard/hubs, pos

### Task 3: Docs + cierre

- [ ] ADR 0016 / CONTEXT nota onboarding
- [ ] Spec approved; shell-ui contracts
- [ ] Commit / push / PR #33
