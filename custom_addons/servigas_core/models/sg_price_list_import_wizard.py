import base64
import json

from odoo import api, fields, models, _
from odoo.exceptions import UserError

from . import sg_price_list_import_logic as logic


class SgPriceListImportWizard(models.TransientModel):
    _name = "sg.price.list.import.wizard"
    _description = "Asistente para cargar lista de precios"

    state = fields.Selection(
        [
            ("upload", "Subir"),
            ("mapping", "Mapear"),
            ("preview", "Preview"),
            ("done", "Listo"),
        ],
        default="upload",
        required=True,
    )
    filename = fields.Char()
    file_data = fields.Binary(string="Archivo")
    headers_text = fields.Text(readonly=True)
    headers_json = fields.Text()
    rows_json = fields.Text()
    map_barcode = fields.Char(string="Columna barcode")
    map_default_code = fields.Char(string="Columna código")
    map_name = fields.Char(string="Columna nombre", required=False)
    map_list_price = fields.Char(string="Columna precio venta")
    map_standard_price = fields.Char(string="Columna costo")
    line_ids = fields.One2many(
        "sg.price.list.import.line",
        "wizard_id",
        string="Filas",
    )
    created_count = fields.Integer(readonly=True)
    updated_count = fields.Integer(readonly=True)
    skipped_count = fields.Integer(readonly=True)
    message = fields.Text(readonly=True)

    def action_download_template(self):
        self.ensure_one()
        content = logic.TEMPLATE_CSV.encode("utf-8")
        attachment = self.env["ir.attachment"].create(
            {
                "name": "plantilla_lista_precios_servigas.csv",
                "type": "binary",
                "datas": base64.b64encode(content),
                "mimetype": "text/csv",
                "res_model": self._name,
                "res_id": self.id,
            }
        )
        return {
            "type": "ir.actions.act_url",
            "url": f"/web/content/{attachment.id}?download=true",
            "target": "self",
        }

    def action_parse_file(self):
        self.ensure_one()
        if not self.file_data:
            raise UserError(_("Subí un archivo CSV o Excel (.xlsx)."))
        raw = base64.b64decode(self.file_data)
        parsed = logic.parse_tabular_bytes(self.filename, raw)
        if parsed.get("error"):
            raise UserError(parsed["error"])
        if not parsed.get("rows"):
            raise UserError(_("El archivo no tiene filas de datos."))
        headers = parsed["headers"]
        mapping = logic.suggest_mapping(headers)
        self.write(
            {
                "state": "mapping",
                "headers_json": json.dumps(headers, ensure_ascii=False),
                "headers_text": ", ".join(headers),
                "rows_json": json.dumps(parsed["rows"], ensure_ascii=False, default=str),
                "map_barcode": mapping.get("barcode"),
                "map_default_code": mapping.get("default_code"),
                "map_name": mapping.get("name"),
                "map_list_price": mapping.get("list_price"),
                "map_standard_price": mapping.get("standard_price"),
                "message": False,
            }
        )
        return self._reopen()

    def _mapping_dict(self):
        self.ensure_one()
        mapping = {}
        for field, value in (
            ("barcode", self.map_barcode),
            ("default_code", self.map_default_code),
            ("name", self.map_name),
            ("list_price", self.map_list_price),
            ("standard_price", self.map_standard_price),
        ):
            if value:
                mapping[field] = value.strip()
        return mapping

    def action_build_preview(self):
        self.ensure_one()
        mapping = self._mapping_dict()
        if "name" not in mapping:
            raise UserError(_("Indicá qué columna es el nombre del producto."))
        if "list_price" not in mapping and "standard_price" not in mapping:
            raise UserError(_("Indicá al menos una columna de precio (venta o costo)."))
        try:
            raw_rows = json.loads(self.rows_json or "[]")
        except json.JSONDecodeError as exc:
            raise UserError(_("No se pudieron leer las filas parseadas.")) from exc

        indexes = self._build_indexes()
        classified = logic.classify_rows(raw_rows, mapping, indexes)
        Line = self.env["sg.price.list.import.line"]
        self.line_ids.unlink()
        vals_list = []
        for row in classified:
            selected = row["status"] in ("create", "update")
            product_id = row.get("product_id") or False
            vals_list.append(
                {
                    "wizard_id": self.id,
                    "line_number": row["line_number"],
                    "selected": selected,
                    "status": row["status"],
                    "barcode": row.get("barcode") or False,
                    "default_code": row.get("default_code") or False,
                    "name": row.get("name") or False,
                    "list_price": row.get("list_price")
                    if row.get("list_price") is not None
                    else False,
                    "standard_price": row.get("standard_price")
                    if row.get("standard_price") is not None
                    else False,
                    "product_id": product_id,
                    "reason": row.get("reason") or False,
                }
            )
        if vals_list:
            Line.create(vals_list)
        self.write({"state": "preview", "message": False})
        return self._reopen()

    def _build_indexes(self):
        products = self.env["product.product"].search_read(
            [("active", "=", True)],
            ["id", "barcode", "default_code", "name"],
        )
        return logic.build_product_indexes(products)

    def action_apply(self):
        self.ensure_one()
        ProductTemplate = self.env["product.template"]
        created = 0
        updated = 0
        skipped = 0

        for line in self.line_ids:
            status = line.status
            if line.selected and status == "review" and line.product_id:
                status = "update"
            if not line.selected or status not in ("create", "update"):
                skipped += 1
                continue
            if status == "create":
                vals = self._vals_for_create(line)
                ProductTemplate.create(vals)
                created += 1
                continue

            product = line.product_id
            if not product:
                skipped += 1
                continue
            write_vals = self._vals_for_update(line, product)
            if write_vals:
                product.product_tmpl_id.write(write_vals)
                if "standard_price" in write_vals:
                    product.write({"standard_price": write_vals["standard_price"]})
            updated += 1

        note = _(
            "Importación finalizada. Creados: %(c)s · Actualizados: %(u)s · Omitidos: %(s)s"
        ) % {"c": created, "u": updated, "s": skipped}
        self.env["sg.price.list.import.log"].create(
            {
                "name": _("Lista de precios — %(name)s")
                % {"name": self.filename or _("sin nombre")},
                "filename": self.filename,
                "created_count": created,
                "updated_count": updated,
                "skipped_count": skipped,
                "note": note,
            }
        )
        self.write(
            {
                "state": "done",
                "created_count": created,
                "updated_count": updated,
                "skipped_count": skipped,
                "message": note,
            }
        )
        return self._reopen()

    def _vals_for_create(self, line):
        vals = {
            "name": (line.name or "")[:512],
            "type": "consu",
            "is_storable": True,
            "sale_ok": True,
            "purchase_ok": True,
        }
        if line.default_code:
            vals["default_code"] = line.default_code[:128]
        if line.barcode:
            vals["barcode"] = line.barcode[:128]
        if line.list_price is not False and line.list_price is not None:
            vals["list_price"] = line.list_price
        if line.standard_price is not False and line.standard_price is not None:
            vals["standard_price"] = line.standard_price
        return vals

    def _vals_for_update(self, line, product):
        tmpl = product.product_tmpl_id
        vals = {}
        if line.list_price is not False and line.list_price is not None:
            vals["list_price"] = line.list_price
        if line.standard_price is not False and line.standard_price is not None:
            vals["standard_price"] = line.standard_price
        if line.barcode and not product.barcode:
            vals["barcode"] = line.barcode[:128]
        if line.default_code and not tmpl.default_code:
            vals["default_code"] = line.default_code[:128]
        return vals

    def action_back_to_upload(self):
        self.ensure_one()
        self.write({"state": "upload"})
        return self._reopen()

    def action_back_to_mapping(self):
        self.ensure_one()
        self.write({"state": "mapping"})
        return self._reopen()

    def _reopen(self):
        self.ensure_one()
        return {
            "type": "ir.actions.act_window",
            "res_model": self._name,
            "res_id": self.id,
            "view_mode": "form",
            "target": "new",
            "context": self.env.context,
        }


class SgPriceListImportLine(models.TransientModel):
    _name = "sg.price.list.import.line"
    _description = "Fila preview importación lista de precios"
    _order = "line_number, id"

    wizard_id = fields.Many2one(
        "sg.price.list.import.wizard",
        required=True,
        ondelete="cascade",
    )
    line_number = fields.Integer(required=True)
    selected = fields.Boolean(default=True)
    status = fields.Selection(
        [
            ("create", "Crear"),
            ("update", "Actualizar"),
            ("review", "Revisar"),
            ("error", "Error"),
        ],
        required=True,
    )
    barcode = fields.Char()
    default_code = fields.Char()
    name = fields.Char()
    list_price = fields.Float(digits=(16, 2))
    standard_price = fields.Float(digits=(16, 2))
    product_id = fields.Many2one("product.product", string="Producto")
    reason = fields.Char()

    @api.onchange("product_id")
    def _onchange_product_id(self):
        for line in self:
            if line.product_id and line.status == "review":
                line.status = "update"
                line.selected = True
