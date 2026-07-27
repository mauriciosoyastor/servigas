import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  AREA_LABELS,
  canonicalizeAreaLabel,
} from "../src/lib/shell/ui-glossary.ts";
import { HUB_LABELS } from "../src/lib/shell/hub-nav.ts";
import { RAIL_ITEMS } from "../src/lib/shell/rail-nav.ts";
import { getRecordListDef } from "../src/lib/shell/record-lists.ts";
import { labelOdooSelection } from "../src/lib/shell/odoo-selection-labels.ts";

describe("ui glossary (canonical labels)", () => {
  it("maps legacy module names to work language", () => {
    assert.equal(canonicalizeAreaLabel("Inventario"), "Stock");
    assert.equal(canonicalizeAreaLabel("Facturación"), "Cobros");
    assert.equal(canonicalizeAreaLabel("Contabilidad"), "Cobros");
    assert.equal(canonicalizeAreaLabel("Punto de venta"), "Mostrador");
    assert.equal(canonicalizeAreaLabel("POS"), "Mostrador");
  });

  it("keeps hub and rail aligned to AREA_LABELS", () => {
    assert.equal(HUB_LABELS.inventory, AREA_LABELS.inventory);
    assert.equal(HUB_LABELS.accounting, AREA_LABELS.accounting);
    assert.equal(HUB_LABELS.sales, AREA_LABELS.sales);
    assert.equal(HUB_LABELS.purchase, AREA_LABELS.purchase);
    const byApp = Object.fromEntries(RAIL_ITEMS.map((i) => [i.app, i.label]));
    assert.equal(byApp.inventory, AREA_LABELS.inventory);
    assert.equal(byApp.accounting, AREA_LABELS.accounting);
    assert.equal(byApp.pos, AREA_LABELS.pos);
  });

  it("uses Pedidos a proveedor for RFQ lists and Por facturar for invoice status", () => {
    assert.equal(getRecordListDef("purchase/solicitudes")?.title, "Pedidos a proveedor");
    assert.equal(getRecordListDef("sales/to-invoice")?.title, "Por facturar");
    assert.equal(labelOdooSelection("state", "to_invoice"), "Por facturar");
  });

  it("labels partners as Cliente in sales and Proveedor in purchase", () => {
    const salesPartner = getRecordListDef("sales/orders")?.columns.find(
      (c) => c.key === "partner_id"
    );
    const purchasePartner = getRecordListDef("purchase/orders")?.columns.find(
      (c) => c.key === "partner_id"
    );
    const customerInv = getRecordListDef("accounting/customer-invoices")?.columns.find(
      (c) => c.key === "partner_id"
    );
    const vendorBill = getRecordListDef("accounting/vendor-bills")?.columns.find(
      (c) => c.key === "partner_id"
    );
    assert.equal(salesPartner?.label, "Cliente");
    assert.equal(purchasePartner?.label, "Proveedor");
    assert.equal(customerInv?.label, "Cliente");
    assert.equal(vendorBill?.label, "Proveedor");
  });

  it("uses Variantes and Existencias without jargon", () => {
    assert.equal(getRecordListDef("inventory/variants")?.title, "Variantes");
    assert.equal(
      getRecordListDef("inventory/existencias")?.title,
      "Existencias por ubicación"
    );
    assert.equal(
      getRecordListDef("inventory/warehouses")?.hint,
      "Almacenes configurados"
    );
  });

  it("uses plain work copy for columns, UoM, upselling and aging titles", () => {
    const customerCols = getRecordListDef("sales/customers")?.columns || [];
    assert.equal(
      customerCols.find((c) => c.key === "sg_invoice_dest")?.label,
      "Factura como"
    );
    assert.equal(
      customerCols.find((c) => c.key === "sg_doc_type_short")?.label,
      "Tipo sugerido"
    );
    assert.equal(
      getRecordListDef("purchase/uom")?.hint,
      "Unidades de medida del catálogo"
    );
    assert.equal(
      getRecordListDef("sales/upselling")?.title,
      "Pedidos con más por facturar"
    );
    assert.equal(getRecordListDef("accounting/receivable-due-today")?.title, "Vence hoy");
    assert.equal(
      getRecordListDef("accounting/receivable-due-today")?.hint,
      "Por cobrar: facturas de cliente que vencen hoy"
    );
    assert.equal(getRecordListDef("accounting/payable-overdue")?.title, "Vencidas");
    assert.equal(
      getRecordListDef("accounting/payable-overdue")?.hint,
      "Por pagar: facturas de proveedor con vencimiento pasado"
    );
  });
});
