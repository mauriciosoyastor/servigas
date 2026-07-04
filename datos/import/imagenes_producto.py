"""Utilidades compartidas para imágenes de producto (WebP/JPEG/PNG → Odoo)."""

from __future__ import annotations

import base64
from pathlib import Path

IMPORT_DIR = Path(__file__).parent
IMAGES_DIR = IMPORT_DIR / "imagenes"
ORIGINALES_DIR = IMPORT_DIR / "imagenes_originales"

# Orden de búsqueda: WebP primero (formato destino), luego fallbacks comunes.
IMAGE_EXTENSIONS = (".webp", ".jpg", ".jpeg", ".png")

MAX_IMAGE_PX = 1024
WEBP_QUALITY = 85


def find_image_path(code: str, directory: Path | None = None) -> Path | None:
    """Busca archivo de imagen por codigo_fabricante (nombre sin extensión)."""
    folder = directory or IMAGES_DIR
    if not folder.is_dir():
        return None
    for ext in IMAGE_EXTENSIONS:
        path = folder / f"{code}{ext}"
        if path.is_file():
            return path
    return None


def load_image_b64(code: str, directory: Path | None = None) -> str | None:
    """Lee imagen del disco y devuelve base64 para el campo image_1920 de Odoo."""
    path = find_image_path(code, directory)
    if not path:
        return None
    return base64.b64encode(path.read_bytes()).decode("ascii")


def list_image_codes(directory: Path | None = None) -> list[str]:
    """Lista códigos de fabricante inferidos desde nombres de archivo en la carpeta."""
    folder = directory or IMAGES_DIR
    if not folder.is_dir():
        return []
    codes: set[str] = set()
    for ext in IMAGE_EXTENSIONS:
        for path in folder.glob(f"*{ext}"):
            if path.is_file():
                codes.add(path.stem)
    return sorted(codes)
