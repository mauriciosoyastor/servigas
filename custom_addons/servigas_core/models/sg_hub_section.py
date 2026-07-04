from odoo import fields, models


class SgHubSection(models.Model):
    _name = "sg.hub.section"
    _description = "Sección del rail de un hub Servigas"
    _order = "app, sequence, id"

    app = fields.Selection(
        [
            ("inventory", "Inventario"),
            ("sales", "Ventas"),
            ("purchase", "Compras"),
            ("accounting", "Facturación"),
        ],
        required=True,
        index=True,
    )
    code = fields.Char(required=True, index=True)
    name = fields.Char(required=True, translate=True)
    icon = fields.Char(default="fa-circle")
    sequence = fields.Integer(default=10)
    active = fields.Boolean(default=True)

    _sql_constraints = [
        (
            "sg_hub_section_app_code_uniq",
            "unique(app, code)",
            "El código de sección debe ser único por aplicación.",
        ),
    ]
