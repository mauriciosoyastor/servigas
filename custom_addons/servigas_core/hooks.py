def _ensure_pos_order_discount(env):
    """Activa descuento global del Mostrador (producto + module_pos_discount)."""
    discount_product = env.ref(
        "pos_discount.product_product_consumable", raise_if_not_found=False
    )
    if not discount_product:
        return
    tmpl = discount_product.product_tmpl_id
    tmpl.write(
        {
            "name": "Descuento general",
            "available_in_pos": False,
            "sale_ok": True,
        }
    )
    configs = env["pos.config"].search([])
    open_configs = (
        env["pos.session"]
        .search(["|", ("state", "!=", "closed"), ("rescue", "=", True)])
        .mapped("config_id")
    )
    for conf in configs - open_configs:
        conf.write(
            {
                "module_pos_discount": True,
                "manual_discount": True,
                "discount_product_id": discount_product.id,
                "discount_pc": conf.discount_pc or 10.0,
            }
        )


def _ensure_pos_payment_methods(env):
    """Asegura los 6 medios del Mostrador y los enlaza a todo pos.config.

    Set canónico (alineado al shell BFF / payment-registers):
      Efectivo · Transferencia / depósito al banco · Cuenta corriente ·
      Débito · Tarjeta de crédito · Mercado Pago

    Renombrar Cash/Card/Customer Account falla si hay sesión POS abierta;
    el BFF ya localiza esos nombres en español.
    Sin diarios (DB sin plan contable) crea los medios igual; el cobro
    contable completo requiere caja/banco configurados aparte.
    """
    from odoo.exceptions import UserError

    Method = env["pos.payment.method"]
    Config = env["pos.config"]
    cash_journal = env["account.journal"].search(
        [("type", "=", "cash")], limit=1
    )
    bank_journal = env["account.journal"].search(
        [("type", "=", "bank")], limit=1
    )

    renames = {
        "Cash": "Efectivo",
        "Card": "Transferencia / depósito al banco",
        "Customer Account": "Cuenta corriente",
        # "Crédito" suelto = cuenta corriente legacy de Odoo (no tarjeta).
        "Crédito": "Cuenta corriente",
    }
    for old_name, new_name in renames.items():
        rows = Method.search([("name", "=", old_name)])
        if not rows:
            continue
        try:
            rows.write({"name": new_name})
        except UserError:
            # Sesión POS abierta: el label lo resuelve localizePaymentMethodName.
            pass

    def _find(*names):
        for name in names:
            existing = Method.search([("name", "=", name)], limit=1)
            if existing:
                return existing
        return Method.browse()

    def _get_or_create(name, *, is_cash, journal, split=False, aliases=()):
        existing = _find(name, *aliases)
        if existing:
            return existing
        vals = {
            "name": name,
            "is_cash_count": bool(is_cash),
            "payment_method_type": "none",
            "split_transactions": bool(split),
        }
        if journal:
            vals["journal_id"] = journal.id
        return Method.create(vals)

    methods = Method.browse()
    methods |= _get_or_create(
        "Efectivo",
        is_cash=True,
        journal=cash_journal,
        aliases=("Cash",),
    )
    methods |= _get_or_create(
        "Transferencia / depósito al banco",
        is_cash=False,
        journal=bank_journal,
        aliases=("Card", "Transferencia"),
    )
    methods |= _get_or_create(
        "Cuenta corriente",
        is_cash=False,
        journal=False,
        split=True,
        aliases=("Customer Account",),
    )
    methods |= _get_or_create(
        "Débito", is_cash=False, journal=bank_journal, aliases=("Debit",)
    )
    methods |= _get_or_create(
        "Tarjeta de crédito",
        is_cash=False,
        journal=bank_journal,
        aliases=("Credit Card", "Credit", "Tarjeta de credito"),
    )
    methods |= _get_or_create(
        "Mercado Pago",
        is_cash=False,
        journal=bank_journal,
        aliases=("MercadoPago",),
    )

    configs = Config.search([])
    if not configs:
        configs = Config.create({"name": "Mostrador Servigas"})

    for config in configs:
        missing = methods - config.payment_method_ids
        if not missing:
            continue
        # Con sesión POS abierta Odoo bloquea cambios; este context lo permite.
        config.with_context(
            bypass_payment_method_ids_forbidden_change=True
        ).write({"payment_method_ids": [(4, m.id) for m in missing]})


def post_init_hook(env):
    """Crea tile de Tableros si spreadsheet_dashboard está instalado."""
    _ensure_pos_order_discount(env)
    _ensure_pos_payment_methods(env)
    module = env["ir.module.module"].search(
        [("name", "=", "spreadsheet_dashboard"), ("state", "=", "installed")],
        limit=1,
    )
    if module:
        action = env.ref("spreadsheet_dashboard.ir_actions_dashboard_action", raise_if_not_found=False)
        if action:
            Tile = env["sg.app.tile"]
            existing = Tile.search([("label", "=", "Tableros")], limit=1)
            values = {
                "label": "Tableros",
                "hint": "Dashboards y reportes visuales",
                "icon": "fa-th",
                "sequence": 60,
                "accent_key": "bg-charcoal",
                "target_type": "action",
                "action_id": action.id,
                "module_required": "spreadsheet_dashboard",
                "active": True,
            }
            if existing:
                existing.write(values)
            else:
                Tile.create(values)
    env["sg.app.tile"].setup_launcher_tile_accents()
    env["sg.hub.card"].setup_sales_hub_card_accents()
    env["sg.hub.card"].setup_inventory_hub_card_accents()
    env["sg.hub.card"].setup_purchase_hub_card_accents()
    env["sg.hub.card"].setup_accounting_hub_card_accents()
    env["sg.app.tile"].setup_launcher_home_for_users()
