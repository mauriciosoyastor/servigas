/**
 * Canonical UI labels (opción B — lenguaje de trabajo).
 * Single source for area names shared by hub-nav / launcher-nav / tests.
 */

export const AREA_LABELS = {
  inventory: "Stock",
  sales: "Ventas",
  purchase: "Compras",
  accounting: "Cobros",
  pos: "Mostrador",
  home: "Inicio",
  caja: "Caja",
} as const;

/** Legacy Odoo / module names still seen in DB tiles before override. */
export const LEGACY_AREA_ALIASES: Record<string, string> = {
  Inventario: AREA_LABELS.inventory,
  Facturación: AREA_LABELS.accounting,
  Contabilidad: AREA_LABELS.accounting,
  "Punto de venta": AREA_LABELS.pos,
  POS: AREA_LABELS.pos,
};

export function canonicalizeAreaLabel(label: string): string {
  return LEGACY_AREA_ALIASES[label] || label;
}
