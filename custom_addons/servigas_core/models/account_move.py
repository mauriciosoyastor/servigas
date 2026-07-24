from odoo import fields, models


class AccountMove(models.Model):
    _inherit = "account.move"

    sg_bill_source = fields.Selection(
        [
            ("whatsapp", "WhatsApp"),
            ("mail", "Mail"),
            ("other", "Otro"),
        ],
        string="Origen del comprobante",
        help="Canal por el que llegó la factura de proveedor (WhatsApp, mail u otro).",
    )
