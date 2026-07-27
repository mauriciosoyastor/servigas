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
    """Medios de pago del Mostrador Astro: agrega Débito / Mercado Pago al config.

    Renombrar Cash/Card/Customer Account falla si hay sesión POS abierta;
    el BFF ya localiza esos nombres en español.
    """
    from odoo.exceptions import UserError

    Method = env["pos.payment.method"]
    Config = env["pos.config"]
    bank_journal = env["account.journal"].search(
        [("type", "=", "bank")], limit=1
    )

    renames = {
        "Cash": "Efectivo",
        "Card": "Transferencia / depósito al banco",
        "Customer Account": "Cuenta corriente",
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

    def _get_or_create(name, *, is_cash, journal, split=False):
        existing = Method.search([("name", "=", name)], limit=1)
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

    # Solo crear medios nuevos; los defaults (Cash/Card/Customer Account) ya existen.
    methods = Method.browse()
    methods |= _get_or_create("Débito", is_cash=False, journal=bank_journal)
    methods |= _get_or_create(
        "Mercado Pago", is_cash=False, journal=bank_journal
    )

    for config in Config.search([]):
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
