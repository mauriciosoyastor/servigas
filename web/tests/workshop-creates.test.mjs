import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeSerial,
  filterWorkOrderCreateValues,
  canCreateWorkOrder,
  canDeleteWorkOrder,
} from "../src/lib/shell/workshop-creates.ts";

describe("normalizeSerial", () => {
  it("uppercases and strips spaces", () => {
    assert.equal(normalizeSerial("320BDN 51580205"), "320BDN51580205");
    assert.equal(normalizeSerial("  ab-12  "), "AB-12");
  });

  it("empty for blank", () => {
    assert.equal(normalizeSerial(""), "");
    assert.equal(normalizeSerial(null), "");
  });
});

describe("filterWorkOrderCreateValues", () => {
  it("requires serial", () => {
    assert.equal(filterWorkOrderCreateValues({ owner_name: "Juan" }), null);
  });

  it("accepts hybrid payload", () => {
    const out = filterWorkOrderCreateValues({
      serial_number: "320BDN 51580205",
      brand: "ORBIS",
      model: "320BDN",
      gas_type: "gn",
      owner_name: "Pérez",
      owner_phone: "291555",
      partnerId: 12,
      problem: "No enciende",
      amount: 15000,
    });
    assert.ok(out);
    assert.equal(out.serial_number, "320BDN51580205");
    assert.equal(out.gas_type, "gn");
    assert.equal(out.partner_id, 12);
    assert.equal(out.amount, 15000);
  });
});

describe("canCreateWorkOrder", () => {
  it("only workshop/orders", () => {
    assert.equal(canCreateWorkOrder("workshop/orders"), true);
    assert.equal(canCreateWorkOrder("workshop/appliances"), false);
  });
});

describe("canDeleteWorkOrder", () => {
  it("only workshop/orders", () => {
    assert.equal(canDeleteWorkOrder("workshop/orders"), true);
    assert.equal(canDeleteWorkOrder("workshop/appliances"), false);
    assert.equal(canDeleteWorkOrder("sales/customers"), false);
  });
});
