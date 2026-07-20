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


def post_init_hook(env):
    """Crea tile de Tableros si spreadsheet_dashboard está instalado."""
    _ensure_pos_order_discount(env)
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
