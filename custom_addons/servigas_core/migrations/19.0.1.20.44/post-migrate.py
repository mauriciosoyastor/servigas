def migrate(cr, version):
    """Agrega medios de pago del Mostrador (Débito, Mercado Pago) y renombra defaults."""
    from odoo import SUPERUSER_ID, api

    from odoo.addons.servigas_core.hooks import _ensure_pos_payment_methods

    env = api.Environment(cr, SUPERUSER_ID, {})
    _ensure_pos_payment_methods(env)
