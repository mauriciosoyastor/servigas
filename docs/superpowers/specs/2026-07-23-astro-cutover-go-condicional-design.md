# Spec — Corte autorizado (go condicional) shell Astro

**Fecha:** 2026-07-23  
**Estado:** approved  
**ADR:** [0016](../../adr/0016-astro-shell-cutover.md)  
**Decisión de producto:** opción **1 — go condicional**

## Problema

ADR 0016 adopta postura B (camino a corte) pero deja OWL como producción hasta un **go explícito** en `CONTEXT.md` + bitácora. La cola de paridad/BFF (#13–#29) ya está en `main`. Falta registrar la decisión de corte sin fingir un smoke real contra Odoo (sigue diferido).

## Decisión

Autorizar el corte de gobernanza con condición abierta:

1. **Shell oficial** = Astro BFF (`web/`): login → launcher/hubs → listas allowlisted → POS caja.
2. **Deuda pre-prod** = smoke camino feliz contra Odoo dev (script `web` listo; evidencia real pendiente).
3. **OWL** = fallback residual (hotfix prod si hace falta); no es el norte de producto ni de build.
4. **No implica** apagar assets OWL ni un deploy automático en este slice: es decisión documental + checklist.

## Texto canónico (copiar a CONTEXT / bitácora)

> **Corte autorizado (condicional) — 2026-07-23.**  
> Shell oficial = Astro BFF (`web/`).  
> Deuda pre-prod: smoke camino feliz contra Odoo (login → hubs → producto → cotización/RFQ → venta POS).  
> OWL queda como fallback hasta que ese smoke pase en el entorno objetivo.

## Cambios de archivos

| Archivo | Cambio |
|---------|--------|
| `CONTEXT.md` | Retitular sección shell; declarar go condicional; actualizar tabla Hoy/Meta |
| `docs/proyecto/bitacora-cambios.md` | Entrada go + resumen ejecutivo (Astro oficial / OWL fallback) |
| `docs/adr/0016-astro-shell-cutover.md` | Checkbox “corte autorizado” → `[x]`; smoke sigue `[ ]` con nota de deuda del go condicional |
| Esta spec | Estado → approved al implementar |

## Fuera de alcance

- Ejecutar smoke real / exigir Odoo up
- Borrar o deshabilitar código OWL
- Offline POS, multi-caja, AFIP, recorrido/onboarding
- Pixel-perfect vs OWL

## Criterios de aceptación

- [x] `CONTEXT.md` no contradice “Astro = shell oficial”
- [x] Bitácora tiene entrada con texto canónico + verificación
- [x] ADR 0016: corte autorizado `[x]`; smoke `[ ]` con deuda explícita
- [x] Suite `web` sigue verde (docs-only; sin regresión)

## Verificación

```bash
cd web && npm test
# Smoke real (más tarde, con Odoo):
# cd web && npm run smoke:shell
```

## Self-review

- Sin placeholders ni “TBD” operativos.
- No contradice ADR 0016 postura B; solo cierra el checkbox de go.
- Scope acotado a docs de gobernanza.
