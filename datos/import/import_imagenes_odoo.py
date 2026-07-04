"""
Importa solo imágenes de producto a Odoo (sin tocar precios ni stock).

Requiere archivos en datos/import/imagenes/ nombrados por codigo_fabricante:
  00.BIS0001.webp, ABRANORT-1.webp, etc.

Ejecutar desde odoo-workspace/odoo-19:
  python odoo-bin shell -c ../config/servigas.conf -d servigas_dev \\
    < ../../servigas/datos/import/import_imagenes_odoo.py
"""

from pathlib import Path
import sys

IMPORT_DIR = Path(__file__).parent
sys.path.insert(0, str(IMPORT_DIR))

from imagenes_producto import IMAGES_DIR, list_image_codes, load_image_b64

Product = env["product.template"]

codes = list_image_codes()
if not codes:
    print(f"AVISO: no hay imágenes en {IMAGES_DIR}")
    print("  Colocá archivos .webp/.jpg/.png nombrados por codigo_fabricante.")
    print("  O ejecutá primero: python datos/import/convertir_imagenes_webp.py")
else:
    print(f"Imágenes encontradas: {len(codes)} en {IMAGES_DIR}")

    products_by_code = {
        p.default_code: p
        for p in Product.search([("default_code", "!=", False)])
        if p.default_code
    }

    updated = 0
    missing_product = 0
    missing_file = 0
    errors = 0

    for index, code in enumerate(codes, start=1):
        product = products_by_code.get(code)
        if not product:
            missing_product += 1
            continue

        image_b64 = load_image_b64(code)
        if not image_b64:
            missing_file += 1
            continue

        try:
            product.write({"image_1920": image_b64})
            updated += 1
        except Exception as exc:
            errors += 1
            print(f"  ERR {code}: {exc}")

        if index % 200 == 0:
            env.cr.commit()
            print(f"  Procesados {index}/{len(codes)}...")

    env.cr.commit()
    print(f"Imágenes actualizadas: {updated}")
    print(f"Sin producto en Odoo: {missing_product}")
    print(f"Sin archivo legible: {missing_file}")
    if errors:
        print(f"Errores: {errors}")
    print("Importación de imágenes finalizada.")
