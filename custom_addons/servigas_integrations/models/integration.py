from odoo import fields, models


class ServigasIntegration(models.Model):
    _name = "servigas.integration"
    _description = "Integración externa Servigas"
    _order = "sequence, name"

    name = fields.Char(required=True, translate=True)
    sequence = fields.Integer(default=10)
    integration_type = fields.Selection(
        selection=[
            ("factura_web", "Factura Web"),
            ("supplier_portal", "Portal de proveedor"),
            ("other", "Otro"),
        ],
        required=True,
    )
    mode = fields.Selection(
        selection=[
            ("manual", "Manual"),
            ("automated", "Automatizado"),
        ],
        default="manual",
        required=True,
    )
    status = fields.Selection(
        selection=[
            ("active", "Activa"),
            ("planned", "Planificada"),
            ("inactive", "Inactiva"),
        ],
        default="active",
        required=True,
    )
    description = fields.Text(translate=True)
    process_notes = fields.Text(
        string="Proceso operativo",
        translate=True,
        help="Pasos que el equipo debe seguir para sincronizar datos.",
    )
    resource_path = fields.Char(
        string="Recurso local",
        help="Ruta relativa en el repo o archivo de referencia para la integración.",
    )
    color = fields.Integer(string="Color")
