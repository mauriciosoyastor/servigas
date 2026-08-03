from odoo import api, fields, models
from odoo.tools import file_open

from . import sg_work_order_report_assets as report_assets


class SgWorkOrder(models.Model):
    _name = "sg.work.order"
    _description = "Orden de trabajo de taller Servigas"
    _order = "date desc, id desc"
    _inherit = ["mail.thread"]

    name = fields.Char(required=True, copy=False, default="Nueva")
    date = fields.Date(required=True, default=fields.Date.context_today, index=True)
    appliance_id = fields.Many2one(
        "sg.appliance", required=True, ondelete="restrict", index=True
    )
    owner_name = fields.Char(string="Propietario")
    owner_phone = fields.Char(string="Celular")
    partner_id = fields.Many2one("res.partner", string="Cliente")
    problem = fields.Text(string="Problema")
    observation = fields.Text(string="Observación")
    work_done = fields.Text(string="Trabajos realizados")
    materials = fields.Text(string="Materiales")
    amount = fields.Float(string="Importe")
    state = fields.Selection(
        [("draft", "Borrador"), ("done", "Cerrada")],
        default="draft",
        required=True,
        index=True,
    )

    serial_number = fields.Char(
        related="appliance_id.serial_number", store=True, readonly=True
    )
    brand = fields.Char(related="appliance_id.brand", readonly=True)
    model = fields.Char(related="appliance_id.model", readonly=True)

    def get_report_brand_mark_src(self):
        """Data-URI del símbolo Servigas para el PDF (no depende de HTTP static)."""
        self.ensure_one()
        with file_open(report_assets.MARK_PRINT_RELATIVE, "rb") as handle:
            return report_assets.png_data_uri(handle.read())

    @api.model_create_multi
    def create(self, vals_list):
        records = super().create(vals_list)
        for rec in records:
            if not rec.name or rec.name == "Nueva":
                rec.name = f"OT/{rec.date}/{rec.id:04d}"
        return records

    def action_done(self):
        self.write({"state": "done"})
        return True

    def action_draft(self):
        self.write({"state": "draft"})
        return True

    @api.model
    def create_from_shell(self, vals):
        """Upsert appliance then create work order. Used by Astro BFF."""
        Appliance = self.env["sg.appliance"]
        appliance = Appliance.upsert_from_shell(
            {
                "serial_number": vals.get("serial_number"),
                "brand": vals.get("brand"),
                "model": vals.get("model"),
                "name": vals.get("appliance_name") or vals.get("name"),
                "gas_type": vals.get("gas_type"),
                "partner_id": vals.get("partner_id"),
            }
        )
        wo_vals = {
            "date": vals.get("date") or fields.Date.context_today(self),
            "appliance_id": appliance.id,
            "owner_name": vals.get("owner_name") or False,
            "owner_phone": vals.get("owner_phone") or False,
            "partner_id": vals.get("partner_id") or False,
            "problem": vals.get("problem") or False,
            "observation": vals.get("observation") or False,
            "work_done": vals.get("work_done") or False,
            "materials": vals.get("materials") or False,
            "amount": vals.get("amount") or 0.0,
            "state": vals.get("state") or "draft",
        }
        return self.create([wo_vals]).id
