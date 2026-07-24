# Bitácora de cambios — Servigas

> Documento vivo: registra **qué** cambiamos, **por qué**, **dónde** y **qué se podría automatizar** en proyectos futuros.
>
> **Mantenerlo:** al cerrar cada sesión de trabajo significativa, agregar una entrada con la plantilla de abajo. Los agentes de Cursor deben leer este archivo antes de tocar tema/UI y actualizarlo al terminar.

**Relacionado:** [CONTEXT.md](../../CONTEXT.md) · [liquid-glass-odoo.md](../design/liquid-glass-odoo.md) · [owl-liquid-glass-boundaries.md](../design/owl-liquid-glass-boundaries.md) · [servigas-brand.md](../design/servigas-brand.md)

---

## Cómo usar esta bitácora

| Rol | Acción |
|-----|--------|
| **Humano** | Revisa el backlog de automatización al planificar un cliente nuevo |
| **Agente Cursor** | Añade entrada al implementar; marca oportunidades de script/plantilla |
| **Futuro yo** | Copia la sección «Kit reutilizable» como base para otro Odoo + marca |

### Plantilla para nuevas entradas

```markdown
### YYYY-MM-DD — Título breve

**Área:** tema | datos | POS | compras | infra | docs | …
**Motivo:** por qué se hizo
**Archivos:** lista de paths tocados
**Cambios:** bullets concretos
**Verificación:** comando o paso manual para validar
**Automatización:** qué se podría templatizar / scriptear (o «ninguna»)
```

---

### 2026-07-24 — Contabilidad ops: pagos, NC, FP, vencimientos

**Área:** contabilidad | web | BFF | hubs  
**Motivo:** cerrar circuito operativo día a día en Astro (cobrar/pagar, NC, FP, mora).  
**Archivos:**  
- `web/src/lib/shell/{invoice-creates,payment-registers,aging,record-actions,record-lists}.ts`  
- `web/src/lib/bff/{odoo-adapter,backend-client}.ts` + API `register_payment`  
- UI: NC/FP `new` + Publicar; `RecordRegisterPaymentControl`; FC/FP cobro/pago  
- Hub aging cards + `sg.hub.card` scopes `due_today|due_week|overdue`  
- Spec: `docs/superpowers/specs/2026-07-24-accounting-ops-prioridad-alta-design.md`  
**Cambios:**  
- Crear/publicar NC (`out_refund`) y FP (`in_invoice`) con mismo patrón multi-línea que FC  
- Registrar cobro/pago parcial o total vía `account.payment.register`  
- Listas + cards: vencidas / vence hoy / vence esta semana (por cobrar y por pagar)  
**Verificación:** `cd web && npm test`  
**Automatización:** patrón allowlist + control UI reutilizable para próximas acciones contables.

---

## Resumen ejecutivo (estado al 2026-07-23)

| Área | Estado | Notas |
|------|--------|-------|
| Identidad visual | Hecho | Tokens llama + Montserrat (`servigas_tokens.scss`) |
| Backend Odoo | Hecho | Navbar, acentos flame, `servigas_hub.scss` |
| Hubs App Shell (OWL) | **Residual admin** | Día D 2026-07-23: solo Settings |
| POS OWL | **Residual admin** | Operativos cobran en POS Astro |
| Catálogo / datos | Hecho | 8.767 SKU importados |
| Facturación fiscal | Pendiente | Factura Web manual por ahora |
| Shell Astro BFF (`web/`) | **Shell oficial (día D)** | Smoke + OWL apagado para operativos |
| Infra GitHub (`main`) | Documentado | Ruleset versionado; aplicar con script o UI |

**Docs de referencia hubs:** [plan-hub-rail-kpi-ingreso.md](./plan-hub-rail-kpi-ingreso.md) · [plan-liquid-glass-kpi-routes.md](./plan-liquid-glass-kpi-routes.md)

---

## Entradas

### 2026-07-24 — Tipo comprobante sugerido + checklist l10n_ar (fase 3a/3b)

**Área:** contabilidad | docs | integraciones  
**Motivo:** preparar AFIP sin emitir: CF→B/C, CUIT→A/B + guía instalación.  
**Archivos:**
- `web/src/lib/shell/invoice-dest.ts` (`suggestedDocType*`)
- `web/src/lib/bff/odoo-adapter.ts` (columna/ficha tipo sugerido)
- `servigas_integrations` process_notes Factura Web + `19.0.1.0.1`
- `docs/proyecto/checklist-l10n-ar-afip.md`, CONTEXT

**Cambios:**
- Lista/ficha muestran tipo sugerido; alta FC informa al elegir cliente.
- Checklist `l10n_ar`; emisión real queda 3c.

**Verificación:** `cd web && npm test`  
**Automatización:** helper reutilizable cuando llegue EDI.

### 2026-07-24 — Crear FC desde pedido (fase 2b)

**Área:** ventas | contabilidad | web  
**Motivo:** cerrar arco D: pedido a facturar → FC borrador → Publicar.  
**Archivos:**
- `web/src/lib/shell/order-invoice.ts`
- `web/src/lib/bff/odoo-adapter.ts` (`createInvoiceFromOrder`)
- `web/src/components/RecordCreateInvoiceControl.astro`
- `web/src/pages/lists/sales/orders/[id].astro`
- Spec: `docs/superpowers/specs/2026-07-24-fc-from-sale-order-design.md`

**Cambios:**
- Botón **Crear FC** si `invoice_status = to invoice`.
- BFF `action: create_invoice` → `_create_invoices` / wizard; redirect a FC.
- Publicar sigue validando CF/CUIT (2a).

**Verificación:** `cd web && npm test`  
**Automatización:** allowlist order-invoice reutilizable.

### 2026-07-24 — FC create + publicar con destino (fase 2a)

**Área:** contabilidad | web | BFF  
**Motivo:** alta manual de FC y Publicar con validación CF/CUIT.  
**Archivos:**
- `web/src/lib/shell/invoice-creates.ts`, `invoice-dest.ts`, `record-actions.ts`
- `web/src/lib/bff/odoo-adapter.ts` (create `account.move`, `action_post`, enrich dest)
- `web/src/pages/lists/accounting/customer-invoices/new.astro` + fichas Publicar
- Spec/plan 2a en `docs/superpowers/`

**Cambios:**
- Crear FC borrador multi-línea desde Astro; badge destino desde partner.
- Publicar con `action_post`; CUIT exige vat + calle + ciudad.
- CTA **Nueva factura** en lista FC.

**Verificación:** `cd web && npm test`  
**Automatización:** patrón invoice-creates reutilizable para 2b (desde pedido).

### 2026-07-24 — Destino fiscal CF vs CUIT (fase 1)

**Área:** contabilidad | partners | POS | web | core  
**Motivo:** clasificar clientes Consumidor final / Con CUIT antes de FC Astro y AFIP.  
**Archivos:**
- `custom_addons/servigas_core/models/res_partner.py` (`sg_invoice_dest`)
- `web/src/lib/shell/invoice-dest.ts`, `record-writes.ts`, `record-lists.ts`
- `web/src/pages/lists/sales/customers/*`, `pos.astro`, forms create/detail
- Spec/plan: `docs/superpowers/specs/2026-07-24-cf-cuit-invoice-destination-design.md`

**Cambios:**
- Campo `sg_invoice_dest` (`cf`|`cuit`) + constraint Odoo si CUIT sin `vat`.
- Alta/edición Astro con selector; lista badge CF/CUIT; POS badge + aviso no bloqueante.
- BFF valida destino CUIT sin CUIT (400). Módulo `19.0.1.20.34`.

**Verificación:** `cd web && npm test`  
**Automatización:** helper `invoice-dest.ts` reutilizable para fase 2 FC.

### 2026-07-23 — Día D: apagar UI OWL de negocio para operativos

**Área:** core | gobernanza | shell  
**Motivo:** smoke camino feliz OK → ejecutar ADR 0016 día D.  
**Archivos:**
- `custom_addons/servigas_core/models/sg_app_tile.py` (`setup_launcher_home_for_users`)
- `custom_addons/servigas_core/views/servigas_app_menu.xml`
- `custom_addons/servigas_core/migrations/19.0.1.20.31/post-migrate.py`
- `CONTEXT.md`, ADR 0016

**Cambios:**
- Home OWL solo usuarios Settings; operativos pierden `action_id` del launcher.
- Menú raíz Servigas OWL restringido a `base.group_system`.
- Tiles `sg.app.tile` **sin** cambio de grupos (Astro sigue usándolos vía BFF).
- Versión módulo `19.0.1.20.31`.

**Verificación:** `-u servigas_core` en `servigas_dev`; login operativo en `/web` sin launcher; Astro `/` con tiles OK.  
**Automatización:** post-migrate reaplica home/menú en upgrade.

### 2026-07-23 — Fix checkout POS (tax_ids) + smoke mutate OK

**Área:** web | POS | BFF  
**Motivo:** `SMOKE_MUTATE=1` fallaba con UserError «orden no se pagó por completo».  
**Causa:** líneas `pos.order` sin `tax_ids` → al escribir pagos Odoo recalculaba `amount_total` sin IVA.  
**Archivos:** `web/src/lib/bff/odoo-adapter.ts`, `web/tests/odoo-adapter.test.mjs`, ADR 0016, `CONTEXT.md`  
**Cambios:** `tax_ids` en create de líneas; pago con `amount_total` leído de Odoo tras create.  
**Verificación:** `SMOKE_MUTATE=1 npm run smoke:shell` → PASS; 217 tests OK.  
**Automatización:** smoke mutate cubre el camino de cobro.

### 2026-07-23 — Smoke lectura OK + CI tests + numpad no recortado

**Área:** web | infra | docs | POS  
**Motivo:** cerrar deuda de verificación parcial del go condicional y endurecer proceso (tests en CI, smoke usable en Windows).  
**Archivos:**
- `web/scripts/smoke-shell-path.mjs` (default `localhost`)
- `web/scripts/test-env.mjs` + `web/package.json` (tests cross-platform)
- `.github/workflows/ci.yml` (`npm test` antes del build)
- `web/src/pages/pos.astro` (panel numpad separado del footer de cobro)
- `docs/adr/0016-astro-shell-cutover.md`, `CONTEXT.md`

**Cambios:**
- Smoke lectura PASS contra Odoo `servigas_dev` + Astro `:4321`.
- CI corre suite unitaria; `npm test` ya no depende de `NODE_ENV=…` estilo Unix.
- Numpad: `sg-pos-numpad-panel` + `sg-pos-cart-footer` (puerto del fix de `feature/astro-pos-numpad` sin pisar cliente/IVA/stock).

**Verificación:**
- `npm run smoke:shell` → PASS
- `npm test` → suite verde

**Automatización:** CI + smoke script.

### 2026-07-23 — Cargar lista de precios (shell Astro + Odoo)

**Área:** datos | hubs | inventario | web  
**Motivo:** upsert de productos (crear + actualizar venta/costo) desde CSV con preview; el botón vive en la lista Astro que usa el equipo (no solo hub Odoo).  
**Archivos:**
- `docs/superpowers/specs/2026-07-23-inventory-price-list-import-design.md`
- `docs/superpowers/plans/2026-07-23-inventory-price-list-import.md`
- `custom_addons/servigas_core/models/sg_price_list_import_*.py`
- `custom_addons/servigas_core/views/sg_price_list_import_views.xml`
- `web/src/lib/shell/price-list-import.ts`
- `web/src/pages/lists/inventory/products/import.astro`
- `web/src/pages/api/inventory/price-list-import.ts`
- `web/src/pages/lists/[...slug].astro`
- `web/src/lib/bff/odoo-adapter.ts`

**Cambios:**
- Botón **Cargar lista de precios** en `/lists/inventory/products` (Astro).
- Página import + BFF preview/apply; match barcode → código → nombre.
- Wizard Odoo residual (hub) + lógica Python testeada.

**Verificación:**
- `python custom_addons/servigas_core/tests/test_sg_price_list_import_logic.py -v`
- `cd web; $env:NODE_ENV='test'; node --experimental-strip-types --test tests/price-list-import.test.mjs`
- UI: lista productos → Cargar lista de precios → CSV

**Automatización:** lógica pura TS/Python + plantilla CSV.

---

### 2026-07-23 — Listas Astro tabla glass

**Área:** docs | web  
**Motivo:** unificar look de listas operativas Astro en isla glass desktop + cards móvil, sin tocar BFF.  
**Archivos:**
- `docs/superpowers/specs/2026-07-23-astro-listas-tabla-glass-design.md`
- `docs/superpowers/plans/2026-07-23-astro-listas-tabla-glass.md`
- `web/src/styles/list.css`
- `web/src/components/RecordTable.astro`
- `web/tests/shell-ui.test.mjs`

**Cambios:**
- Spec + plan: híbrido C (tabla densa glass ≥768px; cards `<768px`; sin cambios BFF).
- Desktop: isla `.sg-record-table-wrap` on-dark, sticky header, zebra/hover flame.
- Móvil: `data-label` en celdas + reflow a cards; toolbar/pager apilados.

**Verificación:** `cd web; $env:NODE_ENV='test'; node --experimental-strip-types --test tests/**/*.test.mjs` (175 pass). Visual: `/lists/inventory/products` (glass + imágenes), DevTools 390px (cards), `/lists/purchase/vendors` (sin imagen).  
**Automatización:** contratos en `shell-ui.test.mjs`; checklist visual manual al cerrar features de lista.

---

### 2026-07-23 — Corte autorizado (condicional) shell Astro

**Área:** docs | web  
**Motivo:** cerrar el go/no-go de ADR 0016 sin fingir smoke real; Astro pasa a ser shell oficial con deuda pre-prod explícita.  
**Archivos:**
- `CONTEXT.md`
- `docs/adr/0016-astro-shell-cutover.md`
- `docs/proyecto/bitacora-cambios.md`
- `docs/superpowers/specs/2026-07-23-astro-cutover-go-condicional-design.md`
- `docs/superpowers/plans/2026-07-23-astro-cutover-go-condicional.md`
- `web/README.md`

**Cambios:**
- Texto canónico: corte autorizado (condicional); Astro = oficial; OWL = fallback; smoke = deuda.
- Checklist ADR: corte autorizado `[x]`; smoke sigue abierto como deuda pre-prod.
- Resumen ejecutivo alineado.

**Verificación:** leer `CONTEXT.md` § shell + ADR 0016 checklist; `cd web && npm test`. Smoke real: `cd web && npm run smoke:shell` (más tarde).  
**Automatización:** enganchar smoke shell a CI cuando haya Odoo deciable en el entorno.

---

### 2026-07-23 — Gobernanza: camino a corte Astro (ADR 0016)

**Área:** docs | web  
**Motivo:** fijar postura B (Astro reemplaza shell operativo OWL, incluyendo POS) y checklist go/no-go.  
**Archivos:**
- `docs/adr/0016-astro-shell-cutover.md`
- `CONTEXT.md`
- `docs/proyecto/bitacora-cambios.md`
- `web/README.md`

**Cambios:**
- Decisión B + alcance día D = shell + listas + POS Astro.
- OWL sigue prod hasta go explícito; filtro semanal anti-lab.
- Resumen ejecutivo actualizado a “camino a corte”.

**Verificación:** leer ADR 0016 + sección shell en `CONTEXT.md`.  
**Automatización:** checklist go/no-go → issues/smoke CI cuando haya session store durable.

---

### 2026-07-04 — Guardrails OWL + Liquid Glass v2

**Área:** docs  
**Motivo:** documentar límites técnicos de OWL/Odoo para que agentes y humanos avisen cuando una propuesta de UI no es viable, y guiar el diseño moderno máximo sin romper funcionalidad.

**Archivos:**
- `docs/design/owl-liquid-glass-boundaries.md` *(nuevo)*
- `CONTEXT.md`
- `docs/proyecto/bitacora-cambios.md` *(este archivo)*

**Cambios:**
- Doc guardrails: stack OWL, capas S/O/X, tabla propuestas inviables (§5.1), árbol de decisión, invariantes LG v2, protocolo agentes, alcance N1–N5.
- `CONTEXT.md`: enlace al doc + regla #2 para agentes (avisar antes de implementar propuestas fuera de alcance).
- Bitácora: enlace cruzado al nuevo doc.

**Verificación:** agente lee `owl-liquid-glass-boundaries.md` antes de proponer cambios UI; propuesta tipo «glass en cada fila de lista» debe generar aviso §10.

**Automatización:** skill Cursor local `servigas-owl-ui-guardrails` (backlog) que referencie este doc + `liquid-glass-v2-routes`.

---

### 2026-07-03 — Bitácora: kit automatización hubs App Shell

**Área:** docs  
**Motivo:** documentar cómo replicar rails + KPI cards en futuros proyectos Odoo sin reimplementar desde cero.

**Archivos:**
- `docs/proyecto/bitacora-cambios.md` *(este archivo)*

**Cambios:**
- Sección **Kit reutilizable — App Hub Shell** (checklist, mapa 4 apps, contrato `sg.hub.card`).
- Propuesta **`hub.yaml`** + comando `scaffold_odoo_hub.py` (backlog A9–A10).
- Refactor **hub OWL genérico** (A11), skill Cursor (A12), tests smoke (A13).
- Tabla errores frecuentes y verificación estándar.
- Resumen ejecutivo actualizado: hubs **Hecho** en v19.0.1.4.0.

**Verificación:** agente o humano sigue checklist «Por cada app Odoo» en nuevo repo.

**Automatización:** implementar A9–A13 en repo `odoo-hub-scaffold` o script en `scripts/`.

---

### 2026-07-22 — Spike Astro BFF shell (Fase A) — verificación

**Área:** web | docs  
**Motivo:** cerrar el spike `feature/astro-bff-shell`: shell Astro con BFF contra Odoo (login, launcher, rail, hub inventory) y dejar constancia de qué está probado y qué falta antes de un corte a producción.

**Archivos:**
- `web/` — SSR (`@astrojs/node`), `OdooAdapter`, rutas API auth/launcher/hub, páginas login/home/hubs, estilos `--sg-*`
- `web/tests/*.test.mjs` — 36 tests (adaptador, rutas, tile-nav, contratos UI)
- `docs/superpowers/plans/2026-07-22-astro-bff-shell-spike.md` — plan Tasks 1–7

**Cambios:**
- BFF con cookie httpOnly; sesión Odoo solo server-side.
- Launcher desde `sg.app.tile`; hub `inventory` desde `sg.hub.card` (sección `summary`).
- Tiles no-hub y clicks de cards → UI «Próximamente» (sin embed Odoo).
- Liquid Glass razonable vía tokens/shell CSS en Astro (paridad visual no validada contra instancia real).

**Verificación:**

| Check | Resultado |
|-------|-----------|
| `cd web && npm test` | **PASS** — 36/36 (11 suites) |
| Login contra Odoo dev | **Pendiente** — sin instancia/credenciales en esta sesión |
| Tiles reales en home | **Pendiente** |
| Rail → hub inventory | **Pendiente** (cubierto parcialmente por tests de contrato UI) |
| Cards reales en hub | **Pendiente** |
| No-hub / cards → Próximamente | **PASS** (unit: `tile-nav`, `shell-ui`) |
| Look Liquid Glass razonable | **Pendiente** — revisión visual manual |

**Commits del spike (rama `feature/astro-bff-shell`):** `434c5b2` … `f30ffff` (Tasks 1–6).

**Automatización:** smoke E2E con Odoo dev levantado (`web` + `ODOO_URL`); script CI `npm test` en `web/`; checklist manual Fase A reutilizable para Fase B (skill molde).
