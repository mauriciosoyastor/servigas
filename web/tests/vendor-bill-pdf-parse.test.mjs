import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseVendorBillText,
  matchBillLine,
  classifyBillLines,
  buildProductIndexes,
} from "../src/lib/shell/vendor-bill-pdf-parse.ts";

const SAMPLE = `
FACTURA A  Nro 0001-00004567
CUIT: 30-71234567-8
Razon Social: Distribuidora Gas del Sur S.A.
Codigo         Descripcion                              Cant   P.Unit    Importe
ABRANORT-1     ABRAZADERA PARA GAS                      10    618.45    6184.50
ACEITEX-12     ACEITE LIMPIA CONTACTO                    3   6491.87   19475.61
Subtotal neto: $ 25660.11
IVA 21%:       $ 5388.62
TOTAL:         $ 31048.73
`;

describe("parseVendorBillText", () => {
  it("extracts SKU lines and skips totals", () => {
    const { lines, partnerHint } = parseVendorBillText(SAMPLE);
    assert.equal(lines.length, 2);
    assert.equal(lines[0].code, "ABRANORT-1");
    assert.equal(lines[0].qty, 10);
    assert.equal(lines[0].price, 618.45);
    assert.equal(partnerHint?.vat, "30-71234567-8");
  });

  it("returns empty lines for blank text", () => {
    assert.deepEqual(parseVendorBillText("").lines, []);
  });
});

describe("matchBillLine", () => {
  const indexes = buildProductIndexes([
    {
      id: 3,
      barcode: null,
      default_code: "ABRANORT-1",
      name: "Abrazadera",
    },
    { id: 5, barcode: "ACEITEX-12", default_code: "ACEITEX-12", name: "Aceite" },
  ]);

  it("matches by default_code", () => {
    const m = matchBillLine(
      { code: "ABRANORT-1", name: "x", qty: 1, price: 10 },
      indexes
    );
    assert.equal(m.status, "matched");
    assert.equal(m.productId, 3);
    assert.equal(m.reason, "default_code");
  });

  it("review on no_match", () => {
    const m = matchBillLine(
      { code: "NO-EXISTE", name: "Otro", qty: 1, price: 10 },
      indexes
    );
    assert.equal(m.status, "review");
    assert.equal(m.reason, "no_match");
  });

  it("error on invalid qty", () => {
    const m = matchBillLine(
      { code: "ABRANORT-1", name: "x", qty: 0, price: 10 },
      indexes
    );
    assert.equal(m.status, "error");
  });
});

describe("classifyBillLines", () => {
  it("classifies a batch", () => {
    const indexes = buildProductIndexes([
      {
        id: 3,
        barcode: "ABRANORT-1",
        default_code: "ABRANORT-1",
        name: "Abrazadera",
      },
    ]);
    const out = classifyBillLines(
      [
        { code: "ABRANORT-1", name: "x", qty: 2, price: 10 },
        { code: "ZZZ", name: "y", qty: 1, price: 5 },
      ],
      indexes
    );
    assert.equal(out[0].status, "matched");
    assert.equal(out[1].status, "review");
  });
});
