from odoo import models


class IrActionsReport(models.Model):
    _inherit = "ir.actions.report"

    def _build_wkhtmltopdf_args(self, *args, **kwargs):
        """Force UTF-8 so Spanish accents survive wkhtmltopdf on Windows."""
        command_args = super()._build_wkhtmltopdf_args(*args, **kwargs)
        if "--encoding" not in command_args:
            command_args.extend(["--encoding", "utf-8"])
        return command_args
