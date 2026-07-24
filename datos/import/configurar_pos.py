"""Habilita descuento por línea y descuento general (global) en el Mostrador."""

Product = env["product.template"]
print("Productos en Odoo:", Product.search_count([]))

sin_pos = Product.search([("available_in_pos", "=", False)])
if sin_pos:
    sin_pos.write({"available_in_pos": True})
    print(f"Productos habilitados en POS: {len(sin_pos)}")
else:
    print("Productos habilitados en POS: ya estaban todos")

pos_config = env["pos.config"].search([], limit=1)
if not pos_config:
    pos_config = env["pos.config"].create({"name": "Mostrador Servigas"})
    print("POS creado: Mostrador Servigas")
else:
    print("POS existente:", pos_config.name)

pos_config.write({"manual_discount": True})
if hasattr(pos_config, "iface_discount"):
    pos_config.write({"iface_discount": True})

# Global order discount (module pos_discount)
discount_product = env.ref("pos_discount.product_product_consumable", raise_if_not_found=False)
if discount_product:
    tmpl = discount_product.product_tmpl_id
    tmpl.write(
        {
            "name": "Descuento general",
            "available_in_pos": False,
            "sale_ok": True,
        }
    )
    pos_config.write(
        {
            "module_pos_discount": True,
            "discount_product_id": discount_product.id,
            "discount_pc": 10.0,
        }
    )
    print("Descuento general POS: producto + module_pos_discount OK")
else:
    print("AVISO: no se encontró pos_discount.product_product_consumable")

env["ir.config_parameter"].sudo().set_param("point_of_sale.manual_discount", "True")

env.cr.commit()
print("Descuento manual (línea) POS: habilitado")
print("En POS:", Product.search_count([("available_in_pos", "=", True)]))
print("Listo.")
