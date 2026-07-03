"""
Convierte imágenes de producto a WebP nombradas por codigo_fabricante.

Colocá JPG/PNG en datos/import/imagenes_originales/ con el nombre del código
(ej. 00.BIS0001.jpg) y ejecutá:

  pip install pillow
  python datos/import/convertir_imagenes_webp.py

Salida: datos/import/imagenes/{codigo_fabricante}.webp
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

IMPORT_DIR = Path(__file__).parent
sys.path.insert(0, str(IMPORT_DIR))

from imagenes_producto import (
    IMAGES_DIR,
    MAX_IMAGE_PX,
    ORIGINALES_DIR,
    WEBP_QUALITY,
)

SOURCE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convierte imágenes de producto a WebP para importar en Odoo."
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=ORIGINALES_DIR,
        help=f"Carpeta con imágenes originales (default: {ORIGINALES_DIR})",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=IMAGES_DIR,
        help=f"Carpeta destino WebP (default: {IMAGES_DIR})",
    )
    parser.add_argument(
        "--max-px",
        type=int,
        default=MAX_IMAGE_PX,
        help=f"Lado máximo en píxeles (default: {MAX_IMAGE_PX})",
    )
    parser.add_argument(
        "--quality",
        type=int,
        default=WEBP_QUALITY,
        help=f"Calidad WebP 0-100 (default: {WEBP_QUALITY})",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Sobrescribir WebP existentes",
    )
    return parser.parse_args()


def resize_if_needed(image, max_px: int):
    width, height = image.size
    longest = max(width, height)
    if longest <= max_px:
        return image
    scale = max_px / longest
    new_size = (round(width * scale), round(height * scale))
    return image.resize(new_size)


def convert_file(src: Path, dest: Path, max_px: int, quality: int) -> None:
    from PIL import Image

    with Image.open(src) as img:
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGBA")
        else:
            img = img.convert("RGB")
        img = resize_if_needed(img, max_px)
        dest.parent.mkdir(parents=True, exist_ok=True)
        img.save(dest, "WEBP", quality=quality, method=6)


def main() -> int:
    try:
        from PIL import Image  # noqa: F401
    except ImportError:
        print("ERROR: instalá Pillow con: pip install pillow", file=sys.stderr)
        return 1

    args = parse_args()
    input_dir: Path = args.input
    output_dir: Path = args.output

    if not input_dir.is_dir():
        print(f"ERROR: no existe la carpeta de entrada: {input_dir}", file=sys.stderr)
        print(f"  Creala y colocá imágenes nombradas por codigo_fabricante.", file=sys.stderr)
        return 1

    sources = sorted(
        p for p in input_dir.iterdir() if p.is_file() and p.suffix.lower() in SOURCE_EXTENSIONS
    )
    if not sources:
        print(f"AVISO: no hay imágenes en {input_dir}")
        return 0

    converted = 0
    skipped = 0
    errors = 0

    for src in sources:
        code = src.stem
        dest = output_dir / f"{code}.webp"
        if dest.exists() and not args.force:
            skipped += 1
            continue
        try:
            convert_file(src, dest, args.max_px, args.quality)
            converted += 1
            print(f"  OK  {src.name} → {dest.name}")
        except Exception as exc:
            errors += 1
            print(f"  ERR {src.name}: {exc}", file=sys.stderr)

    print(
        f"\nListo: {converted} convertidas, {skipped} omitidas (ya existían), {errors} errores."
    )
    print(f"WebP en: {output_dir}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
