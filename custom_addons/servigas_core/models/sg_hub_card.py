import logging
from odoo import api, fields, models, _
from odoo.tools.safe_eval import safe_eval

_logger = logging.getLogger(__name__)


class SgHubCard(models.Model):
    _name = "sg.hub.card"
    _description = "KPI card de ingreso en hub Servigas"
    _order = "section, sequence, id"

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
    section = fields.Char(required=True, index=True)
    sequence = fields.Integer(default=10)
    active = fields.Boolean(default=True)
    show_in_summary = fields.Boolean(
        string="Mostrar en Resumen",
        default=False,
        help="Si está activo, la card aparece en la sección Resumen del hub.",
    )
    label = fields.Char(required=True, translate=True)
    hint = fields.Char(translate=True)
    icon = fields.Char(default="fa-cube")
    variant = fields.Selection(
        [("default", "Default"), ("warning", "Warning")],
        default="default",
    )
    enter_label = fields.Char(
        string="Texto de ingreso",
        default="Ingresar →",
        translate=True,
    )
    action_id = fields.Many2one("ir.actions.act_window", required=True, ondelete="restrict")
    domain = fields.Char(default="[]")
    context = fields.Char(default="{}")
    metric_model = fields.Char(string="Modelo métrica")
    metric_domain = fields.Char(string="Dominio métrica", default="[]")
    metric_field = fields.Char(
        string="Campo métrica",
        help="Vacío para conteo. Para suma, nombre del campo numérico.",
    )
    metric_aggregate = fields.Selection(
        [("count", "Conteo"), ("sum", "Suma")],
        default="count",
    )
    metric_suffix = fields.Char(
        string="Sufijo valor",
        help="Ej: $, u., %",
    )

    def _eval_domain(self, domain_str):
        if not domain_str:
            return []
        try:
            return safe_eval(domain_str)
        except Exception:
            _logger.warning("Dominio inválido en sg.hub.card %s: %s", self.id, domain_str)
            return []

    def _eval_context(self, context_str):
        if not context_str:
            return {}
        try:
            return safe_eval(context_str)
        except Exception:
            _logger.warning("Contexto inválido en sg.hub.card %s: %s", self.id, context_str)
            return {}

    def _format_metric_value(self, raw_value):
        self.ensure_one()
        if raw_value is None:
            return "—"
        if isinstance(raw_value, float):
            if raw_value == int(raw_value):
                formatted = f"{int(raw_value):,}".replace(",", ".")
            else:
                formatted = f"{raw_value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
        else:
            formatted = f"{raw_value:,}".replace(",", ".")
        if self.metric_suffix:
            return f"{formatted}{self.metric_suffix}"
        return formatted

    def _compute_metric_raw(self):
        self.ensure_one()
        if not self.metric_model or self.metric_model not in self.env:
            return None
        Model = self.env[self.metric_model]
        domain = self._eval_domain(self.metric_domain)
        try:
            if self.metric_aggregate == "sum" and self.metric_field:
                data = Model.read_group(domain, [self.metric_field], [])
                if not data:
                    return 0
                return data[0].get(self.metric_field) or 0
            return Model.search_count(domain)
        except Exception:
            _logger.exception("Error calculando métrica para sg.hub.card %s", self.id)
            return None

    def _get_action_payload(self):
        self.ensure_one()
        action = self.action_id.sudo()
        base_context = {}
        if action.context:
            ctx = action.context
            base_context = self._eval_context(ctx) if isinstance(ctx, str) else dict(ctx)
        merged_context = {**base_context, **self._eval_context(self.context)}
        payload = {
            "type": "ir.actions.act_window",
            "name": self.label,
            "res_model": action.res_model,
            "view_mode": action.view_mode,
            "domain": self._eval_domain(self.domain),
            "context": merged_context,
            "target": "current",
        }
        if action.views:
            payload["views"] = action.views
        return payload

    def _get_metric_display(self):
        self.ensure_one()
        metrics_cache = self.env.context.get("_sg_hub_metrics_cache")
        if metrics_cache is not None and self.id in metrics_cache:
            return metrics_cache[self.id]
        display = self._format_metric_value(self._compute_metric_raw())
        if metrics_cache is not None:
            metrics_cache[self.id] = display
        return display

    def _serialize_card(self):
        self.ensure_one()
        return {
            "id": self.id,
            "label": self.label,
            "hint": self.hint or "",
            "icon": self.icon or "fa-circle",
            "variant": self.variant,
            "enter_label": self.enter_label or _("Ingresar →"),
            "value": self._get_metric_display(),
            "action": self._get_action_payload(),
        }

    @api.model
    def get_hub_payload(self, app, section="summary"):
        Section = self.env["sg.hub.section"]
        sections = Section.search([("app", "=", app), ("active", "=", True)])
        cards = self.search([("app", "=", app), ("active", "=", True)], order="sequence, id")

        if section == "summary":
            visible_cards = cards.filtered("show_in_summary")
        else:
            visible_cards = cards.filtered(lambda c: c.section == section)

        metrics_cache = {}
        cards_payload = []
        for card in visible_cards:
            card_ctx = card.with_context(_sg_hub_metrics_cache=metrics_cache)
            cards_payload.append(card_ctx._serialize_card())

        return {
            "app": app,
            "section": section,
            "sections": [
                {
                    "code": s.code,
                    "name": s.name,
                    "icon": s.icon or "fa-circle",
                }
                for s in sections
            ],
            "cards": cards_payload,
        }
