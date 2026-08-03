# POS Physical Keyboard Numpad Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el ticket de `/pos` responda al teclado físico (dígitos, Enter, Escape, F1–F4) con la misma lógica que el numpad táctil.

**Architecture:** Módulo puro `mapKeyboardToNumpad` + `isEditableKeyboardTarget` en `web/src/lib/pos/`; listener `keydown` en `pos.astro` que despacha a `pressDigit` / `pressBackspace` / `setNumpadMode` / `applyNumpad` / clear buffer.

**Tech Stack:** Astro SSR page client script, TypeScript ESM, `node:test`.

**Spec:** `docs/superpowers/specs/2026-08-03-pos-physical-numpad-keyboard-design.md`

## Global Constraints

- No capturar si foco en `input` / `textarea` / `select` / `contenteditable`
- Reutilizar API existente de `numpad.ts` y `applyNumpad` en `pos.astro`
- Sin cambiar checkout / carrito / API
- TDD: tests del mapeo primero

---

### Task 1: Mapeo de teclado puro

**Files:**
- Create: `web/src/lib/pos/numpad-keyboard.ts`
- Test: `web/tests/pos-numpad-keyboard.test.mjs`

**Interfaces:**
- Produces: `NumpadKeyboardAction`, `mapKeyboardToNumpad(event)`, `isEditableKeyboardTarget(target)`

- [x] **Step 1:** Tests RED para dígitos, punto, NumpadDecimal, Backspace, Enter, Escape, F1–F4, teclas ignoradas
- [x] **Step 2:** Implementar módulo hasta verde
- [x] **Step 3:** `npm test -- tests/pos-numpad-keyboard.test.mjs`

### Task 2: Wiring en `/pos`

**Files:**
- Modify: `web/src/pages/pos.astro` (script del numpad)

- [x] **Step 1:** Importar helpers; `window`/`document` keydown → si editable ignore; si acción, `preventDefault` y despachar
- [x] **Step 2:** Escape limpia `pad.buffer` y `syncNumpadChrome`
- [x] **Step 3:** Smoke manual / tests existentes del numpad siguen pasando

### Task 3: Gates

- [x] `npm test` (o al menos numpad + keyboard)
- [x] Actualizar estado del spec a approved/implemented
