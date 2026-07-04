{
    "name": "Servigas Core",
    "summary": "Tema Liquid Glass v2, hubs Inventario/Ventas/Compras/Facturación",
    "description": """
Módulo base de Servigas: assets SCSS (marca llama, tipografía Montserrat),
personalización POS y backend Odoo 19, hubs con rail y KPI cards de ingreso.
    """,
    "author": "Servigas",
    "website": "https://github.com/mauriciosoyastor/servigas",
    "category": "Hidden",
    "version": "19.0.1.4.0",
    "license": "LGPL-3",
    "depends": [
        "base",
        "web",
        "product",
        "point_of_sale",
        "stock",
        "sale_management",
        "purchase",
        "account",
    ],
    "data": [
        "security/ir.model.access.csv",
        "data/hub_inventory_data.xml",
        "data/hub_sales_data.xml",
        "data/hub_purchase_data.xml",
        "data/hub_accounting_data.xml",
        "views/hub_menus.xml",
    ],
    "assets": {},
    "installable": True,
    "application": False,
}
