"""Unittest puro: data-URI del mark de OT para PDF."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

MODELS_DIR = Path(__file__).resolve().parents[1] / "models"
STATIC_IMG = Path(__file__).resolve().parents[1] / "static" / "src" / "img"
if str(MODELS_DIR) not in sys.path:
    sys.path.insert(0, str(MODELS_DIR))

import sg_work_order_report_assets as assets  # noqa: E402


class PngDataUriTests(unittest.TestCase):
    def test_builds_data_uri_from_mark_print(self):
        raw = (STATIC_IMG / "servigas_mark_print.png").read_bytes()
        uri = assets.png_data_uri(raw)
        self.assertTrue(uri.startswith("data:image/png;base64,"))
        self.assertGreater(len(uri), 100)
        # Round-trip: payload decodes to same PNG magic
        b64 = uri.split(",", 1)[1]
        import base64

        decoded = base64.b64decode(b64)
        self.assertTrue(decoded.startswith(assets.PNG_MAGIC))
        self.assertEqual(decoded, raw)

    def test_rejects_empty(self):
        with self.assertRaises(ValueError):
            assets.png_data_uri(b"")

    def test_rejects_non_png(self):
        with self.assertRaises(ValueError):
            assets.png_data_uri(b"%PDF-1.4")


if __name__ == "__main__":
    unittest.main()
