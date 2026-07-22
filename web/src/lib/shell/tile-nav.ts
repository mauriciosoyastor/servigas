import { clientTagToApp } from "./hub-apps.ts";
import { resolveRecordListPath, type OdooAction } from "./record-lists.ts";

export type { OdooAction };

export type TileNavInput = {
  target_type: "hub" | "action" | string;
  client_tag: string;
  action?: OdooAction;
  label?: string;
};

export type TileNavResult =
  | { kind: "hub"; path: string }
  | { kind: "list"; path: string }
  | { kind: "route"; path: string }
  | { kind: "coming_soon" };

export function resolveTileNavigation(tile: TileNavInput): TileNavResult {
  if (tile.target_type === "hub") {
    const app = clientTagToApp(tile.client_tag);
    if (!app) return { kind: "coming_soon" };
    return { kind: "hub", path: `/hubs/${app}` };
  }

  if (tile.action && typeof tile.action === "object") {
    if (tile.action.type === "ir.actions.act_window") {
      const model = String(tile.action.res_model || "");
      if (model === "pos.config") {
        return { kind: "route", path: "/pos" };
      }
      if (model === "ir.module.module") {
        return { kind: "route", path: "/apps" };
      }
      if (model === "res.config.settings") {
        return { kind: "route", path: "/settings" };
      }
    }

    const listPath = resolveRecordListPath(tile.action, {
      label: tile.label,
    });
    if (listPath) {
      return { kind: "list", path: listPath };
    }
  }

  return { kind: "coming_soon" };
}
