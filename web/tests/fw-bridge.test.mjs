import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  buildFwPendingCsv,
  canExportFwPending,
  canMarkFwLoaded,
  csvEscape,
  filterMarkFwLoadedValues,
  isFwMarkableState,
} from "../src/lib/shell/fw-bridge.ts";
import {
  getRecordListDef,
  resolveRecordListPath,
} from "../src/lib/shell/record-lists.ts";

describe("fw-bridge", () => {
  it("allowlists mark and export keys", () => {
    assert.equal(canMarkFwLoaded("accounting/customer-invoices"), true);
    assert.equal(canMarkFwLoaded("accounting/factura-web-pending"), true);
    assert.equal(canMarkFwLoaded("accounting/vendor-bills"), false);
    assert.equal(canExportFwPending("accounting/factura-web-pending"), true);
  });

  it("filters optional fw number", () => {
    assert.deepEqual(
      filterMarkFwLoadedValues("accounting/customer-invoices", {}),
      {}
    );
    assert.deepEqual(
      filterMarkFwLoadedValues("accounting/customer-invoices", {
        fwNumber: " 0001-99 ",
      }),
      { fwNumber: "0001-99" }
    );
    assert.equal(
      filterMarkFwLoadedValues("accounting/drafts", { fwNumber: "1" }),
      null
    );
  });

  it("gates markable state", () => {
    assert.equal(isFwMarkableState("posted", false), true);
    assert.equal(isFwMarkableState("posted", "false"), true);
    assert.equal(isFwMarkableState("posted", true), false);
    assert.equal(isFwMarkableState("draft", false), false);
  });

  it("builds CSV with escape", () => {
    assert.equal(csvEscape('a,b'), '"a,b"');
    const csv = buildFwPendingCsv([
      {
        invoice_date: "2026-07-24",
        name: "FC/001",
        partner_name: "Cliente, SA",
        vat: "20123456789",
        sg_invoice_dest: "cuit",
        sg_doc_type_short: "A/B",
        amount_total: 1000,
        sg_fw_number: "",
        ref: "POS/1",
      },
    ]);
    assert.match(csv, /n_fc_odoo/);
    assert.match(csv, /"Cliente, SA"/);
    assert.match(csv, /FC\/001/);
  });

  it("defines pending list and routes hub label", () => {
    const def = getRecordListDef("accounting/factura-web-pending");
    assert.ok(def);
    assert.equal(def.model, "account.move");
    assert.ok(def.fields.includes("sg_fw_loaded"));
    assert.equal(
      resolveRecordListPath(
        {
          type: "ir.actions.act_window",
          res_model: "account.move",
          domain: [],
        },
        { label: "Pendientes Factura Web" }
      ),
      "/lists/accounting/factura-web-pending"
    );
  });
});
