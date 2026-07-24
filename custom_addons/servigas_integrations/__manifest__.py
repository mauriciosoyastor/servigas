{
    "name": "Servigas Integraciones",
    "summary": "Panel de integraciones externas y pantalla de inicio para Servigas",
    "description": """
Centraliza las integraciones manuales de Servigas (Factura Web, portales de
proveedores) y define la pantalla de inicio al ingresar a Odoo.
    """,
    "author": "Servigas",
    "website": "https://github.com/mauriciosoyastor/servigas",
    "category": "Servigas",
    "version": "19.0.1.0.1",
    "license": "LGPL-3",
    "depends": ["base", "web", "mail", "servigas_core"],
    "data": [
        "security/ir.model.access.csv",
        "data/integration_data.xml",
        "data/integration_copy_rebrand.xml",
        "views/integration_views.xml",
        "views/integration_menus.xml",
        "data/default_home_action.xml",
        "data/hide_discuss_menu.xml",
    ],
    "assets": {},
    "installable": True,
    "application": True,
}
