"""Habilita descuento manual en POS y verifica importación."""

Product = env["product.template"]
print("Productos en Odoo:", Product.search_count([]))

pos_config = env["pos.config"].search([], limit=1)
if not pos_config:
    pos_config = env["pos.config"].create({"name": "Mostrador Servigas"})
    print("POS creado: Mostrador Servigas")
else:
    print("POS existente:", pos_config.name)

pos_config.write({"manual_discount": True})
# Campo en Odoo 19 puede variar
if hasattr(pos_config, "iface_discount"):
    pos_config.write({"iface_discount": True})

env["ir.config_parameter"].sudo().set_param("point_of_sale.manual_discount", "True")

env.cr.commit()
print("Descuento manual POS: habilitado")
print("Listo.")
