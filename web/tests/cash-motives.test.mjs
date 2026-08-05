import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CASH_MOTIVES_IN,
  CASH_MOTIVES_OUT,
  buildCashMovementReason,
  motivesForKind,
  resolveCashMotive,
} from "../src/lib/caja/cash-motives.ts";

describe("cash motives", () => {
  it("lists the approved v1 motives for in and out", () => {
    assert.deepEqual(
      CASH_MOTIVES_IN.map((m) => m.code),
      [
        "refuerzo",
        "aporte_dueno",
        "reintegro_proveedor",
        "cobro_ot",
        "otro_ingreso",
      ]
    );
    assert.deepEqual(
      CASH_MOTIVES_OUT.map((m) => m.code),
      [
        "retiro_banco",
        "retiro_dueno",
        "pago_proveedor",
        "gasto_caja_chica",
        "adelanto_personal",
        "devolucion_cliente",
        "otro_egreso",
      ]
    );
  });

  it("resolves motives by kind and rejects cross-kind codes", () => {
    assert.equal(resolveCashMotive("in", "refuerzo")?.label, "Refuerzo de caja");
    assert.equal(
      resolveCashMotive("in", "cobro_ot")?.label,
      "Cobro orden de trabajo"
    );
    assert.equal(resolveCashMotive("out", "retiro_banco")?.label, "Retiro al banco");
    assert.equal(resolveCashMotive("in", "retiro_banco"), null);
    assert.equal(resolveCashMotive("out", "refuerzo"), null);
    assert.equal(motivesForKind("in").length, 5);
    assert.equal(motivesForKind("out").length, 7);
  });

  it("builds reason label and requires note for Otro", () => {
    assert.equal(
      buildCashMovementReason("out", "retiro_banco"),
      "Retiro al banco"
    );
    assert.equal(
      buildCashMovementReason("in", "otro_ingreso", "Venta de scrap"),
      "Otro ingreso · Venta de scrap"
    );
    assert.throws(
      () => buildCashMovementReason("out", "otro_egreso", "  "),
      (err) => /nota/i.test(err?.message || "")
    );
    assert.throws(
      () => buildCashMovementReason("in", "retiro_banco"),
      (err) => /motivo/i.test(err?.message || "")
    );
  });
});
