from odoo import fields, models


class SgPriceListImportLog(models.Model):
    _name = "sg.price.list.import.log"
    _description = "Auditoría de importación de lista de precios"
    _order = "create_date desc, id desc"

    name = fields.Char(required=True)
    filename = fields.Char()
    user_id = fields.Many2one("res.users", default=lambda self: self.env.user, required=True)
    created_count = fields.Integer(default=0)
    updated_count = fields.Integer(default=0)
    skipped_count = fields.Integer(default=0)
    note = fields.Text()
