def migrate(cr, version):
    """Agrega Tarjeta de crédito al Mostrador y re-enlaza medios canónicos."""
    from odoo import SUPERUSER_ID, api

    from odoo.addons.servigas_core.hooks import _ensure_pos_payment_methods

    env = api.Environment(cr, SUPERUSER_ID, {})
    _ensure_pos_payment_methods(env)
