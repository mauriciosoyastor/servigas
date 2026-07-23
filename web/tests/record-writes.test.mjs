import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  canArchiveRecord,
  canCreateRecord,
  filterCreateValues,
  filterWritableValues,
  getRecordWriteDef,
} from "../src/lib/shell/record-writes.ts";

describe("record-writes allowlist", () => {
  it("allows phone and email updates on sales customers", () => {
    const def = getRecordWriteDef("sales/customers");
    assert.ok(def);
    assert.equal(def.model, "res.partner");
    assert.deepEqual(def.fields.sort(), ["email", "phone"].sort());
  });

  it("defines create fields and customer_rank default", () => {
    const def = getRecordWriteDef("sales/customers");
    assert.ok(def);
    assert.deepEqual(def.createFields.sort(), ["email", "name", "phone"].sort());
    assert.deepEqual(def.createDefaults, { customer_rank: 1 });
    assert.equal(canCreateRecord("sales/customers"), true);
    assert.equal(canArchiveRecord("sales/customers"), true);
  });

  it("defines vendor create with supplier_rank default", () => {
    const def = getRecordWriteDef("purchase/vendors");
    assert.ok(def);
    assert.deepEqual(def.createDefaults, { supplier_rank: 1 });
    assert.equal(canCreateRecord("purchase/vendors"), true);
    assert.equal(canArchiveRecord("purchase/vendors"), true);
  });

  it("rejects unknown list keys", () => {
    assert.equal(getRecordWriteDef("inventory/transfers"), null);
    assert.equal(canCreateRecord("inventory/transfers"), false);
    assert.equal(canArchiveRecord("inventory/transfers"), false);
  });

  it("allows creating quotations via order-creates", () => {
    assert.equal(canCreateRecord("sales/quotations"), true);
    assert.equal(canCreateRecord("purchase/rfq"), true);
  });

  it("filters update values to allowlisted fields only", () => {
    const filtered = filterWritableValues("sales/customers", {
      phone: "11-1234",
      email: "a@b.com",
      name: "HACK",
      active: false,
    });
    assert.deepEqual(filtered, {
      phone: "11-1234",
      email: "a@b.com",
    });
  });

  it("builds create values with required name and defaults", () => {
    const created = filterCreateValues("sales/customers", {
      name: "  Cliente Demo  ",
      phone: "11-9999",
      email: "demo@servigas.test",
      customer_rank: 99,
    });
    assert.deepEqual(created, {
      name: "Cliente Demo",
      phone: "11-9999",
      email: "demo@servigas.test",
      customer_rank: 1,
    });
  });

  it("rejects create without name", () => {
    assert.equal(
      filterCreateValues("sales/customers", { phone: "1" }),
      null
    );
  });

  it("returns null when no writable fields remain", () => {
    assert.equal(
      filterWritableValues("sales/customers", { name: "HACK" }),
      null
    );
  });

  it("defines product create with sale_ok/is_storable defaults", () => {
    const def = getRecordWriteDef("inventory/products");
    assert.ok(def);
    assert.equal(def.model, "product.template");
    assert.deepEqual(
      def.createFields.sort(),
      ["default_code", "list_price", "name"].sort()
    );
    assert.deepEqual(def.createDefaults, {
      sale_ok: true,
      is_storable: true,
    });
    assert.equal(canCreateRecord("inventory/products"), true);
    assert.equal(canArchiveRecord("inventory/products"), true);
  });

  it("builds product create values with numeric list_price", () => {
    const created = filterCreateValues("inventory/products", {
      name: "Calefactor Demo",
      default_code: "CAL-ASTRO",
      list_price: "1999.5",
    });
    assert.deepEqual(created, {
      name: "Calefactor Demo",
      default_code: "CAL-ASTRO",
      list_price: 1999.5,
      sale_ok: true,
      is_storable: true,
    });
  });
});
