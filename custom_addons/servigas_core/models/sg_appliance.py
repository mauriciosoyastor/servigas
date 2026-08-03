from odoo import api, fields, models
from odoo.exceptions import ValidationError

from .sg_workshop_logic import normalize_serial


class SgAppliance(models.Model):
    _name = "sg.appliance"
    _description = "Artefacto de taller Servigas"
    _order = "serial_number, id"
    _rec_name = "display_name"

    serial_number = fields.Char(required=True, index=True)
    brand = fields.Char()
    model = fields.Char()
    name = fields.Char(string="Descripción")
    gas_type = fields.Selection(
        [("gn", "GN"), ("ge", "GE")],
        string="Tipo de gas",
    )
    partner_id = fields.Many2one("res.partner", string="Cliente")
    work_order_ids = fields.One2many(
        "sg.work.order", "appliance_id", string="Órdenes de trabajo"
    )
    work_order_count = fields.Integer(compute="_compute_work_order_count")
    display_name = fields.Char(compute="_compute_display_name", store=True)

    _sg_appliance_serial_uniq = models.Constraint(
        "unique(serial_number)",
        "Ya existe un artefacto con ese número de serie.",
    )

    @api.depends("work_order_ids")
    def _compute_work_order_count(self):
        for rec in self:
            rec.work_order_count = len(rec.work_order_ids)

    @api.depends("serial_number", "brand", "model", "name")
    def _compute_display_name(self):
        for rec in self:
            bits = [rec.serial_number or ""]
            label = " ".join(p for p in [rec.brand, rec.model, rec.name] if p)
            if label:
                bits.append(label)
            rec.display_name = " — ".join(bits) if bits[0] else label or "Artefacto"

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            serial = normalize_serial(vals.get("serial_number"))
            if not serial:
                raise ValidationError("El número de serie es obligatorio.")
            vals["serial_number"] = serial
        return super().create(vals_list)

    def write(self, vals):
        if "serial_number" in vals:
            serial = normalize_serial(vals.get("serial_number"))
            if not serial:
                raise ValidationError("El número de serie es obligatorio.")
            vals = {**vals, "serial_number": serial}
        return super().write(vals)

    @api.model
    def upsert_from_shell(self, vals):
        """Find or create appliance by normalized serial; update blank identity fields."""
        serial = normalize_serial(vals.get("serial_number"))
        if not serial:
            raise ValidationError("El número de serie es obligatorio.")
        appliance = self.search([("serial_number", "=", serial)], limit=1)
        payload = {
            "serial_number": serial,
            "brand": vals.get("brand") or False,
            "model": vals.get("model") or False,
            "name": vals.get("name") or False,
            "gas_type": vals.get("gas_type") or False,
            "partner_id": vals.get("partner_id") or False,
        }
        if appliance:
            write_vals = {}
            for key in ("brand", "model", "name", "gas_type"):
                if payload.get(key) and not appliance[key]:
                    write_vals[key] = payload[key]
            if payload.get("partner_id"):
                write_vals["partner_id"] = payload["partner_id"]
            if write_vals:
                appliance.write(write_vals)
            return appliance
        return self.create([payload])
