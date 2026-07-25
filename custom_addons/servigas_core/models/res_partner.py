from odoo import _, api, fields, models
from odoo.exceptions import ValidationError

_CUIT_WEIGHTS = (5, 4, 3, 2, 7, 6, 5, 4, 3, 2)


def _normalize_cuit(value):
    digits = "".join(ch for ch in str(value or "") if ch.isdigit())
    return digits if len(digits) == 11 else None


def _cuit_check_digit(base10):
    total = sum(int(base10[i]) * _CUIT_WEIGHTS[i] for i in range(10))
    rem = total % 11
    if rem == 0:
        return 0
    if rem == 1:
        return 9
    return 11 - rem


def _is_valid_cuit(value):
    digits = _normalize_cuit(value)
    if not digits:
        return False
    return int(digits[10]) == _cuit_check_digit(digits[:10])


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
            if partner.sg_invoice_dest != "cuit":
                continue
            vat = (partner.vat or "").strip()
            if not vat:
                raise ValidationError(
                    _("Este cliente es Con CUIT: cargá el CUIT para guardar.")
                )
            if not _is_valid_cuit(vat):
                raise ValidationError(
                    _("El CUIT no es válido (revisá los 11 dígitos).")
                )
