"""
Importa productos desde maestro_import_odoo_final.csv a Odoo.

Ejecutar desde odoo-workspace/odoo-19:
  python odoo-bin shell -c ../config/servigas.conf -d servigas_dev < ../../servigas/datos/import/import_a_odoo.py

O en shell interactivo:
  exec(open(r'.../import_a_odoo.py', encoding='utf-8').read())
"""

import csv
from pathlib import Path

CSV_PATH = Path(r"C:\Users\mauri\OneDrive\Desktop\servigas\datos\import\maestro_import_odoo_final.csv")
BATCH_SIZE = 200
ROOT_CATEGORY = "Repuestos Servigas"


def load_rows():
    rows = []
    with CSV_PATH.open(encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            rows.append(row)
    return rows


def get_or_create_category(path: str):
    """path ejemplo: 'Termotanques / Agua caliente'"""
    Category = env["product.category"]
    parent = Category.search([("name", "=", ROOT_CATEGORY)], limit=1)
    if not parent:
        parent = Category.create({"name": ROOT_CATEGORY})

    current = parent
    for part in [p.strip() for p in path.split("/") if p.strip()]:
        child = Category.search(
            [("name", "=", part), ("parent_id", "=", current.id)], limit=1
        )
        if not child:
            child = Category.create({"name": part, "parent_id": current.id})
        current = child
    return current.id


category_cache = {}


def category_id_for(path: str) -> int:
    key = path or "General"
    if key not in category_cache:
        category_cache[key] = get_or_create_category(key)
    return category_cache[key]


def to_float(value, default=0.0):
    if value in (None, ""):
        return default
    try:
        return float(str(value).replace(",", "."))
    except ValueError:
        return default


def to_bool_active(value) -> bool:
    return str(value).strip().lower() in {"si", "s", "1", "true", "yes"}


print(f"Leyendo {CSV_PATH}")
rows = load_rows()
print(f"Filas a importar: {len(rows)}")

Product = env["product.template"]
existing_codes = {
    p.default_code: p.id
    for p in Product.search([("default_code", "!=", False)])
    if p.default_code
}
used_barcodes = {
    p.barcode
    for p in Product.search([("barcode", "!=", False)])
    if p.barcode
}

created = 0
updated = 0
skipped = 0
stock_lines = []

for index, row in enumerate(rows, start=1):
    code = (row.get("codigo_fabricante") or "").strip()
    name = (row.get("descripcion") or "").strip()
    if not code or not name:
        skipped += 1
        continue

    vals = {
        "name": name[:512],
        "default_code": code[:128],
        "list_price": to_float(row.get("precio_publico")),
        "standard_price": to_float(row.get("costo")),
        "categ_id": category_id_for(row.get("categoria_producto") or "General"),
        "active": to_bool_active(row.get("activo", "si")),
        "type": "consu",
        "is_storable": True,
        "sale_ok": True,
        "purchase_ok": True,
    }
    barcode = (row.get("codigo_barras") or "").strip()
    if barcode and barcode not in used_barcodes:
        vals["barcode"] = barcode[:128]
        used_barcodes.add(barcode)

    if code in existing_codes:
        Product.browse(existing_codes[code]).write(vals)
        updated += 1
        product = Product.browse(existing_codes[code])
    else:
        product = Product.create(vals)
        existing_codes[code] = product.id
        created += 1

    qty = to_float(row.get("stock_deposito"), default=0.0)
    if qty > 0:
        stock_lines.append((product.product_variant_id.id, qty))

    if index % 500 == 0:
        env.cr.commit()
        print(f"  Procesados {index}/{len(rows)}...")

env.cr.commit()
print(f"Productos creados: {created}")
print(f"Productos actualizados: {updated}")
print(f"Omitidos: {skipped}")

if stock_lines:
    print(f"Aplicando stock inicial para {len(stock_lines)} productos...")
    warehouse = env["stock.warehouse"].search([], limit=1)
    if not warehouse:
        print("AVISO: sin almacén configurado, stock no aplicado.")
    else:
        location = warehouse.lot_stock_id
        Quant = env["stock.quant"].with_context(inventory_mode=True)
        for variant_id, qty in stock_lines:
            quant = Quant.search(
                [
                    ("product_id", "=", variant_id),
                    ("location_id", "=", location.id),
                ],
                limit=1,
            )
            if quant:
                quant.inventory_quantity = qty
            else:
                Quant.create(
                    {
                        "product_id": variant_id,
                        "location_id": location.id,
                        "inventory_quantity": qty,
                    }
                )
        Quant._apply_inventory()
        env.cr.commit()
        print("Stock inicial aplicado.")

env.cr.commit()
print("Importación finalizada.")
