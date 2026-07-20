def migrate(cr, version):
    from odoo import SUPERUSER_ID, api

    env = api.Environment(cr, SUPERUSER_ID, {})
    # Late import: module code is on path after upgrade graph resolves.
    from odoo.addons.servigas_core.hooks import _ensure_pos_order_discount  # noqa: E402

    _ensure_pos_order_discount(env)
