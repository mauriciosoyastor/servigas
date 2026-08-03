# Taller OT + artefactos — Implementation Plan

> Inline execution. TDD on pure serial normalize + allowlists first.

**Goal:** Hub Taller con OT digitales e historial por nº de serie.

**Spec:** `docs/superpowers/specs/2026-08-03-workshop-work-order-design.md`

## Tasks

1. Pure `normalizeSerial` + workshop allowlist modules (tests)
2. Odoo models `sg.appliance` / `sg.work.order` + ACL + views/actions + hub/tile XML
3. Shell hub registration (hub-apps, hub-nav, glossary, launcher-nav, rail)
4. record-lists + record-writes + create WO path in adapter
5. Astro pages: new OT form, lists, detail appliance history
6. Tests shell-ui + bitácora

## Global constraints

- No OCR, no FC, no stock
- Hybrid owner text + optional partner
- Serial unique normalized
