"""Helpers puros para assets del reporte PDF de OT (sin dependencia de Odoo)."""

from __future__ import annotations

import base64

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
