"""
Descarga fotos de productos prioridad 1 desde fuentes web y las guarda en WebP.

Fuentes por marca:
  - Orbis / Fercor / códigos numéricos → carrsur.com (catálogo WooCommerce)
  - Eskabe / Brogas / Orbis (fallback)  → casavelmen.com (código o descripción)
  - Longvie                             → longviestore.com + casavelmen

Uso:
  pip install pillow
  python datos/import/descargar_fotos_prioridad1.py --marca Orbis --limit 20
  python datos/import/descargar_fotos_prioridad1.py --refresh-index
  python datos/import/descargar_fotos_prioridad1.py

Luego cargar a Odoo:
  python odoo-bin shell -c ../config/servigas.conf -d servigas_dev \\
    < ../../servigas/datos/import/import_imagenes_odoo.py
"""

from __future__ import annotations

import argparse
import csv
import sys
import time
import urllib.parse
from io import BytesIO
from pathlib import Path

IMPORT_DIR = Path(__file__).parent
sys.path.insert(0, str(IMPORT_DIR))

from fetchers_fotos import FotoFetcherRouter, HttpClient
from imagenes_producto import IMAGES_DIR, ORIGINALES_DIR, find_image_path

LISTA_CSV = IMPORT_DIR / "lista_fotos_prioridad1.csv"
REPORT_CSV = IMPORT_DIR / "descargar_fotos_report.csv"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Descarga fotos web → WebP para prioridad 1.")
    parser.add_argument("--marca", help="Filtrar por marca_prioridad (Orbis, Eskabe, etc.)")
    parser.add_argument("--limit", type=int, help="Máximo de productos a procesar")
    parser.add_argument("--skip-existing", action="store_true", help="Omitir si ya hay .webp")
    parser.add_argument("--refresh-index", action="store_true", help="Reconstruir índices web")
    parser.add_argument("--delay", type=float, default=0.15, help="Pausa entre requests HTTP")
    parser.add_argument("--min-confianza", type=float, default=0.35, help="Confianza mínima")
    parser.add_argument(
        "--solo-reporte",
        action="store_true",
        help="Solo buscar URLs, no descargar imágenes",
    )
    return parser.parse_args()


def load_productos(marca: str | None, limit: int | None) -> list[dict]:
    rows = list(csv.DictReader(LISTA_CSV.open(encoding="utf-8-sig")))
    if marca:
        rows = [r for r in rows if r["marca_prioridad"].lower() == marca.lower()]
    if limit:
        rows = rows[:limit]
    return rows


def save_webp(content: bytes, dest: Path, max_px: int = 1024, quality: int = 85) -> None:
    from PIL import Image

    with Image.open(BytesIO(content)) as img:
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGBA")
        else:
            img = img.convert("RGB")
        width, height = img.size
        longest = max(width, height)
        if longest > max_px:
            scale = max_px / longest
            img = img.resize((round(width * scale), round(height * scale)))
        dest.parent.mkdir(parents=True, exist_ok=True)
        img.save(dest, "WEBP", quality=quality, method=6)


def append_report(rows: list[dict]) -> None:
    if not rows:
        return
    write_header = not REPORT_CSV.exists()
    with REPORT_CSV.open("a", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        if write_header:
            writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    try:
        from PIL import Image  # noqa: F401
    except ImportError:
        print("ERROR: instalá Pillow con: pip install pillow", file=sys.stderr)
        return 1

    if not LISTA_CSV.is_file():
        print(f"ERROR: no existe {LISTA_CSV}. Ejecutá generar_lista_fotos_prioridad1.py", file=sys.stderr)
        return 1

    args = parse_args()
    productos = load_productos(args.marca, args.limit)
    if not productos:
        print("AVISO: no hay productos para procesar.")
        return 0

    http = HttpClient(delay_s=args.delay)
    router = FotoFetcherRouter(http, refresh_index=args.refresh_index)

    print(f"Productos a procesar: {len(productos)}")
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    ORIGINALES_DIR.mkdir(parents=True, exist_ok=True)

    stats = {"ok": 0, "skip": 0, "miss": 0, "error": 0}
    report_batch: list[dict] = []

    for index, row in enumerate(productos, start=1):
        code = row["codigo_fabricante"].strip()
        marca = row["marca_prioridad"].strip()
        descripcion = row["descripcion"].strip()
        dest = IMAGES_DIR / f"{code}.webp"

        if args.skip_existing and find_image_path(code):
            stats["skip"] += 1
            continue

        try:
            found = router.buscar(marca, code, descripcion)
        except Exception as exc:
            stats["error"] += 1
            report_batch.append(
                {
                    "codigo_fabricante": code,
                    "marca_prioridad": marca,
                    "estado": "error",
                    "fuente": "",
                    "confianza": "",
                    "url": "",
                    "detalle": str(exc),
                }
            )
            print(f"  ERR {code}: {exc}")
            continue

        if not found or found.confianza < args.min_confianza:
            stats["miss"] += 1
            report_batch.append(
                {
                    "codigo_fabricante": code,
                    "marca_prioridad": marca,
                    "estado": "sin_foto",
                    "fuente": found.fuente if found else "",
                    "confianza": found.confianza if found else "",
                    "url": found.url if found else "",
                    "detalle": found.detalle if found else "",
                }
            )
            continue

        if args.solo_reporte:
            stats["ok"] += 1
            report_batch.append(
                {
                    "codigo_fabricante": code,
                    "marca_prioridad": marca,
                    "estado": "encontrada",
                    "fuente": found.fuente,
                    "confianza": f"{found.confianza:.2f}",
                    "url": found.url,
                    "detalle": found.detalle,
                }
            )
            continue

        try:
            ext = Path(urllib.parse.urlparse(found.url).path).suffix or ".jpg"
            original = ORIGINALES_DIR / f"{code}{ext}"
            http.download(found.url, original)
            save_webp(original.read_bytes(), dest)
            stats["ok"] += 1
            report_batch.append(
                {
                    "codigo_fabricante": code,
                    "marca_prioridad": marca,
                    "estado": "descargada",
                    "fuente": found.fuente,
                    "confianza": f"{found.confianza:.2f}",
                    "url": found.url,
                    "detalle": found.detalle,
                }
            )
            print(f"  OK  {code} ({marca}) ← {found.fuente}")
        except Exception as exc:
            stats["error"] += 1
            report_batch.append(
                {
                    "codigo_fabricante": code,
                    "marca_prioridad": marca,
                    "estado": "error_descarga",
                    "fuente": found.fuente,
                    "confianza": f"{found.confianza:.2f}",
                    "url": found.url,
                    "detalle": str(exc),
                }
            )
            print(f"  ERR descarga {code}: {exc}")

        if index % 50 == 0:
            append_report(report_batch)
            report_batch = []
            print(f"  Progreso {index}/{len(productos)}...")

    append_report(report_batch)

    print(
        f"\nListo: {stats['ok']} descargadas, {stats['skip']} omitidas, "
        f"{stats['miss']} sin foto, {stats['error']} errores."
    )
    print(f"WebP en: {IMAGES_DIR}")
    print(f"Reporte: {REPORT_CSV}")
    print("\nPara cargar en Odoo:")
    print("  python odoo-bin shell -c ../config/servigas.conf -d servigas_dev \\")
    print("    < ../../servigas/datos/import/import_imagenes_odoo.py")
    return 0 if stats["error"] == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
