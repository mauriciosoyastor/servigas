import { clientTagToApp } from "./hub-apps.ts";

export type TileNavInput = {
  target_type: "hub" | "action" | string;
  client_tag: string;
};

export type TileNavResult =
  | { kind: "hub"; path: string }
  | { kind: "coming_soon" };

export function resolveTileNavigation(tile: TileNavInput): TileNavResult {
  if (tile.target_type !== "hub") return { kind: "coming_soon" };
  const app = clientTagToApp(tile.client_tag);
  if (!app) return { kind: "coming_soon" };
  return { kind: "hub", path: `/hubs/${app}` };
}
