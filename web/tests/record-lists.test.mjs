import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildSearchDomain,
  getRecordListDef,
  resolveRecordListPath,
} from "../src/lib/shell/record-lists.ts";

describe("record-lists allowlist", () => {
  it("returns inventory products definition with image and detail", () => {
    const def = getRecordListDef("inventory/products");
    assert.ok(def);
    assert.equal(def.model, "product.template");
    assert.equal(def.imageField, "image_128");
    assert.match(def.detailPath, /:id/);
  });

  it("rejects unknown keys", () => {
    assert.equal(getRecordListDef("inventory/unknown"), null);
  });

  it("aliases /lists/integrations to integrations/all", () => {
    const def = getRecordListDef("integrations");
    assert.ok(def);
    assert.equal(def.key, "integrations/all");
    assert.equal(def.path, "/lists/integrations");
  });

  it("maps product.template actions to products", () => {
    assert.equal(
      resolveRecordListPath({
        type: "ir.actions.act_window",
        res_model: "product.template",
      }),
      "/lists/inventory/products"
    );
  });

  it("maps product.product without qty domain to variants", () => {
    assert.equal(
      resolveRecordListPath({
        type: "ir.actions.act_window",
        res_model: "product.product",
      }),
      "/lists/inventory/variants"
    );
  });

  it("routes empty-domain stock cards by label to stockables", () => {
    assert.equal(
      resolveRecordListPath(
        {
          type: "ir.actions.act_window",
          res_model: "product.product",
          domain: [],
        },
        { label: "Stock almacenable" }
      ),
      "/lists/inventory/stockables"
    );
    assert.equal(
      resolveRecordListPath(
        {
          type: "ir.actions.act_window",
          res_model: "product.product",
          domain: [],
        },
        { label: "Informe de stock" }
      ),
      "/lists/inventory/stockables"
    );
  });

  it("routes empty-domain sale.order by label to to-invoice", () => {
    assert.equal(
      resolveRecordListPath(
        {
          type: "ir.actions.act_window",
          res_model: "sale.order",
          domain: [],
        },
        { label: "Por facturar" }
      ),
      "/lists/sales/to-invoice"
    );
    assert.equal(
      resolveRecordListPath(
        {
          type: "ir.actions.act_window",
          res_model: "sale.order",
          domain: [],
        },
        { label: "A facturar" }
      ),
      "/lists/sales/to-invoice"
    );
  });

  it("routes empty-domain res.partner Proveedores to vendors", () => {
    assert.equal(
      resolveRecordListPath(
        {
          type: "ir.actions.act_window",
          res_model: "res.partner",
          domain: [],
        },
        { label: "Proveedores" }
      ),
      "/lists/purchase/vendors"
    );
  });

  it("routes empty-domain servigas.integration Factura Web to factura-web", () => {
    assert.equal(
      resolveRecordListPath(
        {
          type: "ir.actions.act_window",
          res_model: "servigas.integration",
          domain: [],
        },
        { label: "Factura Web" }
      ),
      "/lists/accounting/factura-web"
    );
  });

  it("maps product.product with qty domain to no-stock", () => {
    assert.equal(
      resolveRecordListPath({
        type: "ir.actions.act_window",
        res_model: "product.product",
        domain: [
          ["is_storable", "=", true],
          ["qty_available", "<=", 0],
        ],
      }),
      "/lists/inventory/no-stock"
    );
  });

  it("maps storable product.product without qty to stockables", () => {
    assert.equal(
      resolveRecordListPath({
        type: "ir.actions.act_window",
        res_model: "product.product",
        domain: [["is_storable", "=", true]],
      }),
      "/lists/inventory/stockables"
    );
  });

  it("maps stock.picking with pending states to transfers", () => {
    assert.equal(
      resolveRecordListPath({
        type: "ir.actions.act_window",
        res_model: "stock.picking",
        domain: [
          ["state", "in", ["confirmed", "assigned", "waiting"]],
        ],
      }),
      "/lists/inventory/transfers"
    );
  });

  it("maps stock.picking without domain to transfers-all", () => {
    assert.equal(
      resolveRecordListPath({
        type: "ir.actions.act_window",
        res_model: "stock.picking",
      }),
      "/lists/inventory/transfers-all"
    );
  });

  it("maps sales summary cards", () => {
    assert.equal(
      resolveRecordListPath({
        type: "ir.actions.act_window",
        res_model: "sale.order",
        domain: [["state", "=", "sale"]],
      }),
      "/lists/sales/orders"
    );
    assert.equal(
      resolveRecordListPath({
        type: "ir.actions.act_window",
        res_model: "sale.order",
        domain: [["state", "in", ["draft", "sent"]]],
      }),
      "/lists/sales/quotations"
    );
    assert.equal(
      resolveRecordListPath({
        type: "ir.actions.act_window",
        res_model: "sale.order",
        domain: [["invoice_status", "=", "to invoice"]],
      }),
      "/lists/sales/to-invoice"
    );
    assert.equal(
      resolveRecordListPath({
        type: "ir.actions.act_window",
        res_model: "res.partner",
        domain: [["customer_rank", ">", 0]],
      }),
      "/lists/sales/customers"
    );
  });

  it("maps purchase and accounting summary cards", () => {
    assert.equal(
      resolveRecordListPath({
        type: "ir.actions.act_window",
        res_model: "purchase.order",
        domain: [
          ["state", "=", "purchase"],
          ["receipt_status", "=", "pending"],
        ],
      }),
      "/lists/purchase/to-receive"
    );
    assert.equal(
      resolveRecordListPath({
        type: "ir.actions.act_window",
        res_model: "account.move",
        domain: [
          ["move_type", "=", "in_invoice"],
          ["state", "=", "posted"],
          ["payment_state", "in", ["not_paid", "partial", "in_payment"]],
        ],
      }),
      "/lists/accounting/payable"
    );
    assert.equal(
      resolveRecordListPath({
        type: "ir.actions.act_window",
        res_model: "account.move",
        domain: [
          ["state", "=", "draft"],
          ["move_type", "in", ["out_invoice", "in_invoice"]],
        ],
      }),
      "/lists/accounting/drafts"
    );
    assert.equal(
      resolveRecordListPath({
        type: "ir.actions.act_window",
        res_model: "servigas.integration",
        domain: [
          ["integration_type", "=", "factura_web"],
          ["status", "=", "active"],
        ],
      }),
      "/lists/accounting/factura-web"
    );
  });

  it("builds search domain with OR polish notation including barcode", () => {
    const def = getRecordListDef("inventory/products");
    assert.ok(def?.searchFields?.includes("barcode"));
    const domain = buildSearchDomain(def, "calefa");
    assert.deepEqual(domain[0], ["active", "=", true]);
    assert.equal(domain[1], "|");
    assert.equal(domain[2], "|");
    assert.deepEqual(domain[3], ["name", "ilike", "calefa"]);
    assert.deepEqual(domain[4], ["default_code", "ilike", "calefa"]);
    assert.deepEqual(domain[5], ["barcode", "ilike", "calefa"]);
  });

  it("routes empty-domain sale.report cards by label", () => {
    const action = {
      type: "ir.actions.act_window",
      res_model: "sale.report",
      domain: [],
    };
    assert.equal(
      resolveRecordListPath(action, { label: "Análisis de ventas" }),
      "/lists/sales/analysis"
    );
    assert.equal(
      resolveRecordListPath(action, { label: "Ventas por producto" }),
      "/lists/sales/by-product"
    );
    assert.equal(
      resolveRecordListPath(action, { label: "Ventas por cliente" }),
      "/lists/sales/by-customer"
    );
    assert.equal(
      resolveRecordListPath(action, { label: "Ventas por vendedor" }),
      "/lists/sales/by-salesperson"
    );
  });

  it("routes purchase and invoice report cards by label", () => {
    assert.equal(
      resolveRecordListPath(
        {
          type: "ir.actions.act_window",
          res_model: "purchase.report",
          domain: [],
        },
        { label: "Análisis de compras" }
      ),
      "/lists/purchase/analysis"
    );
    assert.equal(
      resolveRecordListPath(
        {
          type: "ir.actions.act_window",
          res_model: "account.invoice.report",
          domain: [],
        },
        { label: "Análisis de facturas" }
      ),
      "/lists/accounting/invoice-analysis"
    );
  });

  it("defines report list models and safe orders", () => {
    assert.equal(getRecordListDef("sales/analysis")?.model, "sale.report");
    assert.equal(getRecordListDef("sales/by-product")?.model, "sale.report");
    assert.equal(getRecordListDef("purchase/analysis")?.model, "purchase.report");
    assert.equal(
      getRecordListDef("accounting/invoice-analysis")?.model,
      "account.invoice.report"
    );
    assert.match(getRecordListDef("sales/analysis").order, /date/i);
  });

  it("exposes detail paths for sale and purchase orders", () => {
    assert.equal(
      getRecordListDef("sales/orders")?.detailPath,
      "/lists/sales/orders/:id"
    );
    assert.equal(
      getRecordListDef("sales/quotations")?.detailPath,
      "/lists/sales/quotations/:id"
    );
    assert.equal(
      getRecordListDef("sales/pos-orders")?.detailPath,
      "/lists/sales/pos-orders/:id"
    );
    assert.equal(
      getRecordListDef("purchase/orders")?.detailPath,
      "/lists/purchase/orders/:id"
    );
  });

  it("exposes detail paths for invoices and customers", () => {
    assert.equal(
      getRecordListDef("accounting/customer-invoices")?.detailPath,
      "/lists/accounting/customer-invoices/:id"
    );
    assert.equal(
      getRecordListDef("accounting/vendor-bills")?.detailPath,
      "/lists/accounting/vendor-bills/:id"
    );
    assert.equal(
      getRecordListDef("accounting/receivable")?.detailPath,
      "/lists/accounting/customer-invoices/:id"
    );
    assert.equal(
      getRecordListDef("accounting/payable")?.detailPath,
      "/lists/accounting/vendor-bills/:id"
    );
    assert.equal(
      getRecordListDef("sales/customers")?.detailPath,
      "/lists/sales/customers/:id"
    );
    assert.equal(
      getRecordListDef("purchase/vendors")?.detailPath,
      "/lists/purchase/vendors/:id"
    );
  });

  it("exposes detail paths for transfers and payments", () => {
    assert.equal(
      getRecordListDef("inventory/transfers")?.detailPath,
      "/lists/inventory/transfers/:id"
    );
    assert.equal(
      getRecordListDef("inventory/transfers-all")?.detailPath,
      "/lists/inventory/transfers/:id"
    );
    assert.equal(
      getRecordListDef("accounting/payments")?.detailPath,
      "/lists/accounting/payments/:id"
    );
  });

  it("exposes detail paths for RFQ, credit notes, drafts and variants", () => {
    assert.equal(
      getRecordListDef("purchase/rfq")?.detailPath,
      "/lists/purchase/orders/:id"
    );
    assert.equal(
      getRecordListDef("purchase/rfq-draft")?.detailPath,
      "/lists/purchase/orders/:id"
    );
    assert.equal(
      getRecordListDef("purchase/to-receive")?.detailPath,
      "/lists/purchase/orders/:id"
    );
    assert.equal(
      getRecordListDef("accounting/credit-notes")?.detailPath,
      "/lists/accounting/credit-notes/:id"
    );
    assert.equal(
      getRecordListDef("accounting/vendor-refunds")?.detailPath,
      "/lists/accounting/vendor-refunds/:id"
    );
    assert.equal(
      getRecordListDef("accounting/drafts")?.detailPath,
      "/lists/accounting/drafts/:id"
    );
    assert.equal(
      getRecordListDef("inventory/variants")?.detailPath,
      "/lists/inventory/variants/:id"
    );
  });

  it("exposes detail paths for master data lists", () => {
    assert.equal(
      getRecordListDef("inventory/locations")?.detailPath,
      "/lists/inventory/locations/:id"
    );
    assert.equal(
      getRecordListDef("inventory/warehouses")?.detailPath,
      "/lists/inventory/warehouses/:id"
    );
    assert.equal(
      getRecordListDef("accounting/journals")?.detailPath,
      "/lists/accounting/journals/:id"
    );
    assert.equal(
      getRecordListDef("accounting/accounts")?.detailPath,
      "/lists/accounting/accounts/:id"
    );
    assert.equal(
      getRecordListDef("sales/teams")?.detailPath,
      "/lists/sales/teams/:id"
    );
  });
});
