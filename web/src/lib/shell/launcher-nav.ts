/**
 * Launcher tile partitioning — atajos first, apps secondary (opción B).
 */

import type { LauncherTile } from "../bff/types.ts";

/** Display label overrides for hub tiles on the home screen. */
const HUB_TILE_LABELS: Record<string, string> = {
  servigas_inventory_hub: "Stock",
  servigas_sales_hub: "Ventas",
  servigas_purchase_hub: "Compras",
  servigas_accounting_hub: "Cobros",
};

export type PartitionedLauncher = {
  areas: LauncherTile[];
  more: LauncherTile[];
};

export function displayLauncherLabel(tile: LauncherTile): string {
  if (tile.target_type === "hub") {
    return HUB_TILE_LABELS[tile.client_tag] || tile.label;
  }
  return tile.label;
}

export function withDisplayLabel(tile: LauncherTile): LauncherTile {
  const label = displayLauncherLabel(tile);
  return label === tile.label ? tile : { ...tile, label };
}

/**
 * Hub tiles → «Áreas del negocio». Action tiles (POS, Apps, Ajustes, Integraciones) → «Más accesos».
 */
export function partitionLauncherTiles(tiles: LauncherTile[]): PartitionedLauncher {
  const areas: LauncherTile[] = [];
  const more: LauncherTile[] = [];
  for (const tile of tiles) {
    const labeled = withDisplayLabel(tile);
    if (tile.target_type === "hub") areas.push(labeled);
    else more.push(labeled);
  }
  return { areas, more };
}
