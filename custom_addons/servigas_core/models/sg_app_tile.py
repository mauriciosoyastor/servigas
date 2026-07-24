import logging
from datetime import timedelta

from odoo import api, fields, models, _
from odoo.tools.safe_eval import safe_eval

_logger = logging.getLogger(__name__)


class SgAppTile(models.Model):
    _name = "sg.app.tile"
    _description = "Tile de acceso a aplicación en launcher Servigas"
    _order = "sequence, id"

    label = fields.Char(required=True, translate=True)
    hint = fields.Char(translate=True)
    icon = fields.Char(default="fa-th-large")
    sequence = fields.Integer(default=10)
    active = fields.Boolean(default=True)
    target_type = fields.Selection(
        [
            ("hub", "Hub Servigas"),
            ("action", "Acción"),
        ],
        required=True,
        default="hub",
    )
    client_tag = fields.Char(
        help="Tag del client action hub (ej. servigas_sales_hub).",
    )
    action_id = fields.Many2one(
        "ir.actions.actions",
        string="Acción",
        ondelete="restrict",
    )
    groups_id = fields.Many2many("res.groups", string="Grupos")
    module_required = fields.Char(
        help="Nombre técnico del módulo requerido para mostrar el tile.",
    )
    enter_label = fields.Char(
        string="Texto de ingreso",
        default="Abrir →",
        translate=True,
    )
    accent_key = fields.Selection(
        [
            ("flame-yellow", "Amarillo llama"),
            ("flame-orange", "Naranja llama"),
            ("flame-deep", "Naranja profundo"),
            ("flame-rust", "Óxido"),
            ("ember-amber", "Ámbar"),
            ("ember-coral", "Coral"),
            ("ember-scarlet", "Escarlata"),
            ("ember-wine", "Vino"),
            ("bg-mid", "Gris medio"),
            ("bg-charcoal", "Carbón"),
            ("bg-deep", "Carbón profundo"),
        ],
        default="flame-orange",
        required=True,
    )
    metric_model = fields.Char(string="Modelo métrica")
    metric_domain = fields.Char(string="Dominio métrica", default="[]")
    metric_field = fields.Char(string="Campo métrica")
    metric_aggregate = fields.Selection(
        [("count", "Conteo"), ("sum", "Suma")],
        default="count",
    )
    metric_suffix = fields.Char(string="Sufijo valor")
    metric_date_field = fields.Char(string="Campo fecha métrica")
    metric_date_scope = fields.Selection(
        [
            ("none", "Sin filtro fecha"),
            ("today", "Hoy"),
        ],
        default="none",
    )

    def _eval_domain(self, domain_str):
        if not domain_str:
            return []
        try:
            return safe_eval(domain_str)
        except Exception:
            _logger.warning("Dominio inválido en sg.app.tile %s: %s", self.id, domain_str)
            return []

    def _metric_domain_resolved(self):
        self.ensure_one()
        domain = list(self._eval_domain(self.metric_domain))
        if self.metric_date_scope == "today" and self.metric_date_field:
            today = fields.Date.context_today(self)
            tomorrow = today + timedelta(days=1)
            domain.extend(
                [
                    (self.metric_date_field, ">=", today),
                    (self.metric_date_field, "<", tomorrow),
                ]
            )
        return domain

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
        domain = self._metric_domain_resolved()
        try:
            if self.metric_aggregate == "sum" and self.metric_field:
                data = Model.read_group(domain, [self.metric_field], [])
                if not data:
                    return 0
                return data[0].get(self.metric_field) or 0
            return Model.search_count(domain)
        except Exception:
            _logger.exception("Error calculando métrica para sg.app.tile %s", self.id)
            return None

    def _get_metric_display(self):
        self.ensure_one()
        metrics_cache = self.env.context.get("_sg_launcher_metrics_cache")
        if metrics_cache is not None and self.id in metrics_cache:
            return metrics_cache[self.id]
        display = self._format_metric_value(self._compute_metric_raw())
        if metrics_cache is not None:
            metrics_cache[self.id] = display
        return display

    def _resolve_action_record(self):
        """Resuelve ir.actions.actions al subtipo concreto (act_window, client, …)."""
        self.ensure_one()
        if not self.action_id:
            return self.env["ir.actions.actions"]
        action = self.action_id.sudo()
        if action._name == "ir.actions.actions" and action.type:
            return self.env[action.type].browse(action.id)
        return action

    def _get_action_payload(self):
        self.ensure_one()
        if self.target_type == "hub":
            return {
                "type": "ir.actions.client",
                "tag": self.client_tag,
                "path": self.client_tag,
                "name": self.label,
                "target": "current",
            }
        action = self._resolve_action_record()
        if not action:
            return False
        if action._name == "ir.actions.client":
            payload = {
                "type": "ir.actions.client",
                "tag": action.tag,
                "name": action.name,
                "target": action.target or "current",
                "params": action.params or {},
            }
            if action.path:
                payload["path"] = action.path
            return payload
        if action._name == "ir.actions.act_window":
            ctx = action.context or {}
            if isinstance(ctx, str):
                try:
                    ctx = safe_eval(ctx, dict(self.env.context))
                except Exception:
                    ctx = {}
            else:
                ctx = dict(ctx)
            domain = action.domain
            if isinstance(domain, str):
                domain = self._eval_domain(domain)
            else:
                domain = list(domain or [])
            return {
                "type": "ir.actions.act_window",
                "name": action.name,
                "res_model": action.res_model,
                "view_mode": action.view_mode,
                "domain": domain,
                "context": dict(ctx),
                "target": action.target or "current",
                "views": action.views,
            }
        return False

    def _serialize_tile(self):
        self.ensure_one()
        return {
            "id": self.id,
            "label": self.label,
            "hint": self.hint or "",
            "icon": self.icon or "fa-th-large",
            "enter_label": self.enter_label or _("Abrir →"),
            "target_type": self.target_type,
            "client_tag": self.client_tag or "",
            "accent_key": self.accent_key or "flame-orange",
            "value": self._get_metric_display(),
            "action": self._get_action_payload(),
        }

    def _is_visible_for_user(self):
        self.ensure_one()
        if self.groups_id and not (self.groups_id & self.env.user.group_ids):
            return False
        if self.module_required:
            module = self.env["ir.module.module"].search(
                [
                    ("name", "=", self.module_required),
                    ("state", "=", "installed"),
                ],
                limit=1,
            )
            if not module:
                return False
        if self.target_type == "hub" and not self.client_tag:
            return False
        if self.target_type == "action" and not self.action_id:
            return False
        return True

    @api.model
    def get_launcher_payload(self):
        tiles = self.search([("active", "=", True)], order="sequence, id")
        visible = tiles.filtered(lambda tile: tile._is_visible_for_user())
        metrics_cache = {}
        payload = []
        for tile in visible:
            tile_ctx = tile.with_context(_sg_launcher_metrics_cache=metrics_cache)
            payload.append(tile_ctx._serialize_tile())
        return {"tiles": payload}

    @api.model
    def setup_pos_launcher_entry(self):
        """Apunta el tile POS al kanban de configs (ADR 0004; upgrade seguro)."""
        tile = self.env.ref("servigas_core.launcher_tile_pos", raise_if_not_found=False)
        action = self.env.ref(
            "point_of_sale.action_pos_config_kanban", raise_if_not_found=False
        )
        if tile and action:
            tile.write({"target_type": "action", "action_id": action.id})

    @api.model
    def setup_launcher_tile_accents(self):
        """Asigna accent_key preestablecido por xmlid (upgrade seguro)."""
        mapping = {
            "servigas_core.launcher_tile_sales": "flame-yellow",
            "servigas_core.launcher_tile_inventory": "flame-orange",
            "servigas_core.launcher_tile_purchase": "flame-deep",
            "servigas_core.launcher_tile_accounting": "flame-rust",
            "servigas_core.launcher_tile_pos": "ember-coral",
            "servigas_core.launcher_tile_apps": "ember-scarlet",
            "servigas_core.launcher_tile_settings": "ember-wine",
            "servigas_integrations.launcher_tile_integrations": "ember-amber",
        }
        for xmlid, accent in mapping.items():
            tile = self.env.ref(xmlid, raise_if_not_found=False)
            if tile:
                tile.write({"accent_key": accent})
        tableros = self.search([("label", "=", "Tableros")], limit=1)
        if tableros:
            tableros.write({"accent_key": "bg-charcoal"})
        self.setup_pos_launcher_entry()

    @api.model
    def setup_launcher_home_for_users(self):
        """Día D (ADR 0016): home OWL solo para Settings; operativos usan Astro.

        No toca `groups_id` de tiles: Astro BFF sigue leyendo
        `get_launcher_payload` para el shell oficial.
        """
        action = self.env.ref(
            "servigas_core.action_servigas_app_launcher", raise_if_not_found=False
        )
        if not action:
            return
        Users = self.env["res.users"]
        internal = Users.search([("share", "=", False)])
        admins = internal.filtered(lambda u: u.has_group("base.group_system"))
        operatives = internal - admins
        if admins:
            admins.write({"action_id": action.id})
        stuck = operatives.filtered(lambda u: u.action_id == action)
        if stuck:
            stuck.write({"action_id": False})
