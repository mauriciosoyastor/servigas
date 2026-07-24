from odoo import models
from odoo.tools import config


class IrHttp(models.AbstractModel):
    _inherit = "ir.http"

    def session_info(self):
        result = super().session_info()
        dev_mode = config.get("dev_mode") or []
        if isinstance(dev_mode, str):
            features = [part.strip() for part in dev_mode.split(",") if part.strip()]
        else:
            features = list(dev_mode)
        result["sg_dev_assets"] = "assets" in features or "all" in features
        return result
