import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  SETTINGS_DEFAULTS,
  SETTINGS_PARAM,
  filterAlertSettingsValues,
  formatLowStockAlertMessage,
  isProductLowStock,
  LOW_STOCK_SCAN_LIMIT,
  parseBoolParam,
  parseHoursThreshold,
  parseMoneyThreshold,
  parseStockMinQty,
  settingsFromParams,
} from "../src/lib/shell/servigas-settings.ts";

describe("servigas alert settings helpers", () => {
  it("exposes stable ir.config_parameter keys", () => {
    assert.equal(
      SETTINGS_PARAM.cashThreshold,
      "servigas.caja.cash_alert_threshold"
    );
    assert.equal(
      SETTINGS_PARAM.openHoursThreshold,
      "servigas.caja.open_hours_threshold"
    );
    assert.equal(
      SETTINGS_PARAM.stockAlertsEnabled,
      "servigas.stock.alerts_enabled"
    );
    assert.equal(SETTINGS_PARAM.stockMinQty, "servigas.stock.min_qty");
  });

  it("parses money/hours/bool/stock-min with defaults", () => {
    assert.equal(parseMoneyThreshold(-1, 100000), 100000);
    assert.equal(parseMoneyThreshold("150000.5", 0), 150000.5);
    assert.equal(parseHoursThreshold(0, 12), 12);
    assert.equal(parseHoursThreshold(200, 12), 168);
    assert.equal(parseHoursThreshold(8.2, 12), 8);
    assert.equal(parseBoolParam("sí", false), true);
    assert.equal(parseBoolParam("off", true), false);
    assert.equal(parseBoolParam("", true), true);
    assert.equal(parseStockMinQty(-1, 0), 0);
    assert.equal(parseStockMinQty("7.8", 0), 8);
    assert.equal(parseStockMinQty(0, 5), 0);
  });

  it("builds settings from param map with defaults", () => {
    assert.deepEqual(settingsFromParams({}), { ...SETTINGS_DEFAULTS });
    assert.deepEqual(
      settingsFromParams({
        [SETTINGS_PARAM.cashThreshold]: "200000",
        [SETTINGS_PARAM.openHoursThreshold]: "6",
        [SETTINGS_PARAM.stockAlertsEnabled]: "0",
        [SETTINGS_PARAM.stockMinQty]: "10",
      }),
      {
        cashThreshold: 200000,
        openHoursThreshold: 6,
        stockAlertsEnabled: false,
        stockMinQty: 10,
      }
    );
  });

  it("filters alert settings write payload including global stock min", () => {
    assert.equal(filterAlertSettingsValues({}), null);
    assert.equal(filterAlertSettingsValues({ cashThreshold: -5 }), null);
    assert.deepEqual(filterAlertSettingsValues({ cashThreshold: 90000 }), {
      cashThreshold: 90000,
    });
    assert.deepEqual(
      filterAlertSettingsValues({
        open_hours_threshold: 10,
        stock_alerts_enabled: "true",
        stock_min_qty: 5,
      }),
      {
        openHoursThreshold: 10,
        stockAlertsEnabled: true,
        stockMinQty: 5,
      }
    );
    assert.equal(filterAlertSettingsValues({ stockMinQty: -1 }), null);
  });

  it("detects low stock with global minimum only", () => {
    assert.equal(isProductLowStock(5, 0), false);
    assert.equal(isProductLowStock(5, 5), true);
    assert.equal(isProductLowStock(4, 5), true);
    assert.equal(isProductLowStock(6, 5), false);
  });

  it("formats low-stock banner with exact or capped wording", () => {
    assert.equal(formatLowStockAlertMessage({ count: 0 }), "");
    assert.equal(
      formatLowStockAlertMessage({ count: 1 }),
      "Hay 1 producto en o bajo el mínimo configurado."
    );
    assert.equal(
      formatLowStockAlertMessage({ count: 12 }),
      "Hay 12 productos en o bajo el mínimo configurado."
    );
    assert.equal(
      formatLowStockAlertMessage({ count: 1999, capped: true }),
      `Hay más de ${LOW_STOCK_SCAN_LIMIT} productos en o bajo el mínimo configurado.`
    );
    assert.equal(
      formatLowStockAlertMessage({ count: LOW_STOCK_SCAN_LIMIT }),
      `Hay más de ${LOW_STOCK_SCAN_LIMIT} productos en o bajo el mínimo configurado.`
    );
  });
});
