from odoo import api, fields, models, _
from odoo.exceptions import ValidationError, UserError


class SgCashSession(models.Model):
    _name = "sg.cash.session"
    _description = "Sesión de caja física Servigas"
    _order = "opened_at desc, id desc"

    name = fields.Char(required=True, default="Caja")
    state = fields.Selection(
        [
            ("open", "Abierta"),
            ("closed", "Cerrada"),
        ],
        required=True,
        default="open",
        index=True,
    )
    shift = fields.Selection(
        [
            ("manana", "Mañana"),
            ("tarde", "Tarde"),
            ("noche", "Noche"),
        ],
        string="Turno",
        index=True,
    )
    opened_at = fields.Datetime(
        required=True,
        default=fields.Datetime.now,
        index=True,
    )
    opened_by = fields.Many2one(
        "res.users",
        required=True,
        default=lambda self: self.env.user,
    )
    opening_balance = fields.Float(required=True, default=0.0, digits=(16, 2))
    note = fields.Char()
    closed_at = fields.Datetime(index=True)
    closed_by = fields.Many2one("res.users")
    closing_counted = fields.Float(digits=(16, 2))
    closing_expected = fields.Float(digits=(16, 2))
    difference = fields.Float(digits=(16, 2))
    difference_note = fields.Char()
    bank_deposit = fields.Float(digits=(16, 2))
    leave_float = fields.Float(digits=(16, 2))
    movement_ids = fields.One2many(
        "sg.cash.movement",
        "session_id",
        string="Movimientos manuales",
    )

    @api.constrains("state")
    def _check_single_open_session(self):
        for session in self:
            if session.state != "open":
                continue
            others = self.search_count(
                [("state", "=", "open"), ("id", "!=", session.id)]
            )
            if others:
                raise ValidationError(
                    _("Ya hay una caja abierta. Cerrala antes de abrir otra.")
                )

    @api.model
    def action_open_session(self, opening_balance=0.0, note=False, shift=False):
        open_count = self.search_count([("state", "=", "open")])
        if open_count:
            raise UserError(_("Ya hay una caja abierta. Cerrala antes de abrir otra."))
        balance = float(opening_balance or 0.0)
        if balance < 0:
            raise UserError(_("El monto inicial no puede ser negativo."))
        shift_value = shift if shift in ("manana", "tarde", "noche") else False
        return self.create(
            {
                "name": _("Caja %s") % fields.Datetime.now(),
                "state": "open",
                "opening_balance": balance,
                "note": note or False,
                "shift": shift_value,
                "opened_at": fields.Datetime.now(),
                "opened_by": self.env.user.id,
            }
        )

    def action_close_session(
        self,
        counted_amount,
        expected_amount=None,
        difference_note=False,
        bank_deposit=0.0,
        leave_float=0.0,
    ):
        self.ensure_one()
        if self.state != "open":
            raise UserError(_("Esta caja ya está cerrada."))
        counted = float(counted_amount)
        if counted < 0:
            raise UserError(_("El efectivo contado no puede ser negativo."))
        deposit = float(bank_deposit or 0.0)
        leave = float(leave_float or 0.0)
        if deposit < 0 or leave < 0:
            raise UserError(_("Depósito y fondo a dejar no pueden ser negativos."))
        if deposit + leave > counted + 0.001:
            raise UserError(
                _("Depósito + fondo a dejar no pueden superar el efectivo contado.")
            )
        expected = (
            float(expected_amount)
            if expected_amount is not None
            else float(self.opening_balance or 0.0)
        )
        diff = counted - expected
        note = (difference_note or "").strip() if difference_note else ""
        if abs(diff) > 0.01 and not note:
            raise UserError(
                _("Justificá la diferencia de caja (faltante o sobrante).")
            )
        self.write(
            {
                "state": "closed",
                "closed_at": fields.Datetime.now(),
                "closed_by": self.env.user.id,
                "closing_counted": counted,
                "closing_expected": expected,
                "difference": diff,
                "difference_note": note or False,
                "bank_deposit": deposit,
                "leave_float": leave,
            }
        )
        return True


class SgCashMovement(models.Model):
    _name = "sg.cash.movement"
    _description = "Movimiento manual de caja Servigas"
    _order = "create_date desc, id desc"

    session_id = fields.Many2one(
        "sg.cash.session",
        required=True,
        ondelete="cascade",
        index=True,
    )
    kind = fields.Selection(
        [
            ("in", "Ingreso"),
            ("out", "Egreso"),
        ],
        required=True,
        index=True,
    )
    amount = fields.Float(required=True, digits=(16, 2))
    reason = fields.Char(required=True)
    user_id = fields.Many2one(
        "res.users",
        required=True,
        default=lambda self: self.env.user,
    )

    @api.constrains("amount", "session_id", "kind", "reason")
    def _check_movement(self):
        for move in self:
            if move.amount <= 0:
                raise ValidationError(_("El monto debe ser mayor a cero."))
            if not (move.reason or "").strip():
                raise ValidationError(_("El motivo es obligatorio."))
            if move.session_id.state != "open":
                raise ValidationError(
                    _("Solo se pueden cargar movimientos en una caja abierta.")
                )
            reason = (move.reason or "").strip().lower()
            if move.kind == "out" and reason.startswith("retiro del dueño"):
                user = self.env.user
                if not (
                    user.has_group("account.group_account_manager")
                    or user.has_group("base.group_system")
                ):
                    raise ValidationError(
                        _(
                            "Solo un responsable de caja puede registrar "
                            "retiro del dueño."
                        )
                    )
