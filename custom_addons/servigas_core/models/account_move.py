from odoo import fields, models


class AccountMove(models.Model):
    _inherit = "account.move"

    sg_fw_loaded = fields.Boolean(
        string="Cargada en Factura Web",
        default=False,
        index=True,
        help="Marcada cuando la FC ya se cargó manualmente en Factura Web.",
    )
    sg_fw_loaded_at = fields.Datetime(
        string="Fecha carga Factura Web",
        help="Momento en que se marcó como cargada en Factura Web.",
    )
    sg_fw_number = fields.Char(
        string="N° Factura Web",
        help="Número de comprobante en Factura Web (opcional).",
    )
    sg_bill_source = fields.Selection(
        [
            ("whatsapp", "WhatsApp"),
            ("mail", "Mail"),
            ("other", "Otro"),
        ],
        string="Origen del comprobante",
        help="Canal por el que llegó la factura de proveedor (WhatsApp, mail u otro).",
    )
