from odoo import fields, models


class ProductTemplate(models.Model):
    _inherit = "product.template"

    sg_stock_min_qty = fields.Float(
        string="Stock mínimo (alerta)",
        digits="Product Unit of Measure",
        default=0.0,
        help="Obsoleto: las alertas usan el mínimo global "
        "(ir.config_parameter servigas.stock.min_qty) en Ajustes del shell.",
    )


class ProductProduct(models.Model):
    _inherit = "product.product"

    sg_stock_min_qty = fields.Float(
        related="product_tmpl_id.sg_stock_min_qty",
        string="Stock mínimo (alerta)",
        digits="Product Unit of Measure",
        readonly=False,
        store=True,
    )
