"""Unittest puro: estructura QWeb del layout PDF Servigas (header/article/footer).

No requiere runtime de Odoo: parsea los archivos XML de `report/` directamente
y verifica que mirroreamos `web.external_layout_standard` (clases header/article/
footer + `data-oe-id` en el article) y que los 4 inherits + la OT efectivamente
llaman a `servigas_core.report_servigas_layout`.
"""

from __future__ import annotations

import unittest
import xml.etree.ElementTree as ET
from pathlib import Path

REPORT_DIR = Path(__file__).resolve().parents[1] / "report"
LAYOUT_XML = REPORT_DIR / "sg_servigas_layout.xml"
INHERITS_XML = REPORT_DIR / "sg_report_document_inherits.xml"
WORK_ORDER_XML = REPORT_DIR / "sg_work_order_report.xml"

SERVIGAS_LAYOUT_XMLID = "servigas_core.report_servigas_layout"

INHERIT_TEMPLATE_IDS = [
    "report_saleorder_document_servigas",
    "report_purchaseorder_document_servigas",
    "report_purchasequotation_document_servigas",
    "report_invoice_document_servigas",
]


def _classes(elem: ET.Element) -> set:
    return set((elem.get("class") or "").split())


class ServigasLayoutStructureTests(unittest.TestCase):
    """sg_servigas_layout.xml must mirror external_layout_standard's shape."""

    def setUp(self):
        self.root = ET.parse(LAYOUT_XML).getroot()
        self.template = self.root.find(".//template[@id='report_servigas_layout']")
        self.assertIsNotNone(self.template, "report_servigas_layout template not found")

    def _divs_with_class(self, klass):
        return [el for el in self.template.iter("div") if klass in _classes(el)]

    def test_has_header_div(self):
        self.assertTrue(self._divs_with_class("header"), "missing div.header")

    def test_has_article_div(self):
        self.assertTrue(self._divs_with_class("article"), "missing div.article")

    def test_has_footer_div(self):
        self.assertTrue(self._divs_with_class("footer"), "missing div.footer")

    def test_article_carries_data_oe_id(self):
        articles = self._divs_with_class("article")
        self.assertTrue(articles)
        self.assertIn("t-att-data-oe-id", articles[0].attrib)
        self.assertIn("t-att-data-oe-model", articles[0].attrib)

    def test_root_has_no_page_class(self):
        """Critical fix: the layout root must NOT carry class="page".

        Odoo's own document templates (sale/purchase/invoice) already wrap
        their content in a `<div class="page">`; duplicating it here would
        double-nest pages under wkhtmltopdf.
        """
        for el in list(self.template):
            self.assertNotIn("page", _classes(el))


class ServigasInheritsCallLayoutTests(unittest.TestCase):
    """sg_report_document_inherits.xml must swap t-call for all 4 documents."""

    def setUp(self):
        self.root = ET.parse(INHERITS_XML).getroot()
        self.templates = {t.get("id"): t for t in self.root.findall("template")}

    def test_all_four_inherits_present(self):
        for expected_id in INHERIT_TEMPLATE_IDS:
            self.assertIn(expected_id, self.templates)

    def test_all_four_inherits_call_servigas_layout(self):
        for expected_id in INHERIT_TEMPLATE_IDS:
            template = self.templates[expected_id]
            tcall_attr = template.find(".//xpath/attribute[@name='t-call']")
            self.assertIsNotNone(
                tcall_attr, f"{expected_id} missing t-call attribute xpath"
            )
            self.assertEqual(tcall_attr.text, SERVIGAS_LAYOUT_XMLID)

    def test_page_xpath_uses_hasclass(self):
        """Minor fix: contains(@class,'page') -> hasclass('page')."""
        found_page_xpath = False
        for xpath in self.root.findall(".//xpath"):
            expr = xpath.get("expr", "")
            if "page" in expr:
                found_page_xpath = True
                self.assertIn("hasclass('page')", expr)
                self.assertNotIn("contains(@class", expr)
        self.assertTrue(found_page_xpath, "no xpath targeting the page div found")


class WorkOrderReportCallsServigasLayoutTests(unittest.TestCase):
    """The OT (work order) report document must call the shared layout."""

    def test_ot_document_calls_servigas_layout(self):
        text = WORK_ORDER_XML.read_text(encoding="utf-8")
        self.assertIn(f't-call="{SERVIGAS_LAYOUT_XMLID}"', text)


if __name__ == "__main__":
    unittest.main()
