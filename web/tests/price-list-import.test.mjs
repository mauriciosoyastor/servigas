import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  TEMPLATE_CSV,
  classifyRows,
  isRejectedFilename,
  labelImportReason,
  labelImportStatus,
  matchProduct,
  normalizeRow,
  parseTabularText,
  suggestMapping,
} from "../src/lib/shell/price-list-import.ts";

describe("price-list-import reject", () => {
  it("rejects pdf and images", () => {
    assert.equal(isRejectedFilename("lista.pdf"), true);
    assert.equal(isRejectedFilename("foto.PNG"), true);
    assert.equal(isRejectedFilename("lista.csv"), false);
  });
});

describe("price-list-import mapping", () => {
  it("suggests servigas headers", () => {
    assert.deepEqual(
      suggestMapping([
        "barcode",
        "default_code",
        "name",
        "list_price",
        "standard_price",
        "categoria",
        "proveedor",
      ]),
      {
        barcode: "barcode",
        default_code: "default_code",
        name: "name",
        list_price: "list_price",
        standard_price: "standard_price",
        categoria: "categoria",
        proveedor: "proveedor",
      }
    );
  });

  it("maps spanish aliases for category and supplier", () => {
    assert.deepEqual(
      suggestMapping(["Categoría", "Proveedor", "Nombre", "Precio"]),
      {
        name: "Nombre",
        list_price: "Precio",
        categoria: "Categoría",
        proveedor: "Proveedor",
      }
    );
  });

  it("template includes categoria and proveedor", () => {
    assert.match(TEMPLATE_CSV, /categoria/);
    assert.match(TEMPLATE_CSV, /proveedor/);
  });
});

describe("price-list-import parse", () => {
  it("parses csv text", () => {
    const parsed = parseTabularText(
      "lista.csv",
      "barcode,default_code,name,list_price,standard_price\n779,SKU1,Producto Uno,100.5,40\n"
    );
    assert.equal(parsed.error, null);
    assert.equal(parsed.rows[0].name, "Producto Uno");
  });

  it("rejects pdf", () => {
    const parsed = parseTabularText("lista.pdf", "%PDF-1.4");
    assert.ok(parsed.error);
  });
});

describe("price-list-import match", () => {
  const indexes = {
    byBarcode: { 779: [10] },
    byCode: { SKU1: [20] },
    byName: { "gas 10kg": [30] },
  };

  it("matches barcode first", () => {
    const result = matchProduct(
      {
        barcode: "779",
        default_code: "SKU1",
        name: "Gas 10kg",
        priceErrors: [],
      },
      indexes
    );
    assert.equal(result.status, "update");
    assert.equal(result.productId, 10);
  });

  it("creates when no match", () => {
    const result = matchProduct(
      {
        barcode: "",
        default_code: "NEW",
        name: "Nuevo",
        priceErrors: [],
      },
      indexes
    );
    assert.equal(result.status, "create");
  });

  it("reviews ambiguous name", () => {
    const result = matchProduct(
      { barcode: "", default_code: "", name: "x", priceErrors: [] },
      { byBarcode: {}, byCode: {}, byName: { x: [1, 2] } }
    );
    assert.equal(result.status, "review");
    assert.deepEqual(result.candidates, [1, 2]);
  });
});

describe("price-list-import classify", () => {
  it("classifies mix", () => {
    const mapping = {
      barcode: "barcode",
      default_code: "default_code",
      name: "name",
      list_price: "list_price",
      standard_price: "standard_price",
    };
    const classified = classifyRows(
      [
        {
          barcode: "779",
          default_code: "",
          name: "A",
          list_price: "10",
          standard_price: "5",
        },
        {
          barcode: "",
          default_code: "N1",
          name: "Nuevo",
          list_price: "20",
          standard_price: "8",
        },
        {
          barcode: "",
          default_code: "",
          name: "",
          list_price: "1",
          standard_price: "1",
        },
      ],
      mapping,
      { byBarcode: { 779: [10] }, byCode: {}, byName: {} }
    );
    assert.deepEqual(
      classified.map((row) => row.status),
      ["update", "create", "error"]
    );
  });

  it("normalizes argentine price", () => {
    const row = normalizeRow(
      {
        barcode: " 1 ",
        default_code: " A ",
        name: " Gas ",
        list_price: "1.234,50",
        standard_price: "100",
      },
      {
        barcode: "barcode",
        default_code: "default_code",
        name: "name",
        list_price: "list_price",
        standard_price: "standard_price",
      }
    );
    assert.equal(row.list_price, 1234.5);
    assert.equal(row.name, "Gas");
  });

  it("normalizes categoria and proveedor", () => {
    const row = normalizeRow(
      {
        name: "Filtro",
        categoria: "  Filtros  ",
        proveedor: " Acme SA ",
        list_price: "10",
      },
      {
        name: "name",
        list_price: "list_price",
        categoria: "categoria",
        proveedor: "proveedor",
      }
    );
    assert.equal(row.categoria, "Filtros");
    assert.equal(row.proveedor, "Acme SA");
  });
});

describe("price-list-import labels", () => {
  it("labels status in Spanish", () => {
    assert.equal(labelImportStatus("create"), "Crear");
    assert.equal(labelImportStatus("update"), "Actualizar");
    assert.equal(labelImportStatus("review"), "Revisar");
    assert.equal(labelImportStatus("error"), "Error");
  });

  it("labels reasons with actionable Spanish copy", () => {
    assert.equal(
      labelImportReason("no_match"),
      "Producto nuevo (no encontrado en stock)"
    );
    assert.equal(
      labelImportReason("invalid_price"),
      "Falta o es inválido el precio de venta"
    );
    assert.equal(labelImportReason("missing_name"), "Falta el nombre");
    assert.equal(labelImportReason("barcode"), "Encontrado por código de barras");
    assert.equal(labelImportReason("default_code"), "Encontrado por código");
    assert.equal(labelImportReason("name"), "Encontrado por nombre");
    assert.match(labelImportReason("ambiguous_barcode"), /Varios productos/);
    assert.match(labelImportReason("ambiguous_code"), /Varios productos/);
    assert.match(labelImportReason("ambiguous_name"), /Varios productos/);
  });

  it("falls back to the raw code when unknown", () => {
    assert.equal(labelImportReason("weird_code"), "weird_code");
    assert.equal(labelImportStatus("weird"), "weird");
  });
});
