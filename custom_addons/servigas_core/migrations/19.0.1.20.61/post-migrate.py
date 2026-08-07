def migrate(cr, version):
    """Asegura los 5 medios del Mostrador y los enlaza a pos.config."""
    from odoo import SUPERUSER_ID, api

    from odoo.addons.servigas_core.hooks import _ensure_pos_payment_methods

    env = api.Environment(cr, SUPERUSER_ID, {})
    _ensure_pos_payment_methods(env)
