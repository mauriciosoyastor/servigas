/**
 * Empresa-level alert settings (Caja + Stock) stored in ir.config_parameter.
 */

export const SETTINGS_PARAM = {
  cashThreshold: "servigas.caja.cash_alert_threshold",
  openHoursThreshold: "servigas.caja.open_hours_threshold",
  stockAlertsEnabled: "servigas.stock.alerts_enabled",
  stockMinQty: "servigas.stock.min_qty",
} as const;

export const SETTINGS_DEFAULTS = {
  cashThreshold: 100_000,
  openHoursThreshold: 12,
  stockAlertsEnabled: true,
  /** 0 = sin alerta de cantidad hasta configurar un mínimo > 0 */
  stockMinQty: 0,
} as const;

export type ServigasAlertSettings = {
  cashThreshold: number;
  openHoursThreshold: number;
  stockAlertsEnabled: boolean;
  stockMinQty: number;
};

export function parseMoneyThreshold(raw: unknown, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.round(n * 100) / 100;
}

export function parseHoursThreshold(raw: unknown, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(168, Math.max(1, Math.round(n)));
}

export function parseStockMinQty(raw: unknown, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(1_000_000, Math.round(n));
}

export function parseBoolParam(raw: unknown, fallback: boolean): boolean {
  if (raw === null || raw === undefined || raw === "") return fallback;
  const s = String(raw).trim().toLowerCase();
  if (["1", "true", "yes", "si", "sí", "on"].includes(s)) return true;
  if (["0", "false", "no", "off"].includes(s)) return false;
  return fallback;
}

export function settingsFromParams(
  params: Record<string, string | false | undefined>
): ServigasAlertSettings {
  return {
    cashThreshold: parseMoneyThreshold(
      params[SETTINGS_PARAM.cashThreshold],
      SETTINGS_DEFAULTS.cashThreshold
    ),
    openHoursThreshold: parseHoursThreshold(
      params[SETTINGS_PARAM.openHoursThreshold],
      SETTINGS_DEFAULTS.openHoursThreshold
    ),
    stockAlertsEnabled: parseBoolParam(
      params[SETTINGS_PARAM.stockAlertsEnabled],
      SETTINGS_DEFAULTS.stockAlertsEnabled
    ),
    stockMinQty: parseStockMinQty(
      params[SETTINGS_PARAM.stockMinQty],
      SETTINGS_DEFAULTS.stockMinQty
    ),
  };
}

/**
 * Filter PATCH/POST body for alert settings. Returns null if nothing valid.
 */
export function filterAlertSettingsValues(
  values: Record<string, unknown>
): Partial<ServigasAlertSettings> | null {
  const out: Partial<ServigasAlertSettings> = {};

  if ("cashThreshold" in values || "cash_threshold" in values) {
    const n = Number(values.cashThreshold ?? values.cash_threshold);
    if (!Number.isFinite(n) || n < 0) return null;
    out.cashThreshold = Math.round(n * 100) / 100;
  }

  if ("openHoursThreshold" in values || "open_hours_threshold" in values) {
    const n = Number(values.openHoursThreshold ?? values.open_hours_threshold);
    if (!Number.isFinite(n) || n <= 0) return null;
    out.openHoursThreshold = Math.min(168, Math.max(1, Math.round(n)));
  }

  if ("stockAlertsEnabled" in values || "stock_alerts_enabled" in values) {
    const raw = values.stockAlertsEnabled ?? values.stock_alerts_enabled;
    if (typeof raw === "boolean") out.stockAlertsEnabled = raw;
    else out.stockAlertsEnabled = parseBoolParam(raw, true);
  }

  if (
    "stockMinQty" in values ||
    "stock_min_qty" in values ||
    "stockMinimum" in values
  ) {
    const n = Number(
      values.stockMinQty ?? values.stock_min_qty ?? values.stockMinimum
    );
    if (!Number.isFinite(n) || n < 0) return null;
    out.stockMinQty = Math.min(1_000_000, Math.round(n));
  }

  return Object.keys(out).length ? out : null;
}

/** Tope de escaneo BFF para alertas / listado de bajo stock. */
export const LOW_STOCK_SCAN_LIMIT = 2000;

/**
 * Bajo stock global: mínimo > 0 y cantidad disponible ≤ ese mínimo.
 */
export function isProductLowStock(
  qtyAvailable: number,
  globalMinQty: number
): boolean {
  const min = Number(globalMinQty) || 0;
  if (min <= 0) return false;
  const qty = Number(qtyAvailable) || 0;
  return qty <= min;
}

/**
 * Mensaje del banner de Inventario. Si el escaneo llegó al tope, no
 * afirmamos un número exacto (puede haber más fuera de la muestra).
 */
export function formatLowStockAlertMessage(input: {
  count: number;
  capped?: boolean;
}): string {
  const count = Math.max(0, Math.floor(Number(input.count) || 0));
  if (count <= 0) return "";
  if (input.capped || count >= LOW_STOCK_SCAN_LIMIT) {
    return `Hay más de ${LOW_STOCK_SCAN_LIMIT} productos en o bajo el mínimo configurado.`;
  }
  const noun = count === 1 ? "producto" : "productos";
  return `Hay ${count} ${noun} en o bajo el mínimo configurado.`;
}
