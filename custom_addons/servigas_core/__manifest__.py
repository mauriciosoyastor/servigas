{
    "name": "Servigas Core",
    "summary": "Tema Liquid Glass v2, identidad visual y extensiones base para Servigas",
    "description": """
Módulo base de Servigas: assets SCSS (marca llama, tipografía Montserrat),
personalización POS y backend Odoo 19.
    """,
    "author": "Servigas",
    "website": "https://github.com/mauriciosoyastor/servigas",
    "category": "Hidden",
    "version": "19.0.1.0.0",
    "license": "LGPL-3",
    "depends": ["base", "web", "point_of_sale", "stock"],
    "data": [
        "views/views.xml",
        "views/templates.xml",
    ],
    "demo": [
        "demo/demo.xml",
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
