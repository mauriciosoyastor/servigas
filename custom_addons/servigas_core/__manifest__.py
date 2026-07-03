{
    "name": "Servigas Core",
    "summary": "Tema Liquid Glass v2, hub Inventario y extensiones base para Servigas",
    "description": """
Módulo base de Servigas: assets SCSS (marca llama, tipografía Montserrat),
personalización POS y backend Odoo 19, hub de inventario con rail y KPI cards.
    """,
    "author": "Servigas",
    "website": "https://github.com/mauriciosoyastor/servigas",
    "category": "Hidden",
    "version": "19.0.1.1.0",
    "license": "LGPL-3",
    "depends": ["base", "web", "product", "point_of_sale", "stock"],
    "data": [
        "security/ir.model.access.csv",
        "data/hub_inventory_data.xml",
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
