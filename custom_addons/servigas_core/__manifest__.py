{
    "name": "Servigas Core",
    "summary": "Tema Liquid Glass v2, hubs Inventario/Ventas y extensiones base",
    "description": """
Módulo base de Servigas: assets SCSS (marca llama, tipografía Montserrat),
personalización POS y backend Odoo 19, hubs con rail y KPI cards de ingreso.
    """,
    "author": "Servigas",
    "website": "https://github.com/mauriciosoyastor/servigas",
    "category": "Hidden",
    "version": "19.0.1.2.0",
    "license": "LGPL-3",
    "depends": [
        "base",
        "web",
        "product",
        "point_of_sale",
        "stock",
        "sale_management",
    ],
    "data": [
        "security/ir.model.access.csv",
        "data/hub_inventory_data.xml",
        "data/hub_sales_data.xml",
        "views/hub_menus.xml",
    ],
    "assets": {
        "web._assets_primary_variables": [
            (
                "after",
                "web/static/src/webclient/navbar/navbar.variables.scss",
                "servigas_core/static/src/scss/servigas_primary_variables.scss",
            ),
        ],
        "web.assets_backend": [
            (
                "before",
                "web/static/src/scss/bootstrap_overridden.scss",
                "servigas_core/static/src/scss/servigas_tokens.scss",
            ),
            "servigas_core/static/src/scss/servigas_backend.scss",
            "servigas_core/static/src/scss/servigas_hub.scss",
            "servigas_core/static/src/js/services/sg_hub_service.js",
            "servigas_core/static/src/js/components/sg_entry_card.xml",
            "servigas_core/static/src/js/components/sg_entry_card.js",
            "servigas_core/static/src/js/components/sg_section_rail.xml",
            "servigas_core/static/src/js/components/sg_section_rail.js",
            "servigas_core/static/src/js/hubs/inventory_hub.xml",
            "servigas_core/static/src/js/hubs/inventory_hub.js",
            "servigas_core/static/src/js/hubs/inventory_hub_action.js",
            "servigas_core/static/src/js/hubs/sales_hub.xml",
            "servigas_core/static/src/js/hubs/sales_hub.js",
            "servigas_core/static/src/js/hubs/sales_hub_action.js",
        ],
        "point_of_sale._assets_pos": [
            (
                "after",
                "point_of_sale/static/src/app/pos_app.scss",
                "servigas_core/static/src/scss/servigas_tokens.scss",
            ),
            "servigas_core/static/src/scss/servigas_pos.scss",
        ],
    },
    "installable": True,
    "application": False,
}
