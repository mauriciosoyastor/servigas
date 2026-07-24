from odoo import _, api, fields, models
from odoo.exceptions import ValidationError


class ResPartner(models.Model):
    _inherit = "res.partner"

    sg_invoice_dest = fields.Selection(
        [
            ("cf", "Consumidor final"),
            ("cuit", "Con CUIT"),
        ],
        string="Destino fiscal",
        default="cf",
        required=True,
        help="Destino de facturación: consumidor final o cliente con CUIT.",
    )

    @api.constrains("sg_invoice_dest", "vat")
    def _check_sg_invoice_dest_vat(self):
        for partner in self:
            if partner.sg_invoice_dest == "cuit" and not (partner.vat or "").strip():
                raise ValidationError(
                    _("Este cliente es Con CUIT: cargá el CUIT para guardar.")
                )
