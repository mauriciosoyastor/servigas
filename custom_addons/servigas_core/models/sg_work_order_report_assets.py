"""Helpers puros para assets del reporte PDF de OT (sin dependencia de Odoo)."""

from __future__ import annotations

import base64
from typing import Optional

PNG_MAGIC = b"\x89PNG\r\n\x1a\n"
MARK_PRINT_RELATIVE = "servigas_core/static/src/img/servigas_mark_print.png"


def png_data_uri(raw: bytes) -> str:
    """Devuelve data-URI PNG para embeber en QWeb/wkhtmltopdf sin fetch HTTP."""
    if not raw:
        raise ValueError("PNG vacío")
    if not raw.startswith(PNG_MAGIC):
        raise ValueError("No es un PNG válido")
    payload = base64.b64encode(raw).decode("ascii")
    return f"data:image/png;base64,{payload}"


def mark_data_uri_or_empty(raw: Optional[bytes]) -> str:
    """
    Data-URI del mark, o cadena vacía si falta / no es PNG.
    Así el PDF de OT sigue generando aunque no esté el archivo.
    """
    try:
        return png_data_uri(raw or b"")
    except ValueError:
        return ""
