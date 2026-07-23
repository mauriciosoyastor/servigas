/**
 * Allowlisted Astro record lists (no arbitrary model from the browser).
 */

export type OdooAction = Record<string, unknown> | false | null | undefined;

export type RecordListKey =
  | "inventory/products"
  | "inventory/variants"
  | "inventory/no-stock"
  | "inventory/stockables"
  | "inventory/no-price"
  | "inventory/transfers"
  | "inventory/transfers-all"
  | "inventory/quants"
  | "inventory/orderpoints"
  | "inventory/locations"
  | "inventory/warehouses"
  | "inventory/picking-types"
  | "inventory/categories"
  | "sales/orders"
  | "sales/quotations"
  | "sales/to-invoice"
  | "sales/upselling"
  | "sales/pos-orders"
  | "sales/customers"
  | "sales/customers-with-orders"
  | "sales/teams"
  | "sales/tags"
  | "sales/payment-terms"
  | "sales/analysis"
  | "sales/by-product"
  | "sales/by-customer"
  | "sales/by-salesperson"
  | "purchase/orders"
  | "purchase/rfq"
  | "purchase/rfq-draft"
  | "purchase/rfq-sent"
  | "purchase/to-approve"
  | "purchase/to-receive"
  | "purchase/partial"
  | "purchase/order-lines"
  | "purchase/vendors"
  | "purchase/vendors-with-po"
  | "purchase/portals"
  | "purchase/supplierinfo"
  | "purchase/uom"
  | "purchase/analysis"
  | "accounting/receivable"
  | "accounting/payable"
  | "accounting/drafts"
  | "accounting/customer-invoices"
  | "accounting/vendor-bills"
  | "accounting/credit-notes"
  | "accounting/vendor-refunds"
  | "accounting/payments"
  | "accounting/journals"
  | "accounting/accounts"
  | "accounting/taxes"
  | "accounting/payment-terms"
  | "accounting/move-lines"
  | "accounting/factura-web"
  | "accounting/invoice-analysis"
  | "integrations/all";

export type RecordListColumnDef = {
  key: string;
  label: string;
  kind?: "text" | "image";
};

export type RecordListDef = {
  key: RecordListKey;
  path: string;
  title: string;
  hint: string;
  model: string;
  domain: unknown[];
  fields: string[];
  columns: RecordListColumnDef[];
  limit: number;
  order: string;
  hubBack: string;
  railApp: "inventory" | "sales" | "purchase" | "accounting" | "home";
  imageField?: string;
  detailPath?: string;
  searchFields?: string[];
};

function productCols(
  nameKey: "name" | "display_name"
): RecordListColumnDef[] {
  return [
    { key: "image_url", label: "", kind: "image" },
    { key: nameKey, label: "Nombre" },
    { key: "default_code", label: "Referencia" },
    { key: "barcode", label: "Barras" },
    { key: "qty_available", label: "Stock" },
    { key: "active", label: "Activo" },
  ];
}

function orderCols(): RecordListColumnDef[] {
  return [
    { key: "name", label: "Número" },
    { key: "partner_id", label: "Contacto" },
    { key: "date_order", label: "Fecha" },
    { key: "amount_total", label: "Total" },
    { key: "state", label: "Estado" },
  ];
}

function moveCols(): RecordListColumnDef[] {
  return [
    { key: "name", label: "Número" },
    { key: "partner_id", label: "Contacto" },
    { key: "invoice_date", label: "Fecha" },
    { key: "amount_total", label: "Total" },
    { key: "payment_state", label: "Pago" },
    { key: "state", label: "Estado" },
  ];
}

function partnerCols(): RecordListColumnDef[] {
  return [
    { key: "name", label: "Nombre" },
    { key: "vat", label: "CUIT" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Teléfono" },
    { key: "city", label: "Ciudad" },
  ];
}

function integrationCols(): RecordListColumnDef[] {
  return [
    { key: "name", label: "Nombre" },
    { key: "integration_type", label: "Tipo" },
    { key: "status", label: "Estado" },
  ];
}

function saleReportCols(
  emphasis: "all" | "product" | "partner" | "user"
): RecordListColumnDef[] {
  const cols: RecordListColumnDef[] = [{ key: "date", label: "Fecha" }];
  if (emphasis === "product" || emphasis === "all") {
    cols.push({ key: "product_id", label: "Producto" });
  }
  if (emphasis === "partner" || emphasis === "all") {
    cols.push({ key: "partner_id", label: "Cliente" });
  }
  if (emphasis === "user" || emphasis === "all") {
    cols.push({ key: "user_id", label: "Vendedor" });
  }
  cols.push(
    { key: "product_uom_qty", label: "Cantidad" },
    { key: "price_total", label: "Total" },
    { key: "state", label: "Estado" }
  );
  return cols;
}

const LISTS: Record<RecordListKey, RecordListDef> = {
  "inventory/products": {
    key: "inventory/products",
    path: "/lists/inventory/products",
    title: "Productos",
    hint: "Plantillas activas — buscá por nombre, código o barras",
    model: "product.template",
    domain: [["active", "=", true]],
    fields: [
      "name",
      "default_code",
      "barcode",
      "list_price",
      "qty_available",
      "active",
    ],
    columns: productCols("name"),
    limit: 50,
    order: "name asc",
    hubBack: "/hubs/inventory",
    railApp: "inventory",
    imageField: "image_128",
    detailPath: "/lists/inventory/products/:id",
    searchFields: ["name", "default_code", "barcode"],
  },
  "inventory/variants": {
    key: "inventory/variants",
    path: "/lists/inventory/variants",
    title: "Variantes SKU",
    hint: "Referencias de inventario — nombre, código o barras",
    model: "product.product",
    domain: [["active", "=", true]],
    fields: [
      "display_name",
      "default_code",
<<<<<<< HEAD
      "list_price",
=======
      "barcode",
>>>>>>> 3de146b (feat(web): buscar productos por barcode en listas shell)
      "qty_available",
      "active",
    ],
    columns: productCols("display_name"),
    limit: 50,
    order: "default_code asc",
    hubBack: "/hubs/inventory",
    railApp: "inventory",
    imageField: "image_128",
    searchFields: ["name", "default_code", "display_name", "barcode"],
    detailPath: "/lists/inventory/variants/:id",
  },
  "inventory/no-stock": {
    key: "inventory/no-stock",
    path: "/lists/inventory/no-stock",
    title: "Sin stock",
    hint: "Productos en cero — nombre, código o barras",
    model: "product.product",
    domain: [
      ["is_storable", "=", true],
      ["qty_available", "<=", 0],
    ],
    fields: [
      "display_name",
      "default_code",
      "barcode",
      "qty_available",
      "active",
    ],
    columns: productCols("display_name"),
    limit: 50,
    order: "default_code asc",
    hubBack: "/hubs/inventory",
    railApp: "inventory",
    imageField: "image_128",
    searchFields: ["name", "default_code", "display_name", "barcode"],
    detailPath: "/lists/inventory/variants/:id",
  },
  "inventory/stockables": {
    key: "inventory/stockables",
    path: "/lists/inventory/stockables",
    title: "Stock almacenable",
    hint: "Existencias — nombre, código o barras",
    model: "product.product",
    domain: [
      ["is_storable", "=", true],
      ["active", "=", true],
    ],
    fields: [
      "display_name",
      "default_code",
      "barcode",
      "qty_available",
      "active",
    ],
    columns: productCols("display_name"),
    limit: 50,
    order: "default_code asc",
    hubBack: "/hubs/inventory",
    railApp: "inventory",
    imageField: "image_128",
    searchFields: ["name", "default_code", "display_name", "barcode"],
    detailPath: "/lists/inventory/variants/:id",
  },
  "inventory/no-price": {
    key: "inventory/no-price",
    path: "/lists/inventory/no-price",
    title: "Sin precio de venta",
    hint: "list_price en cero — nombre, código o barras",
    model: "product.template",
    domain: [["list_price", "=", 0]],
    fields: ["name", "default_code", "barcode", "list_price", "active"],
    columns: [
      { key: "image_url", label: "", kind: "image" },
      { key: "name", label: "Nombre" },
      { key: "default_code", label: "Referencia" },
      { key: "barcode", label: "Barras" },
      { key: "list_price", label: "Precio" },
      { key: "active", label: "Activo" },
    ],
    limit: 50,
    order: "name asc",
    hubBack: "/hubs/inventory",
    railApp: "inventory",
    imageField: "image_128",
    searchFields: ["name", "default_code", "barcode"],
    detailPath: "/lists/inventory/products/:id",
  },
  "inventory/transfers": {
    key: "inventory/transfers",
    path: "/lists/inventory/transfers",
    title: "Transferencias",
    hint: "Operaciones no finalizadas",
    model: "stock.picking",
    domain: [["state", "in", ["confirmed", "assigned", "waiting"]]],
    fields: ["name", "partner_id", "scheduled_date", "state", "origin"],
    columns: [
      { key: "name", label: "Referencia" },
      { key: "partner_id", label: "Contacto" },
      { key: "scheduled_date", label: "Fecha" },
      { key: "state", label: "Estado" },
      { key: "origin", label: "Origen" },
    ],
    limit: 50,
    order: "scheduled_date desc",
    hubBack: "/hubs/inventory",
    railApp: "inventory",
    searchFields: ["name", "origin"],
    detailPath: "/lists/inventory/transfers/:id",
  },
  "inventory/transfers-all": {
    key: "inventory/transfers-all",
    path: "/lists/inventory/transfers-all",
    title: "Todas las transferencias",
    hint: "Operaciones de inventario",
    model: "stock.picking",
    domain: [],
    fields: ["name", "partner_id", "scheduled_date", "state", "origin"],
    columns: [
      { key: "name", label: "Referencia" },
      { key: "partner_id", label: "Contacto" },
      { key: "scheduled_date", label: "Fecha" },
      { key: "state", label: "Estado" },
      { key: "origin", label: "Origen" },
    ],
    limit: 50,
    order: "scheduled_date desc",
    hubBack: "/hubs/inventory",
    railApp: "inventory",
    searchFields: ["name", "origin"],
    detailPath: "/lists/inventory/transfers/:id",
  },
  "inventory/quants": {
    key: "inventory/quants",
    path: "/lists/inventory/quants",
    title: "Existencias (quants)",
    hint: "Cantidades por ubicación",
    model: "stock.quant",
    domain: [["quantity", "!=", 0]],
    fields: ["product_id", "location_id", "quantity", "reserved_quantity"],
    columns: [
      { key: "product_id", label: "Producto" },
      { key: "location_id", label: "Ubicación" },
      { key: "quantity", label: "Cantidad" },
      { key: "reserved_quantity", label: "Reservado" },
    ],
    limit: 50,
    order: "id desc",
    hubBack: "/hubs/inventory",
    railApp: "inventory",
    searchFields: ["product_id"],
  },
  "inventory/orderpoints": {
    key: "inventory/orderpoints",
    path: "/lists/inventory/orderpoints",
    title: "Reglas de reabastecimiento",
    hint: "Puntos de pedido mínimos",
    model: "stock.warehouse.orderpoint",
    domain: [],
    fields: [
      "product_id",
      "location_id",
      "product_min_qty",
      "product_max_qty",
      "qty_to_order",
    ],
    columns: [
      { key: "product_id", label: "Producto" },
      { key: "location_id", label: "Ubicación" },
      { key: "product_min_qty", label: "Mín." },
      { key: "product_max_qty", label: "Máx." },
      { key: "qty_to_order", label: "A pedir" },
    ],
    limit: 50,
    order: "id desc",
    hubBack: "/hubs/inventory",
    railApp: "inventory",
    searchFields: ["product_id"],
  },
  "inventory/locations": {
    key: "inventory/locations",
    path: "/lists/inventory/locations",
    title: "Ubicaciones",
    hint: "Ubicaciones internas",
    model: "stock.location",
    domain: [["usage", "=", "internal"]],
    fields: ["complete_name", "usage", "active"],
    columns: [
      { key: "complete_name", label: "Ubicación" },
      { key: "usage", label: "Uso" },
      { key: "active", label: "Activo" },
    ],
    limit: 50,
    order: "complete_name asc",
    hubBack: "/hubs/inventory",
    railApp: "inventory",
    searchFields: ["complete_name", "name"],
    detailPath: "/lists/inventory/locations/:id",
  },
  "inventory/warehouses": {
    key: "inventory/warehouses",
    path: "/lists/inventory/warehouses",
    title: "Almacenes",
    hint: "Depósitos configurados",
    model: "stock.warehouse",
    domain: [],
    fields: ["name", "code", "partner_id"],
    columns: [
      { key: "name", label: "Nombre" },
      { key: "code", label: "Código" },
      { key: "partner_id", label: "Contacto" },
    ],
    limit: 50,
    order: "name asc",
    hubBack: "/hubs/inventory",
    railApp: "inventory",
    searchFields: ["name", "code"],
    detailPath: "/lists/inventory/warehouses/:id",
  },
  "inventory/picking-types": {
    key: "inventory/picking-types",
    path: "/lists/inventory/picking-types",
    title: "Tipos de operación",
    hint: "Recepciones, entregas e internos",
    model: "stock.picking.type",
    domain: [],
    fields: ["name", "code", "warehouse_id"],
    columns: [
      { key: "name", label: "Nombre" },
      { key: "code", label: "Código" },
      { key: "warehouse_id", label: "Almacén" },
    ],
    limit: 50,
    order: "name asc",
    hubBack: "/hubs/inventory",
    railApp: "inventory",
    searchFields: ["name", "code"],
    detailPath: "/lists/inventory/picking-types/:id",
  },
  "inventory/categories": {
    key: "inventory/categories",
    path: "/lists/inventory/categories",
    title: "Categorías",
    hint: "Categorías de producto",
    model: "product.category",
    domain: [],
    fields: ["complete_name", "name", "parent_id"],
    columns: [
      { key: "complete_name", label: "Categoría" },
      { key: "parent_id", label: "Padre" },
    ],
    limit: 50,
    order: "complete_name asc",
    hubBack: "/hubs/inventory",
    railApp: "inventory",
    searchFields: ["name", "complete_name"],
    detailPath: "/lists/inventory/categories/:id",
  },
  "sales/orders": {
    key: "sales/orders",
    path: "/lists/sales/orders",
    title: "Pedidos confirmados",
    hint: "Pedidos de venta en estado sale",
    model: "sale.order",
    domain: [["state", "=", "sale"]],
    fields: ["name", "partner_id", "date_order", "amount_total", "state"],
    columns: orderCols(),
    limit: 50,
    order: "date_order desc",
    hubBack: "/hubs/sales",
    railApp: "sales",
    searchFields: ["name", "client_order_ref"],
    detailPath: "/lists/sales/orders/:id",
  },
  "sales/quotations": {
    key: "sales/quotations",
    path: "/lists/sales/quotations",
    title: "Cotizaciones abiertas",
    hint: "Borradores y enviadas",
    model: "sale.order",
    domain: [["state", "in", ["draft", "sent"]]],
    fields: ["name", "partner_id", "date_order", "amount_total", "state"],
    columns: orderCols(),
    limit: 50,
    order: "date_order desc",
    hubBack: "/hubs/sales",
    detailPath: "/lists/sales/quotations/:id",
    railApp: "sales",
    searchFields: ["name", "client_order_ref"],
  },
  "sales/to-invoice": {
    key: "sales/to-invoice",
    path: "/lists/sales/to-invoice",
    title: "Por facturar",
    hint: "Pedidos con factura pendiente",
    model: "sale.order",
    domain: [["invoice_status", "=", "to invoice"]],
    fields: ["name", "partner_id", "date_order", "amount_total", "state"],
    columns: orderCols(),
    limit: 50,
    order: "date_order desc",
    hubBack: "/hubs/sales",
    railApp: "sales",
    searchFields: ["name"],
    detailPath: "/lists/sales/orders/:id",
  },
  "sales/upselling": {
    key: "sales/upselling",
    path: "/lists/sales/upselling",
    title: "Oportunidades upsell",
    hint: "Pedidos con upselling pendiente",
    model: "sale.order",
    domain: [["invoice_status", "=", "upselling"]],
    fields: ["name", "partner_id", "date_order", "amount_total", "state"],
    columns: orderCols(),
    limit: 50,
    order: "date_order desc",
    hubBack: "/hubs/sales",
    railApp: "sales",
    searchFields: ["name"],
    detailPath: "/lists/sales/orders/:id",
  },
  "sales/pos-orders": {
    key: "sales/pos-orders",
    path: "/lists/sales/pos-orders",
    title: "Pedidos POS",
    hint: "Historial de mostrador",
    model: "pos.order",
    domain: [],
    fields: ["name", "partner_id", "date_order", "amount_total", "state"],
    columns: orderCols(),
    limit: 50,
    order: "date_order desc",
    hubBack: "/hubs/sales",
    railApp: "sales",
    searchFields: ["name"],
    detailPath: "/lists/sales/pos-orders/:id",
  },
  "sales/customers": {
    key: "sales/customers",
    path: "/lists/sales/customers",
    title: "Clientes",
    hint: "Contactos con rango de cliente",
    model: "res.partner",
    domain: [["customer_rank", ">", 0]],
    fields: ["name", "vat", "email", "phone", "street", "city"],
    columns: partnerCols(),
    limit: 50,
    order: "name asc",
    hubBack: "/hubs/sales",
    railApp: "sales",
    searchFields: ["name", "email", "phone", "vat"],
    detailPath: "/lists/sales/customers/:id",
  },
  "sales/customers-with-orders": {
    key: "sales/customers-with-orders",
    path: "/lists/sales/customers-with-orders",
    title: "Clientes con pedidos",
    hint: "Contactos con al menos un pedido de venta",
    model: "res.partner",
    domain: [["sale_order_count", ">", 0]],
    fields: ["name", "vat", "email", "phone", "street", "city", "sale_order_count"],
    columns: [
      ...partnerCols(),
      { key: "sale_order_count", label: "Pedidos" },
    ],
    limit: 50,
    order: "name asc",
    hubBack: "/hubs/sales",
    railApp: "sales",
    searchFields: ["name", "email", "phone", "vat"],
    detailPath: "/lists/sales/customers/:id",
  },
  "sales/teams": {
    key: "sales/teams",
    path: "/lists/sales/teams",
    title: "Equipos de venta",
    hint: "Equipos comerciales",
    model: "crm.team",
    domain: [],
    fields: ["name", "user_id", "company_id"],
    columns: [
      { key: "name", label: "Equipo" },
      { key: "user_id", label: "Líder" },
      { key: "company_id", label: "Compañía" },
    ],
    limit: 50,
    order: "name asc",
    hubBack: "/hubs/sales",
    railApp: "sales",
    searchFields: ["name"],
    detailPath: "/lists/sales/teams/:id",
  },
  "sales/tags": {
    key: "sales/tags",
    path: "/lists/sales/tags",
    detailPath: "/lists/sales/tags/:id",
    title: "Etiquetas de venta",
    hint: "Tags CRM para oportunidades",
    model: "crm.tag",
    domain: [],
    fields: ["name", "color"],
    columns: [
      { key: "name", label: "Etiqueta" },
      { key: "color", label: "Color" },
    ],
    limit: 50,
    order: "name asc",
    hubBack: "/hubs/sales",
    railApp: "sales",
    searchFields: ["name"],
  },
  "sales/payment-terms": {
    key: "sales/payment-terms",
    path: "/lists/sales/payment-terms",
    title: "Plazos de pago",
    hint: "Condiciones de pago de ventas",
    model: "account.payment.term",
    domain: [],
    fields: ["name", "note", "active"],
    columns: [
      { key: "name", label: "Nombre" },
      { key: "note", label: "Notas" },
      { key: "active", label: "Activo" },
    ],
    limit: 50,
    order: "name asc",
    hubBack: "/hubs/sales",
    railApp: "sales",
    searchFields: ["name"],
    detailPath: "/lists/sales/payment-terms/:id",
  },
  "sales/analysis": {
    key: "sales/analysis",
    path: "/lists/sales/analysis",
    title: "Análisis de ventas",
    hint: "Líneas del reporte de ventas",
    model: "sale.report",
    domain: [],
    fields: [
      "date",
      "product_id",
      "partner_id",
      "user_id",
      "product_uom_qty",
      "price_total",
      "state",
    ],
    columns: saleReportCols("all"),
    limit: 50,
    order: "date desc",
    hubBack: "/hubs/sales",
    railApp: "sales",
    searchFields: ["name"],
  },
  "sales/by-product": {
    key: "sales/by-product",
    path: "/lists/sales/by-product",
    title: "Ventas por producto",
    hint: "Reporte de ventas enfocado en producto",
    model: "sale.report",
    domain: [],
    fields: [
      "date",
      "product_id",
      "product_uom_qty",
      "price_total",
      "state",
    ],
    columns: saleReportCols("product"),
    limit: 50,
    order: "date desc",
    hubBack: "/hubs/sales",
    railApp: "sales",
    searchFields: ["name"],
  },
  "sales/by-customer": {
    key: "sales/by-customer",
    path: "/lists/sales/by-customer",
    title: "Ventas por cliente",
    hint: "Reporte de ventas enfocado en cliente",
    model: "sale.report",
    domain: [],
    fields: [
      "date",
      "partner_id",
      "product_uom_qty",
      "price_total",
      "state",
    ],
    columns: saleReportCols("partner"),
    limit: 50,
    order: "date desc",
    hubBack: "/hubs/sales",
    railApp: "sales",
    searchFields: ["name"],
  },
  "sales/by-salesperson": {
    key: "sales/by-salesperson",
    path: "/lists/sales/by-salesperson",
    title: "Ventas por vendedor",
    hint: "Reporte de ventas enfocado en vendedor",
    model: "sale.report",
    domain: [],
    fields: [
      "date",
      "user_id",
      "product_uom_qty",
      "price_total",
      "state",
    ],
    columns: saleReportCols("user"),
    limit: 50,
    order: "date desc",
    hubBack: "/hubs/sales",
    railApp: "sales",
    searchFields: ["name"],
  },
  "purchase/orders": {
    key: "purchase/orders",
    path: "/lists/purchase/orders",
    title: "Órdenes de compra",
    hint: "OC confirmadas",
    model: "purchase.order",
    domain: [["state", "=", "purchase"]],
    fields: [
      "name",
      "partner_id",
      "date_order",
      "amount_total",
      "state",
      "receipt_status",
    ],
    columns: [
      ...orderCols(),
      { key: "receipt_status", label: "Recepción" },
    ],
    limit: 50,
    order: "date_order desc",
    hubBack: "/hubs/purchase",
    railApp: "purchase",
    searchFields: ["name"],
    detailPath: "/lists/purchase/orders/:id",
  },
  "purchase/rfq": {
    key: "purchase/rfq",
    path: "/lists/purchase/rfq",
    title: "Solicitudes abiertas",
    hint: "RFQ en borrador o enviadas",
    model: "purchase.order",
    domain: [["state", "in", ["draft", "sent"]]],
    fields: ["name", "partner_id", "date_order", "amount_total", "state"],
    columns: orderCols(),
    limit: 50,
    order: "date_order desc",
    hubBack: "/hubs/purchase",
    railApp: "purchase",
    searchFields: ["name"],
    detailPath: "/lists/purchase/orders/:id",
  },
  "purchase/rfq-draft": {
    key: "purchase/rfq-draft",
    path: "/lists/purchase/rfq-draft",
    title: "Borradores RFQ",
    hint: "Solicitudes en borrador",
    model: "purchase.order",
    domain: [["state", "=", "draft"]],
    fields: ["name", "partner_id", "date_order", "amount_total", "state"],
    columns: orderCols(),
    limit: 50,
    order: "date_order desc",
    hubBack: "/hubs/purchase",
    railApp: "purchase",
    searchFields: ["name"],
    detailPath: "/lists/purchase/orders/:id",
  },
  "purchase/rfq-sent": {
    key: "purchase/rfq-sent",
    path: "/lists/purchase/rfq-sent",
    title: "RFQ enviadas",
    hint: "Solicitudes enviadas a proveedores",
    model: "purchase.order",
    domain: [["state", "=", "sent"]],
    fields: ["name", "partner_id", "date_order", "amount_total", "state"],
    columns: orderCols(),
    limit: 50,
    order: "date_order desc",
    hubBack: "/hubs/purchase",
    railApp: "purchase",
    searchFields: ["name"],
    detailPath: "/lists/purchase/orders/:id",
  },
  "purchase/to-approve": {
    key: "purchase/to-approve",
    path: "/lists/purchase/to-approve",
    title: "Por aprobar",
    hint: "RFQ pendientes de aprobación",
    model: "purchase.order",
    domain: [["state", "=", "to approve"]],
    fields: ["name", "partner_id", "date_order", "amount_total", "state"],
    columns: orderCols(),
    limit: 50,
    order: "date_order desc",
    hubBack: "/hubs/purchase",
    railApp: "purchase",
    searchFields: ["name"],
    detailPath: "/lists/purchase/orders/:id",
  },
  "purchase/to-receive": {
    key: "purchase/to-receive",
    path: "/lists/purchase/to-receive",
    title: "Por recibir",
    hint: "OC con recepción pendiente",
    model: "purchase.order",
    domain: [
      ["state", "=", "purchase"],
      ["receipt_status", "=", "pending"],
    ],
    fields: [
      "name",
      "partner_id",
      "date_order",
      "amount_total",
      "state",
      "receipt_status",
    ],
    columns: [
      ...orderCols(),
      { key: "receipt_status", label: "Recepción" },
    ],
    limit: 50,
    order: "date_order desc",
    hubBack: "/hubs/purchase",
    railApp: "purchase",
    searchFields: ["name"],
    detailPath: "/lists/purchase/orders/:id",
  },
  "purchase/partial": {
    key: "purchase/partial",
    path: "/lists/purchase/partial",
    title: "Recepción parcial",
    hint: "OC con recepción incompleta",
    model: "purchase.order",
    domain: [["receipt_status", "=", "partial"]],
    fields: [
      "name",
      "partner_id",
      "date_order",
      "amount_total",
      "state",
      "receipt_status",
    ],
    columns: [
      ...orderCols(),
      { key: "receipt_status", label: "Recepción" },
    ],
    limit: 50,
    order: "date_order desc",
    hubBack: "/hubs/purchase",
    railApp: "purchase",
    searchFields: ["name"],
    detailPath: "/lists/purchase/orders/:id",
  },
  "purchase/order-lines": {
    key: "purchase/order-lines",
    path: "/lists/purchase/order-lines",
    title: "Líneas de compra",
    hint: "Historial de líneas de OC",
    model: "purchase.order.line",
    domain: [],
    fields: ["order_id", "product_id", "product_qty", "price_unit", "price_subtotal"],
    columns: [
      { key: "order_id", label: "OC" },
      { key: "product_id", label: "Producto" },
      { key: "product_qty", label: "Cantidad" },
      { key: "price_unit", label: "Precio" },
      { key: "price_subtotal", label: "Subtotal" },
    ],
    limit: 50,
    order: "id desc",
    hubBack: "/hubs/purchase",
    railApp: "purchase",
    searchFields: ["product_id"],
  },
  "purchase/vendors": {
    key: "purchase/vendors",
    path: "/lists/purchase/vendors",
    title: "Proveedores",
    hint: "Contactos con rango de proveedor",
    model: "res.partner",
    domain: [["supplier_rank", ">", 0]],
    fields: ["name", "vat", "email", "phone", "street", "city"],
    columns: partnerCols(),
    limit: 50,
    order: "name asc",
    hubBack: "/hubs/purchase",
    railApp: "purchase",
    searchFields: ["name", "email", "phone", "vat"],
    detailPath: "/lists/purchase/vendors/:id",
  },
  "purchase/vendors-with-po": {
    key: "purchase/vendors-with-po",
    path: "/lists/purchase/vendors-with-po",
    title: "Proveedores con OC",
    hint: "Contactos con al menos una orden de compra",
    model: "res.partner",
    domain: [["purchase_order_count", ">", 0]],
    fields: [
      "name",
      "vat",
      "email",
      "phone",
      "street",
      "city",
      "purchase_order_count",
    ],
    columns: [
      ...partnerCols(),
      { key: "purchase_order_count", label: "OC" },
    ],
    limit: 50,
    order: "name asc",
    hubBack: "/hubs/purchase",
    railApp: "purchase",
    searchFields: ["name", "email", "phone", "vat"],
    detailPath: "/lists/purchase/vendors/:id",
  },
  "purchase/portals": {
    key: "purchase/portals",
    path: "/lists/purchase/portals",
    title: "Portales proveedores",
    hint: "Integraciones de sync manual",
    model: "servigas.integration",
    domain: [
      ["integration_type", "=", "supplier_portal"],
      ["status", "=", "active"],
    ],
    fields: ["name", "integration_type", "status"],
    columns: integrationCols(),
    limit: 50,
    order: "name asc",
    hubBack: "/hubs/purchase",
    railApp: "purchase",
    searchFields: ["name"],
  },
  "purchase/supplierinfo": {
    key: "purchase/supplierinfo",
    path: "/lists/purchase/supplierinfo",
    title: "Listas de precio proveedor",
    hint: "Precios por proveedor y producto",
    model: "product.supplierinfo",
    domain: [],
    fields: ["partner_id", "product_tmpl_id", "price", "min_qty"],
    columns: [
      { key: "partner_id", label: "Proveedor" },
      { key: "product_tmpl_id", label: "Producto" },
      { key: "price", label: "Precio" },
      { key: "min_qty", label: "Mín." },
    ],
    limit: 50,
    order: "id desc",
    hubBack: "/hubs/purchase",
    railApp: "purchase",
    searchFields: ["partner_id", "product_tmpl_id"],
  },
  "purchase/uom": {
    key: "purchase/uom",
    path: "/lists/purchase/uom",
    title: "Unidades de medida",
    hint: "UdM del catálogo",
    model: "uom.uom",
    domain: [],
    fields: ["name", "category_id", "uom_type"],
    columns: [
      { key: "name", label: "Nombre" },
      { key: "category_id", label: "Categoría" },
      { key: "uom_type", label: "Tipo" },
    ],
    limit: 50,
    order: "name asc",
    hubBack: "/hubs/purchase",
    railApp: "purchase",
    searchFields: ["name"],
  },
  "purchase/analysis": {
    key: "purchase/analysis",
    path: "/lists/purchase/analysis",
    title: "Análisis de compras",
    hint: "Líneas del reporte de compras",
    model: "purchase.report",
    domain: [],
    fields: [
      "date_order",
      "product_id",
      "partner_id",
      "user_id",
      "qty_ordered",
      "price_total",
      "state",
    ],
    columns: [
      { key: "date_order", label: "Fecha" },
      { key: "product_id", label: "Producto" },
      { key: "partner_id", label: "Proveedor" },
      { key: "user_id", label: "Comprador" },
      { key: "qty_ordered", label: "Cantidad" },
      { key: "price_total", label: "Total" },
      { key: "state", label: "Estado" },
    ],
    limit: 50,
    order: "date_order desc",
    hubBack: "/hubs/purchase",
    railApp: "purchase",
    searchFields: ["name"],
  },
  "accounting/receivable": {
    key: "accounting/receivable",
    path: "/lists/accounting/receivable",
    title: "Por cobrar",
    hint: "Facturas de cliente pendientes",
    model: "account.move",
    domain: [
      ["move_type", "=", "out_invoice"],
      ["state", "=", "posted"],
      ["payment_state", "in", ["not_paid", "partial", "in_payment"]],
    ],
    fields: [
      "name",
      "partner_id",
      "invoice_date",
      "amount_total",
      "payment_state",
      "state",
    ],
    columns: moveCols(),
    limit: 50,
    order: "invoice_date desc",
    hubBack: "/hubs/accounting",
    railApp: "accounting",
    searchFields: ["name", "ref"],
    detailPath: "/lists/accounting/customer-invoices/:id",
  },
  "accounting/payable": {
    key: "accounting/payable",
    path: "/lists/accounting/payable",
    title: "Por pagar",
    hint: "Facturas de proveedor pendientes",
    model: "account.move",
    domain: [
      ["move_type", "=", "in_invoice"],
      ["state", "=", "posted"],
      ["payment_state", "in", ["not_paid", "partial", "in_payment"]],
    ],
    fields: [
      "name",
      "partner_id",
      "invoice_date",
      "amount_total",
      "payment_state",
      "state",
    ],
    columns: moveCols(),
    limit: 50,
    order: "invoice_date desc",
    hubBack: "/hubs/accounting",
    railApp: "accounting",
    searchFields: ["name", "ref"],
    detailPath: "/lists/accounting/vendor-bills/:id",
  },
  "accounting/drafts": {
    key: "accounting/drafts",
    path: "/lists/accounting/drafts",
    title: "Borradores",
    hint: "Facturas sin publicar",
    model: "account.move",
    domain: [
      ["state", "=", "draft"],
      ["move_type", "in", ["out_invoice", "in_invoice"]],
    ],
    fields: [
      "name",
      "partner_id",
      "invoice_date",
      "amount_total",
      "payment_state",
      "state",
      "move_type",
    ],
    columns: [
      ...moveCols(),
      { key: "move_type", label: "Tipo" },
    ],
    limit: 50,
    order: "id desc",
    hubBack: "/hubs/accounting",
    railApp: "accounting",
    searchFields: ["name", "ref"],
    detailPath: "/lists/accounting/drafts/:id",
  },
  "accounting/customer-invoices": {
    key: "accounting/customer-invoices",
    path: "/lists/accounting/customer-invoices",
    title: "Facturas de cliente",
    hint: "FC emitidas",
    model: "account.move",
    domain: [["move_type", "=", "out_invoice"]],
    fields: [
      "name",
      "partner_id",
      "invoice_date",
      "amount_total",
      "payment_state",
      "state",
    ],
    columns: moveCols(),
    limit: 50,
    order: "invoice_date desc",
    hubBack: "/hubs/accounting",
    railApp: "accounting",
    searchFields: ["name", "ref"],
    detailPath: "/lists/accounting/customer-invoices/:id",
  },
  "accounting/vendor-bills": {
    key: "accounting/vendor-bills",
    path: "/lists/accounting/vendor-bills",
    title: "Facturas de proveedor",
    hint: "FP recibidas",
    model: "account.move",
    domain: [["move_type", "=", "in_invoice"]],
    fields: [
      "name",
      "partner_id",
      "invoice_date",
      "amount_total",
      "payment_state",
      "state",
    ],
    columns: moveCols(),
    limit: 50,
    order: "invoice_date desc",
    hubBack: "/hubs/accounting",
    railApp: "accounting",
    searchFields: ["name", "ref"],
    detailPath: "/lists/accounting/vendor-bills/:id",
  },
  "accounting/credit-notes": {
    key: "accounting/credit-notes",
    path: "/lists/accounting/credit-notes",
    title: "Notas de crédito",
    hint: "NC a clientes",
    model: "account.move",
    domain: [["move_type", "=", "out_refund"]],
    fields: [
      "name",
      "partner_id",
      "invoice_date",
      "amount_total",
      "payment_state",
      "state",
    ],
    columns: moveCols(),
    limit: 50,
    order: "invoice_date desc",
    hubBack: "/hubs/accounting",
    railApp: "accounting",
    searchFields: ["name", "ref"],
    detailPath: "/lists/accounting/credit-notes/:id",
  },
  "accounting/vendor-refunds": {
    key: "accounting/vendor-refunds",
    path: "/lists/accounting/vendor-refunds",
    title: "Notas de crédito proveedor",
    hint: "NC de proveedores",
    model: "account.move",
    domain: [["move_type", "=", "in_refund"]],
    fields: [
      "name",
      "partner_id",
      "invoice_date",
      "amount_total",
      "payment_state",
      "state",
    ],
    columns: moveCols(),
    limit: 50,
    order: "invoice_date desc",
    hubBack: "/hubs/accounting",
    railApp: "accounting",
    searchFields: ["name", "ref"],
    detailPath: "/lists/accounting/vendor-refunds/:id",
  },
  "accounting/payments": {
    key: "accounting/payments",
    path: "/lists/accounting/payments",
    title: "Pagos registrados",
    hint: "Pagos publicados",
    model: "account.payment",
    domain: [["state", "=", "posted"]],
    fields: ["name", "partner_id", "amount", "date", "state"],
    columns: [
      { key: "name", label: "Número" },
      { key: "partner_id", label: "Contacto" },
      { key: "amount", label: "Importe" },
      { key: "date", label: "Fecha" },
      { key: "state", label: "Estado" },
    ],
    limit: 50,
    order: "date desc",
    hubBack: "/hubs/accounting",
    railApp: "accounting",
    searchFields: ["name"],
    detailPath: "/lists/accounting/payments/:id",
  },
  "accounting/journals": {
    key: "accounting/journals",
    path: "/lists/accounting/journals",
    title: "Diarios contables",
    hint: "Libros contables",
    model: "account.journal",
    domain: [],
    fields: ["name", "code", "type"],
    columns: [
      { key: "name", label: "Nombre" },
      { key: "code", label: "Código" },
      { key: "type", label: "Tipo" },
    ],
    limit: 50,
    order: "code asc",
    hubBack: "/hubs/accounting",
    railApp: "accounting",
    searchFields: ["name", "code"],
    detailPath: "/lists/accounting/journals/:id",
  },
  "accounting/accounts": {
    key: "accounting/accounts",
    path: "/lists/accounting/accounts",
    title: "Plan de cuentas",
    hint: "Cuentas contables",
    model: "account.account",
    domain: [],
    fields: ["code", "name", "account_type"],
    columns: [
      { key: "code", label: "Código" },
      { key: "name", label: "Nombre" },
      { key: "account_type", label: "Tipo" },
    ],
    limit: 50,
    order: "code asc",
    hubBack: "/hubs/accounting",
    railApp: "accounting",
    searchFields: ["name", "code"],
    detailPath: "/lists/accounting/accounts/:id",
  },
  "accounting/taxes": {
    key: "accounting/taxes",
    path: "/lists/accounting/taxes",
    title: "Impuestos",
    hint: "Impuestos configurados",
    model: "account.tax",
    domain: [],
    fields: ["name", "amount", "type_tax_use"],
    columns: [
      { key: "name", label: "Nombre" },
      { key: "amount", label: "Alícuota" },
      { key: "type_tax_use", label: "Uso" },
    ],
    limit: 50,
    order: "name asc",
    hubBack: "/hubs/accounting",
    railApp: "accounting",
    searchFields: ["name"],
    detailPath: "/lists/accounting/taxes/:id",
  },
  "accounting/payment-terms": {
    key: "accounting/payment-terms",
    path: "/lists/accounting/payment-terms",
    title: "Plazos de pago",
    hint: "Condiciones de pago contables",
    model: "account.payment.term",
    domain: [],
    fields: ["name", "note", "active"],
    columns: [
      { key: "name", label: "Nombre" },
      { key: "note", label: "Notas" },
      { key: "active", label: "Activo" },
    ],
    limit: 50,
    order: "name asc",
    hubBack: "/hubs/accounting",
    railApp: "accounting",
    searchFields: ["name"],
    detailPath: "/lists/accounting/payment-terms/:id",
  },
  "accounting/move-lines": {
    key: "accounting/move-lines",
    path: "/lists/accounting/move-lines",
    title: "Apuntes contables",
    hint: "Líneas de asientos publicados",
    model: "account.move.line",
    domain: [["parent_state", "=", "posted"]],
    fields: ["name", "account_id", "partner_id", "debit", "credit", "date"],
    columns: [
      { key: "date", label: "Fecha" },
      { key: "name", label: "Etiqueta" },
      { key: "account_id", label: "Cuenta" },
      { key: "partner_id", label: "Contacto" },
      { key: "debit", label: "Debe" },
      { key: "credit", label: "Haber" },
    ],
    limit: 50,
    order: "date desc, id desc",
    hubBack: "/hubs/accounting",
    railApp: "accounting",
    searchFields: ["name"],
  },
  "accounting/factura-web": {
    key: "accounting/factura-web",
    path: "/lists/accounting/factura-web",
    title: "Factura Web",
    hint: "Puente manual de facturación fiscal",
    model: "servigas.integration",
    domain: [
      ["integration_type", "=", "factura_web"],
      ["status", "=", "active"],
    ],
    fields: ["name", "integration_type", "status"],
    columns: integrationCols(),
    limit: 50,
    order: "name asc",
    hubBack: "/hubs/accounting",
    railApp: "accounting",
    searchFields: ["name"],
  },
  "accounting/invoice-analysis": {
    key: "accounting/invoice-analysis",
    path: "/lists/accounting/invoice-analysis",
    title: "Análisis de facturas",
    hint: "Líneas del reporte de facturas",
    model: "account.invoice.report",
    domain: [],
    fields: [
      "invoice_date",
      "product_id",
      "partner_id",
      "quantity",
      "price_subtotal",
      "state",
      "move_type",
    ],
    columns: [
      { key: "invoice_date", label: "Fecha" },
      { key: "partner_id", label: "Contacto" },
      { key: "product_id", label: "Producto" },
      { key: "quantity", label: "Cantidad" },
      { key: "price_subtotal", label: "Subtotal" },
      { key: "move_type", label: "Tipo" },
      { key: "state", label: "Estado" },
    ],
    limit: 50,
    order: "invoice_date desc",
    hubBack: "/hubs/accounting",
    railApp: "accounting",
    searchFields: ["name"],
  },
  "integrations/all": {
    key: "integrations/all",
    path: "/lists/integrations",
    title: "Integraciones",
    hint: "Factura Web y portales de proveedores",
    model: "servigas.integration",
    domain: [],
    fields: ["name", "integration_type", "status"],
    columns: integrationCols(),
    limit: 50,
    order: "name asc",
    hubBack: "/",
    railApp: "home",
    searchFields: ["name"],
  },
};

const MEDIA_MODELS = new Set(["product.template", "product.product"]);
const MEDIA_FIELDS = new Set(["image_128", "image_256"]);

export function getRecordListDef(key: string): RecordListDef | null {
  if (key in LISTS) return LISTS[key as RecordListKey];
  // Pretty URL alias: /lists/integrations → integrations/all
  if (key === "integrations") return LISTS["integrations/all"];
  return null;
}

export function listRecordListKeys(): RecordListKey[] {
  return Object.keys(LISTS) as RecordListKey[];
}

export function buildDetailPath(def: RecordListDef, id: number): string | null {
  if (!def.detailPath) return null;
  return def.detailPath.replace(":id", String(id));
}

export function mediaPath(
  model: string,
  id: number,
  field: string
): string | null {
  if (!MEDIA_MODELS.has(model) || !MEDIA_FIELDS.has(field)) return null;
  return `/api/media/${encodeURIComponent(model)}/${id}/${encodeURIComponent(field)}`;
}

export function isAllowedMedia(model: string, field: string): boolean {
  return MEDIA_MODELS.has(model) && MEDIA_FIELDS.has(field);
}

function domainText(domain: unknown): string {
  try {
    return JSON.stringify(domain ?? []);
  } catch {
    return "";
  }
}

function domainHas(domain: unknown, needle: string): boolean {
  return domainText(domain).includes(needle);
}

function isEmptyDomain(domain: unknown): boolean {
  if (domain == null) return true;
  return Array.isArray(domain) && domain.length === 0;
}

function isAmbiguousDomain(model: string, domain: unknown): boolean {
  if (isEmptyDomain(domain)) return true;
  const text = domainText(domain);
  if (model === "product.product" && !domainHas(domain, "qty_available") && !domainHas(domain, "is_storable")) {
    return true;
  }
  if (model === "sale.order" && !domainHas(domain, "invoice_status") && !domainHas(domain, "state")) {
    return true;
  }
  if (model === "res.partner" && !domainHas(domain, "customer_rank") && !domainHas(domain, "supplier_rank") && !domainHas(domain, "sale_order") && !domainHas(domain, "purchase_order")) {
    return true;
  }
  if (model === "servigas.integration" && !domainHas(domain, "integration_type")) {
    return true;
  }
  if (model === "stock.picking" && !domainHas(domain, "state") && !domainHas(domain, "picking_type")) {
    return true;
  }
  if (model === "account.move" && text === "[]") return true;
  if (
    model === "sale.report" ||
    model === "purchase.report" ||
    model === "account.invoice.report"
  ) {
    return true;
  }
  return false;
}

type LabelRule = {
  model: string;
  patterns: RegExp[];
  path: string;
};

/** Card labels from Odoo hubs when act_window domain is missing or generic. */
const LABEL_RULES: LabelRule[] = [
  {
    model: "product.product",
    patterns: [/stock almacenable/i, /informe de stock/i],
    path: "/lists/inventory/stockables",
  },
  {
    model: "product.product",
    patterns: [/variante/i, /sku/i],
    path: "/lists/inventory/variants",
  },
  {
    model: "product.product",
    patterns: [/sin stock/i],
    path: "/lists/inventory/no-stock",
  },
  {
    model: "product.template",
    patterns: [/sin precio/i],
    path: "/lists/inventory/no-price",
  },
  {
    model: "stock.picking",
    patterns: [/todas las transferencias/i],
    path: "/lists/inventory/transfers-all",
  },
  {
    model: "stock.picking",
    patterns: [/transferencia/i, /recepci/i, /entrega/i],
    path: "/lists/inventory/transfers",
  },
  {
    model: "stock.quant",
    patterns: [/quant/i, /existencia/i],
    path: "/lists/inventory/quants",
  },
  {
    model: "stock.warehouse.orderpoint",
    patterns: [/reabastec/i, /orderpoint/i],
    path: "/lists/inventory/orderpoints",
  },
  {
    model: "stock.location",
    patterns: [/ubicaci/i],
    path: "/lists/inventory/locations",
  },
  {
    model: "stock.warehouse",
    patterns: [/almacen/i],
    path: "/lists/inventory/warehouses",
  },
  {
    model: "stock.picking.type",
    patterns: [/tipo.*operaci/i, /picking type/i],
    path: "/lists/inventory/picking-types",
  },
  {
    model: "sale.order",
    patterns: [/por facturar/i, /a facturar/i],
    path: "/lists/sales/to-invoice",
  },
  {
    model: "sale.order",
    patterns: [/upsell/i],
    path: "/lists/sales/upselling",
  },
  {
    model: "sale.order",
    patterns: [/cotizaci/i, /borrador/i],
    path: "/lists/sales/quotations",
  },
  {
    model: "sale.order",
    patterns: [/pedido/i, /venta/i],
    path: "/lists/sales/orders",
  },
  {
    model: "pos.order",
    patterns: [/pos/i, /mostrador/i],
    path: "/lists/sales/pos-orders",
  },
  {
    model: "res.partner",
    patterns: [/con pedidos de venta/i, /con pedidos/i],
    path: "/lists/sales/customers-with-orders",
  },
  {
    model: "res.partner",
    patterns: [/proveedor/i],
    path: "/lists/purchase/vendors",
  },
  {
    model: "res.partner",
    patterns: [/con .*rdenes de compra/i, /con oc/i],
    path: "/lists/purchase/vendors-with-po",
  },
  {
    model: "res.partner",
    patterns: [/cliente/i],
    path: "/lists/sales/customers",
  },
  {
    model: "crm.team",
    patterns: [/equipo/i],
    path: "/lists/sales/teams",
  },
  {
    model: "crm.tag",
    patterns: [/etiqueta/i, /tag/i],
    path: "/lists/sales/tags",
  },
  {
    model: "account.payment.term",
    patterns: [/plazo/i],
    path: "/lists/sales/payment-terms",
  },
  {
    model: "purchase.order",
    patterns: [/borrador.*rfq/i, /rfq.*borrador/i],
    path: "/lists/purchase/rfq-draft",
  },
  {
    model: "purchase.order",
    patterns: [/rfq enviada/i, /enviada/i],
    path: "/lists/purchase/rfq-sent",
  },
  {
    model: "purchase.order",
    patterns: [/recepci.n parcial/i, /parcial/i],
    path: "/lists/purchase/partial",
  },
  {
    model: "purchase.order",
    patterns: [/por recibir/i],
    path: "/lists/purchase/to-receive",
  },
  {
    model: "purchase.order",
    patterns: [/por aprobar/i],
    path: "/lists/purchase/to-approve",
  },
  {
    model: "purchase.order",
    patterns: [/solicitud/i, /rfq/i, /cotizaci.n/i],
    path: "/lists/purchase/rfq",
  },
  {
    model: "purchase.order",
    patterns: [/historial/i, /l.nea/i],
    path: "/lists/purchase/order-lines",
  },
  {
    model: "purchase.order.line",
    patterns: [/l.nea/i, /historial/i],
    path: "/lists/purchase/order-lines",
  },
  {
    model: "product.supplierinfo",
    patterns: [/lista.*precio/i, /supplierinfo/i],
    path: "/lists/purchase/supplierinfo",
  },
  {
    model: "uom.uom",
    patterns: [/unidad/i, /medida/i],
    path: "/lists/purchase/uom",
  },
  {
    model: "account.move",
    patterns: [/nota.*cr.dito.*proveedor/i, /nc.*proveedor/i],
    path: "/lists/accounting/vendor-refunds",
  },
  {
    model: "account.move",
    patterns: [/nota.*cr.dito/i],
    path: "/lists/accounting/credit-notes",
  },
  {
    model: "account.move",
    patterns: [/factura.*proveedor/i, /fp/i],
    path: "/lists/accounting/vendor-bills",
  },
  {
    model: "account.move",
    patterns: [/factura.*cliente/i, /fc/i],
    path: "/lists/accounting/customer-invoices",
  },
  {
    model: "account.move",
    patterns: [/por pagar/i],
    path: "/lists/accounting/payable",
  },
  {
    model: "account.move",
    patterns: [/por cobrar/i],
    path: "/lists/accounting/receivable",
  },
  {
    model: "account.move",
    patterns: [/borrador/i],
    path: "/lists/accounting/drafts",
  },
  {
    model: "account.move.line",
    patterns: [/apunte/i, /l.nea/i],
    path: "/lists/accounting/move-lines",
  },
  {
    model: "account.journal",
    patterns: [/diario/i, /tablero/i],
    path: "/lists/accounting/journals",
  },
  {
    model: "account.account",
    patterns: [/plan de cuentas/i, /cuenta/i],
    path: "/lists/accounting/accounts",
  },
  {
    model: "account.tax",
    patterns: [/impuesto/i],
    path: "/lists/accounting/taxes",
  },
  {
    model: "servigas.integration",
    patterns: [/factura web/i],
    path: "/lists/accounting/factura-web",
  },
  {
    model: "servigas.integration",
    patterns: [/portal/i],
    path: "/lists/purchase/portals",
  },
  {
    model: "servigas.integration",
    patterns: [/integraci/i],
    path: "/lists/integrations",
  },
  {
    model: "sale.report",
    patterns: [/por producto/i],
    path: "/lists/sales/by-product",
  },
  {
    model: "sale.report",
    patterns: [/por cliente/i],
    path: "/lists/sales/by-customer",
  },
  {
    model: "sale.report",
    patterns: [/por vendedor/i],
    path: "/lists/sales/by-salesperson",
  },
  {
    model: "sale.report",
    patterns: [/an.lisis/i, /venta/i],
    path: "/lists/sales/analysis",
  },
  {
    model: "purchase.report",
    patterns: [/an.lisis/i, /compra/i],
    path: "/lists/purchase/analysis",
  },
  {
    model: "account.invoice.report",
    patterns: [/an.lisis/i, /factura/i],
    path: "/lists/accounting/invoice-analysis",
  },
];

function resolveLabelPath(
  model: string,
  label: string,
  domain: unknown
): string | null {
  const normalized = label.trim().toLowerCase();
  if (!normalized) return null;
  if (!isEmptyDomain(domain) && !isAmbiguousDomain(model, domain)) return null;

  for (const rule of LABEL_RULES) {
    if (rule.model !== model) continue;
    if (rule.patterns.some((pattern) => pattern.test(normalized))) {
      return rule.path;
    }
  }
  return null;
}

type RouteRule = {
  model: string;
  path: string;
  /** More specific rules first; first match wins within model group */
  match?: (domain: unknown) => boolean;
};

const ROUTE_RULES: RouteRule[] = [
  {
    model: "product.template",
    path: "/lists/inventory/no-price",
    match: (d) => domainHas(d, "list_price"),
  },
  {
    model: "product.template",
    path: "/lists/inventory/products",
  },
  {
    model: "product.product",
    path: "/lists/inventory/no-stock",
    match: (d) => domainHas(d, "qty_available"),
  },
  {
    model: "product.product",
    path: "/lists/inventory/stockables",
    match: (d) => domainHas(d, "is_storable") && !domainHas(d, "qty_available"),
  },
  {
    model: "product.product",
    path: "/lists/inventory/variants",
  },
  {
    model: "stock.picking",
    path: "/lists/inventory/transfers",
    match: (d) =>
      domainHas(d, "confirmed") ||
      domainHas(d, "assigned") ||
      domainHas(d, "waiting"),
  },
  {
    model: "stock.picking",
    path: "/lists/inventory/transfers-all",
  },
  {
    model: "stock.quant",
    path: "/lists/inventory/quants",
  },
  {
    model: "stock.warehouse.orderpoint",
    path: "/lists/inventory/orderpoints",
  },
  {
    model: "stock.location",
    path: "/lists/inventory/locations",
  },
  {
    model: "stock.warehouse",
    path: "/lists/inventory/warehouses",
  },
  {
    model: "stock.picking.type",
    path: "/lists/inventory/picking-types",
  },
  {
    model: "product.category",
    path: "/lists/inventory/categories",
  },
  {
    model: "sale.order",
    path: "/lists/sales/to-invoice",
    match: (d) =>
      domainHas(d, "to invoice") ||
      (domainHas(d, "invoice_status") && !domainHas(d, "upselling")),
  },
  {
    model: "sale.order",
    path: "/lists/sales/upselling",
    match: (d) => domainHas(d, "upselling"),
  },
  {
    model: "sale.order",
    path: "/lists/sales/quotations",
    match: (d) =>
      domainHas(d, "draft") ||
      domainHas(d, "sent") ||
      domainHas(d, '"state","in"'),
  },
  {
    model: "sale.order",
    path: "/lists/sales/orders",
  },
  {
    model: "pos.order",
    path: "/lists/sales/pos-orders",
  },
  {
    model: "res.partner",
    path: "/lists/sales/customers-with-orders",
    match: (d) => domainHas(d, "sale_order_count"),
  },
  {
    model: "res.partner",
    path: "/lists/purchase/vendors-with-po",
    match: (d) => domainHas(d, "purchase_order_count"),
  },
  {
    model: "res.partner",
    path: "/lists/sales/customers",
    match: (d) => domainHas(d, "customer_rank") || domainHas(d, "sale_order"),
  },
  {
    model: "res.partner",
    path: "/lists/purchase/vendors",
    match: (d) => domainHas(d, "supplier_rank") || domainHas(d, "purchase_order"),
  },
  {
    model: "res.partner",
    path: "/lists/sales/customers",
  },
  {
    model: "crm.team",
    path: "/lists/sales/teams",
  },
  {
    model: "crm.tag",
    path: "/lists/sales/tags",
  },
  {
    model: "account.payment.term",
    path: "/lists/sales/payment-terms",
  },
  {
    model: "purchase.order",
    path: "/lists/purchase/to-receive",
    match: (d) => domainHas(d, "receipt_status") && domainHas(d, "pending"),
  },
  {
    model: "purchase.order",
    path: "/lists/purchase/partial",
    match: (d) => domainHas(d, "receipt_status") && domainHas(d, "partial"),
  },
  {
    model: "purchase.order",
    path: "/lists/purchase/to-approve",
    match: (d) => domainHas(d, "to approve"),
  },
  {
    model: "purchase.order",
    path: "/lists/purchase/rfq-draft",
    match: (d) => domainHas(d, '"draft"') && !domainHas(d, '"state","in"'),
  },
  {
    model: "purchase.order",
    path: "/lists/purchase/rfq-sent",
    match: (d) => domainHas(d, '"sent"') && !domainHas(d, '"state","in"'),
  },
  {
    model: "purchase.order",
    path: "/lists/purchase/rfq",
    match: (d) =>
      domainHas(d, "draft") ||
      domainHas(d, "sent") ||
      (domainHas(d, '"state","in"') && !domainHas(d, "purchase")),
  },
  {
    model: "purchase.order",
    path: "/lists/purchase/orders",
  },
  {
    model: "purchase.order.line",
    path: "/lists/purchase/order-lines",
  },
  {
    model: "product.supplierinfo",
    path: "/lists/purchase/supplierinfo",
  },
  {
    model: "uom.uom",
    path: "/lists/purchase/uom",
  },
  {
    model: "account.move",
    path: "/lists/accounting/drafts",
    match: (d) => domainHas(d, '"draft"'),
  },
  {
    model: "account.move",
    path: "/lists/accounting/credit-notes",
    match: (d) => domainHas(d, "out_refund"),
  },
  {
    model: "account.move",
    path: "/lists/accounting/vendor-refunds",
    match: (d) => domainHas(d, "in_refund"),
  },
  {
    model: "account.move",
    path: "/lists/accounting/payable",
    match: (d) =>
      domainHas(d, "in_invoice") &&
      (domainHas(d, "payment_state") || domainHas(d, "not_paid")),
  },
  {
    model: "account.move",
    path: "/lists/accounting/receivable",
    match: (d) =>
      domainHas(d, "out_invoice") &&
      (domainHas(d, "payment_state") || domainHas(d, "not_paid")),
  },
  {
    model: "account.move",
    path: "/lists/accounting/vendor-bills",
    match: (d) => domainHas(d, "in_invoice"),
  },
  {
    model: "account.move",
    path: "/lists/accounting/customer-invoices",
    match: (d) => domainHas(d, "out_invoice"),
  },
  {
    model: "account.move",
    path: "/lists/accounting/receivable",
  },
  {
    model: "account.move.line",
    path: "/lists/accounting/move-lines",
  },
  {
    model: "account.payment",
    path: "/lists/accounting/payments",
  },
  {
    model: "account.journal",
    path: "/lists/accounting/journals",
  },
  {
    model: "account.account",
    path: "/lists/accounting/accounts",
  },
  {
    model: "account.tax",
    path: "/lists/accounting/taxes",
  },
  {
    model: "servigas.integration",
    path: "/lists/purchase/portals",
    match: (d) => domainHas(d, "supplier_portal"),
  },
  {
    model: "servigas.integration",
    path: "/lists/accounting/factura-web",
    match: (d) => domainHas(d, "factura_web"),
  },
  {
    model: "servigas.integration",
    path: "/lists/integrations",
  },
  {
    model: "sale.report",
    path: "/lists/sales/analysis",
  },
  {
    model: "purchase.report",
    path: "/lists/purchase/analysis",
  },
  {
    model: "account.invoice.report",
    path: "/lists/accounting/invoice-analysis",
  },
];

export type RecordListResolveHints = {
  label?: string;
};

/** Map a hub/launcher act_window action onto an allowlisted Astro list. */
export function resolveRecordListPath(
  action: OdooAction,
  hints?: RecordListResolveHints
): string | null {
  if (!action || typeof action !== "object") return null;
  if (action.type !== "ir.actions.act_window") return null;

  const model = String(action.res_model || "");
  const domain = action.domain;
  const label = hints?.label ?? "";

  if (label) {
    const byLabel = resolveLabelPath(model, label, domain);
    if (byLabel) return byLabel;
  }

  const candidates = ROUTE_RULES.filter((rule) => rule.model === model);
  for (const rule of candidates) {
    if (!rule.match || rule.match(domain)) {
      return rule.path;
    }
  }
  return null;
}

export type RecordListQuery = {
  q?: string;
  page?: number;
};

export function buildSearchDomain(
  def: RecordListDef,
  q: string | undefined
): unknown[] {
  const base = [...def.domain];
  const term = (q || "").trim();
  if (!term || !def.searchFields?.length) return base;

  const clauses = def.searchFields.map((field) => [field, "ilike", term]);
  if (clauses.length === 1) {
    return [...base, clauses[0]];
  }
  const ors = Array.from({ length: clauses.length - 1 }, () => "|");
  return [...base, ...ors, ...clauses];
}
