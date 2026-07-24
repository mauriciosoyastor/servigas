# Cargar lista de precios (Inventario) — Implementation Plan

> **For agentic workers:** Inline execution in-session (user requested implement). Steps use checkbox (`- [ ]`) syntax. REQUIRED: TDD on pure match/parse logic first.

**Goal:** Desde Inventario → Productos, abrir un wizard que importa Excel/CSV, hace preview (crear/actualizar/revisar/error) y aplica upsert de productos con precio de venta + costo.

**Architecture:** Lógica pura de parse/match/classify en un módulo Python testeable sin Odoo; TransientModel wizard + líneas de preview + log de auditoría; card hub con `ir.actions.act_window` `target=new`; `_get_action_payload` respeta `target` de la acción.

**Tech Stack:** Odoo 19 Community, TransientModel, CSV stdlib + openpyxl opcional para xlsx, unittest para lógica pura.

**Spec:** `docs/superpowers/specs/2026-07-23-inventory-price-list-import-design.md`

## Global Constraints

- Matching: barcode → `default_code` → nombre exacto; ambiguo → revisar (no auto-aplica).
- Precios: `list_price` + `standard_price`; precios vacíos no pisan.
- Nombre al actualizar: no se pisa.
- PDF/imagen: rechazo amable.
- Imágenes / stock / pricelists: fuera de v1.
- Barcode/`default_code` al actualizar: solo si el producto lo tiene vacío.
- Commits solo si el usuario lo pide.

## File map

| Archivo | Responsabilidad |
|---------|-----------------|
| `custom_addons/servigas_core/models/sg_price_list_import_logic.py` | Parse CSV/XLSX, normalize, match, classify (puro) |
| `custom_addons/servigas_core/tests/test_sg_price_list_import_logic.py` | Unittest sin Odoo |
| `custom_addons/servigas_core/models/sg_price_list_import_wizard.py` | Wizard + apply + audit |
| `custom_addons/servigas_core/models/sg_price_list_import_log.py` | Log persistente |
| `custom_addons/servigas_core/views/sg_price_list_import_views.xml` | Form wizard, action, plantilla hint |
| `custom_addons/servigas_core/data/hub_inventory_data.xml` | Card “Cargar lista de precios” |
| `custom_addons/servigas_core/models/sg_hub_card.py` | Respetar `action.target` |
| `custom_addons/servigas_core/security/ir.model.access.csv` | ACL wizard/log/lines |
| `custom_addons/servigas_core/__manifest__.py` | data + bump version |
| `custom_addons/servigas_core/static/src/data/sg_price_list_template.csv` | Plantilla descargable (vía ruta estática o Binary en wizard) |

---

### Task 1: Lógica pura parse + match (TDD)

**Files:**
- Create: `models/sg_price_list_import_logic.py`
- Create: `tests/test_sg_price_list_import_logic.py`

**Produces:**
- `parse_tabular_bytes(filename, raw_bytes) -> {headers, rows, error?}`
- `normalize_row(raw, mapping) -> {barcode, default_code, name, list_price, standard_price, price_errors}`
- `match_product(row, indexes) -> {status, product_id?, candidates?}` donde status ∈ create|update|review|error
- `classify_rows(rows, indexes) -> list[classified]`
- `suggest_mapping(headers) -> dict`
- `is_rejected_filename(filename) -> bool` (pdf/png/jpg…)

- [x] RED: tests match barcode/code/name, review ambiguo, error sin nombre, suggest_mapping, reject pdf
- [x] GREEN: implementar lógica mínima
- [x] Run: `python custom_addons/servigas_core/tests/test_sg_price_list_import_logic.py -v` → 15 OK

### Task 2: Hub target=new + card

**Files:**
- Modify: `sg_hub_card.py` `_get_action_payload` → `"target": action.target or "current"`
- Modify: `hub_inventory_data.xml` — card + action ref (action se define en Task 3; si hace falta, definir action XML primero)

- [x] Respetar target modal
- [x] Card en sección products, sequence ~5, icon `fa-upload`

### Task 3: Wizard + log + views + security

**Files:**
- Create: wizard model, log model, line transient, views XML
- Modify: `models/__init__.py`, `security/ir.model.access.csv`, `__manifest__.py`

**Wizard states:** `upload` → `mapping` → `preview` → `done`

**Flow methods:**
- `action_parse_file` — parse, reject pdf, suggest mapping, go mapping
- `action_build_preview` — normalize + match against product.product indexes, create lines
- `action_apply` — create/write selected create|update lines; write audit log; go done
- `action_download_template` — CSV plantilla

**Apply rules:** create almacenable (`type=consu`, `is_storable=True`); update only prices (+ empty barcode/code); skip review/error/unchecked.

- [x] Models + ACL + views + manifest
- [ ] Manual smoke: upgrade module, abrir card, importar CSV plantilla

### Task 4: Docs bitácora (ligero)

- [x] Nota breve en bitácora

---

## Self-review vs spec

| Spec | Task |
|------|------|
| Card Inventario → Productos | 2 |
| Wizard 4 pasos | 3 |
| Match barcode→code→name | 1+3 |
| Preview create/update/review/error | 3 |
| list_price + standard_price | 1+3 |
| PDF rechazo | 1+3 |
| Sin imágenes v1 | 3 (no campos) |
| Auditoría | 3 log |
| Plantilla | 3 |
