"""Unittest puro (sin Odoo) para parse/match de lista de precios."""

from __future__ import annotations

import sys
import unittest
from pathlib import Path

MODELS_DIR = Path(__file__).resolve().parents[1] / "models"
if str(MODELS_DIR) not in sys.path:
    sys.path.insert(0, str(MODELS_DIR))

import sg_price_list_import_logic as logic  # noqa: E402


class RejectFilenameTests(unittest.TestCase):
    def test_rejects_pdf_and_images(self):
        self.assertTrue(logic.is_rejected_filename("lista.pdf"))
        self.assertTrue(logic.is_rejected_filename("foto.PNG"))
        self.assertTrue(logic.is_rejected_filename("scan.jpeg"))
        self.assertFalse(logic.is_rejected_filename("lista.csv"))
        self.assertFalse(logic.is_rejected_filename("lista.xlsx"))


class SuggestMappingTests(unittest.TestCase):
    def test_suggests_servigas_headers(self):
        mapping = logic.suggest_mapping(
            ["barcode", "default_code", "name", "list_price", "standard_price"]
        )
        self.assertEqual(
            mapping,
            {
                "barcode": "barcode",
                "default_code": "default_code",
                "name": "name",
                "list_price": "list_price",
                "standard_price": "standard_price",
            },
        )

    def test_suggests_spanish_aliases(self):
        mapping = logic.suggest_mapping(
            ["Código de barras", "Código", "Descripción", "Precio", "Costo"]
        )
        self.assertEqual(mapping["barcode"], "Código de barras")
        self.assertEqual(mapping["default_code"], "Código")
        self.assertEqual(mapping["name"], "Descripción")
        self.assertEqual(mapping["list_price"], "Precio")
        self.assertEqual(mapping["standard_price"], "Costo")


class ParseCsvTests(unittest.TestCase):
    def test_parse_csv_bytes(self):
        raw = (
            "barcode,default_code,name,list_price,standard_price\n"
            "779,SKU1,Producto Uno,100.5,40\n"
        ).encode("utf-8")
        result = logic.parse_tabular_bytes("lista.csv", raw)
        self.assertIsNone(result.get("error"))
        self.assertEqual(result["headers"][0], "barcode")
        self.assertEqual(len(result["rows"]), 1)
        self.assertEqual(result["rows"][0]["name"], "Producto Uno")

    def test_reject_pdf_bytes(self):
        result = logic.parse_tabular_bytes("lista.pdf", b"%PDF-1.4")
        self.assertTrue(result.get("error"))


class NormalizeRowTests(unittest.TestCase):
    def test_normalize_prices_and_trim(self):
        mapping = {
            "barcode": "barcode",
            "default_code": "default_code",
            "name": "name",
            "list_price": "list_price",
            "standard_price": "standard_price",
        }
        row = logic.normalize_row(
            {
                "barcode": " 779 ",
                "default_code": " SKU ",
                "name": " Gas 10kg ",
                "list_price": "1.234,50",
                "standard_price": "100",
            },
            mapping,
        )
        self.assertEqual(row["barcode"], "779")
        self.assertEqual(row["default_code"], "SKU")
        self.assertEqual(row["name"], "Gas 10kg")
        self.assertEqual(row["list_price"], 1234.50)
        self.assertEqual(row["standard_price"], 100.0)
        self.assertEqual(row["price_errors"], [])

    def test_invalid_price_is_error(self):
        mapping = {"name": "name", "list_price": "list_price"}
        row = logic.normalize_row({"name": "X", "list_price": "abc"}, mapping)
        self.assertIn("list_price", row["price_errors"])


class MatchProductTests(unittest.TestCase):
    def setUp(self):
        self.indexes = {
            "by_barcode": {"779": [10]},
            "by_code": {"SKU1": [20]},
            "by_name": {"GAS 10KG": [30]},
        }

    def test_match_barcode_first(self):
        result = logic.match_product(
            {"barcode": "779", "default_code": "SKU1", "name": "Gas 10kg", "price_errors": []},
            self.indexes,
        )
        self.assertEqual(result["status"], "update")
        self.assertEqual(result["product_id"], 10)

    def test_match_code_when_no_barcode(self):
        result = logic.match_product(
            {"barcode": "", "default_code": "SKU1", "name": "Otro", "price_errors": []},
            self.indexes,
        )
        self.assertEqual(result["status"], "update")
        self.assertEqual(result["product_id"], 20)

    def test_match_exact_name(self):
        result = logic.match_product(
            {"barcode": "", "default_code": "", "name": "gas 10kg", "price_errors": []},
            self.indexes,
        )
        self.assertEqual(result["status"], "update")
        self.assertEqual(result["product_id"], 30)

    def test_create_when_no_match(self):
        result = logic.match_product(
            {"barcode": "", "default_code": "NEW", "name": "Nuevo", "price_errors": []},
            self.indexes,
        )
        self.assertEqual(result["status"], "create")

    def test_review_when_ambiguous_name(self):
        indexes = {"by_barcode": {}, "by_code": {}, "by_name": {"X": [1, 2]}}
        result = logic.match_product(
            {"barcode": "", "default_code": "", "name": "x", "price_errors": []},
            indexes,
        )
        self.assertEqual(result["status"], "review")
        self.assertEqual(result["candidates"], [1, 2])

    def test_error_without_name(self):
        result = logic.match_product(
            {"barcode": "1", "default_code": "A", "name": "", "price_errors": []},
            self.indexes,
        )
        self.assertEqual(result["status"], "error")

    def test_error_on_price_errors(self):
        result = logic.match_product(
            {
                "barcode": "",
                "default_code": "NEW",
                "name": "Nuevo",
                "price_errors": ["list_price"],
            },
            self.indexes,
        )
        self.assertEqual(result["status"], "error")


class ClassifyRowsTests(unittest.TestCase):
    def test_classify_mix(self):
        indexes = {
            "by_barcode": {"779": [10]},
            "by_code": {},
            "by_name": {},
        }
        mapping = {
            "barcode": "barcode",
            "default_code": "default_code",
            "name": "name",
            "list_price": "list_price",
            "standard_price": "standard_price",
        }
        raw_rows = [
            {
                "barcode": "779",
                "default_code": "",
                "name": "A",
                "list_price": "10",
                "standard_price": "5",
            },
            {
                "barcode": "",
                "default_code": "N1",
                "name": "Nuevo",
                "list_price": "20",
                "standard_price": "8",
            },
            {
                "barcode": "",
                "default_code": "",
                "name": "",
                "list_price": "1",
                "standard_price": "1",
            },
        ]
        classified = logic.classify_rows(raw_rows, mapping, indexes)
        self.assertEqual([c["status"] for c in classified], ["update", "create", "error"])


if __name__ == "__main__":
    unittest.main()
