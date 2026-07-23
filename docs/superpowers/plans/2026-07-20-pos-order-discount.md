# Descuento general POS — Implementation Plan

> **For agentic workers:** Inline execution in-session (user requested implement). Steps use checkbox syntax.

**Goal:** Botón **Desc.** debajo de Precio en el numpad del Mostrador que aplica descuento global % vía `pos_discount` nativo.

**Architecture:** Dependencia `pos_discount` + config (producto + `module_pos_discount`). Patch OWL de `ProductScreen` que inserta botón `order_discount` en el numpad (fila bajo Precio) y reutiliza `pos.applyDiscount` / NumberPopup. Contrato tema `order-discount-control` + SCSS. ADR 0014 excepción OWL acotada.

**Tech Stack:** Odoo 19 Community, OWL patch, Node tests, SCSS Liquid Glass.

## Global Constraints

- Descuento = % sobre total; apila con `%` de línea; una línea aparte en ticket.
- Reutilizar motor nativo; no reinventar impuestos.
- Sin E2E Playwright obligatorio.
- Commits solo si el usuario lo pide.

---

### Task 1: Contrato tema + helper numpad (TDD)

**Files:**
- Create: `custom_addons/servigas_core/static/src/js/services/sg_pos_order_discount.js`
- Create: `custom_addons/servigas_core/static/tests/node/sg_pos_order_discount.test.mjs`
- Modify: `sg_pos_theme.js`, `sg_pos_theme.test.mjs`, `servigas_pos.scss`

- [x] RED/GREEN superficie `order-discount-control` selector `.pos .numpad-order-discount`
- [x] RED/GREEN helper `buildOrderDiscountNumpadLayout` (20 botones, Desc. bajo Precio, Backspace intacto)

### Task 2: Patch OWL ProductScreen + assets

**Files:**
- Create: `…/static/src/js/pos/sg_product_screen_order_discount.js`
- Modify: `__manifest__.py` (depends `pos_discount`, assets POS, bump version)

- [x] Patch `getNumpadButtons` / `onNumpadClick` → NumberPopup → `pos.applyDiscount`

### Task 3: Config datos

**Files:**
- Modify: `datos/import/configurar_pos.py`, `hooks.py`

- [x] Instalar/activar global discount + producto «Descuento general»

### Task 4: ADR + bitácora

**Files:**
- Create: `docs/adr/0014-pos-order-discount-numpad.md`
- Modify: `CONTEXT.md`, `docs/proyecto/bitacora-cambios.md`

- [x] ADR 0014 + bitácora + CONTEXT
