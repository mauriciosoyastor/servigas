import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { labelOdooSelection } from "../src/lib/shell/odoo-selection-labels.ts";

describe("labelOdooSelection", () => {
  it("labels pos/sale/move state values in Spanish", () => {
    assert.equal(labelOdooSelection("state", "paid"), "Pagado");
    assert.equal(labelOdooSelection("state", "draft"), "Borrador");
    assert.equal(labelOdooSelection("state", "posted"), "Confirmado");
    assert.equal(labelOdooSelection("state", "done"), "Hecho");
    assert.equal(labelOdooSelection("state", "cancel"), "Cancelado");
    assert.equal(labelOdooSelection("state", "sale"), "Confirmado");
    assert.equal(labelOdooSelection("state", "to_invoice"), "Por facturar");
    assert.equal(labelOdooSelection("state", "purchase"), "Orden de compra");
    assert.equal(labelOdooSelection("state", "invoiced"), "Facturado");
  });

  it("labels payment_state values in Spanish", () => {
    assert.equal(labelOdooSelection("payment_state", "not_paid"), "No pagado");
    assert.equal(labelOdooSelection("payment_state", "partial"), "Parcial");
    assert.equal(labelOdooSelection("payment_state", "paid"), "Pagado");
    assert.equal(labelOdooSelection("payment_state", "in_payment"), "En proceso");
    assert.equal(labelOdooSelection("payment_state", "invoicing_legacy"), "Antiguo");
  });

  it("labels purchase receipt_status values in Spanish", () => {
    assert.equal(labelOdooSelection("receipt_status", "pending"), "Pendiente");
    assert.equal(labelOdooSelection("receipt_status", "partial"), "Parcial");
    assert.equal(labelOdooSelection("receipt_status", "full"), "Completa");
  });

  it("returns original string for unknown keys or values", () => {
    assert.equal(labelOdooSelection("name", "paid"), "paid");
    assert.equal(labelOdooSelection("state", "weird_custom"), "weird_custom");
    assert.equal(labelOdooSelection("state", null), null);
  });
});
