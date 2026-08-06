from odoo import api, models
from odoo.tools import file_open

from . import sg_work_order_report_assets as report_assets


class ReportServigasBrand(models.AbstractModel):
    _name = "report.servigas.brand"
    _description = "Servigas PDF brand helpers"

    @api.model
    def get_mark_src(self):
        """Data-URI del símbolo Servigas para QWeb PDF (sin HTTP static)."""
        try:
            with file_open(report_assets.MARK_PRINT_RELATIVE, "rb") as handle:
                raw = handle.read()
        except (FileNotFoundError, OSError, ValueError):
            return ""
        return report_assets.mark_data_uri_or_empty(raw)
