/**
 * Launcher tile partitioning — atajos first, apps secondary (opción B).
 */

import type { LauncherTile } from "../bff/types.ts";
import { AREA_LABELS, canonicalizeAreaLabel } from "./ui-glossary.ts";

/** Display label overrides for hub tiles on the home screen. */
const HUB_TILE_LABELS: Record<string, string> = {
  servigas_inventory_hub: AREA_LABELS.inventory,
  servigas_sales_hub: AREA_LABELS.sales,
  servigas_purchase_hub: AREA_LABELS.purchase,
  servigas_accounting_hub: AREA_LABELS.accounting,
};

export type PartitionedLauncher = {
  areas: LauncherTile[];
  more: LauncherTile[];
};

function isPosTile(tile: LauncherTile): boolean {
  if (tile.client_tag === "pos") return true;
  const action = tile.action;
  if (
    action &&
    typeof action === "object" &&
    "res_model" in action &&
    action.res_model === "pos.config"
  ) {
    return true;
  }
  return tile.label === "Punto de venta" || tile.label === AREA_LABELS.pos;
}

export function displayLauncherLabel(tile: LauncherTile): string {
  if (tile.target_type === "hub") {
    return HUB_TILE_LABELS[tile.client_tag] || canonicalizeAreaLabel(tile.label);
  }
  if (isPosTile(tile)) return AREA_LABELS.pos;
  return canonicalizeAreaLabel(tile.label);
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
