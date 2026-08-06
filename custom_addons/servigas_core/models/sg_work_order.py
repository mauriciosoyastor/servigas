from odoo import api, fields, models, _
from odoo.exceptions import UserError
from odoo.tools import float_compare, float_round


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
    amount = fields.Float(string="Importe", digits=(16, 2))
    amount_collected = fields.Float(
        string="Cobrado en caja",
        digits=(16, 2),
        default=0.0,
        help="Suma de cobros registrados en caja vinculados a esta OT.",
    )
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
        return self.env["report.servigas.brand"].get_mark_src()

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

    def _cash_remaining(self):
        """Saldo pendiente; None si amount<=0 (cobro libre una sola vez)."""
        self.ensure_one()
        total = float(self.amount or 0.0)
        collected = max(0.0, float(self.amount_collected or 0.0))
        if total <= 0:
            return None
        return float_round(max(0.0, total - collected), precision_digits=2)

    def _recompute_amount_collected(self):
        Move = self.env["sg.cash.movement"]
        for wo in self:
            moves = Move.search(
                [("work_order_id", "=", wo.id), ("kind", "=", "in")]
            )
            total = sum(moves.mapped("amount"))
            wo.amount_collected = float_round(total, precision_digits=2)

    def action_collect_cash(self, amount, medium="cash", note=False):
        """
        Registra cobro en la caja abierta y actualiza amount_collected
        en la misma transacción (usado por el BFF Astro).
        """
        self.ensure_one()
        pay = float(amount or 0.0)
        if pay <= 0:
            raise UserError(_("El monto debe ser mayor a cero."))
        medium_key = (
            medium if medium in ("cash", "transfer", "card", "other") else "cash"
        )

        remaining = self._cash_remaining()
        if remaining is None:
            if float_compare(self.amount_collected or 0.0, 0.0, precision_digits=2) > 0:
                raise UserError(
                    _("Esta OT ya tiene el cobro registrado en caja.")
                )
        elif float_compare(pay, remaining + 0.001, precision_digits=2) > 0:
            if float_compare(remaining, 0.0, precision_digits=2) <= 0:
                raise UserError(
                    _("Esta OT ya tiene el cobro registrado en caja.")
                )
            raise UserError(
                _("El cobro supera el saldo pendiente (%s).")
                % ("%.2f" % remaining)
            )

        Session = self.env["sg.cash.session"]
        session = Session.search([("state", "=", "open")], limit=1)
        if not session:
            raise UserError(
                _("No hay una caja abierta. Abrí la caja antes de cobrar.")
            )

        note_txt = (note or "").strip() if note else ""
        reason = _("Cobro orden de trabajo")
        if self.name:
            reason = f"{reason} · {self.name}"
        if note_txt:
            reason = f"{reason} · {note_txt}"
        reason = reason[:120]

        move = self.env["sg.cash.movement"].create(
            {
                "session_id": session.id,
                "kind": "in",
                "amount": pay,
                "reason": reason,
                "medium": medium_key,
                "work_order_id": self.id,
            }
        )
        self._recompute_amount_collected()
        return move.id

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
