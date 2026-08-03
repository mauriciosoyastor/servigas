/**
 * Primary shell rail — work-of-the-day navigation (opción B).
 */

import { AREA_LABELS } from "./ui-glossary.ts";

export type RailApp =
  | "home"
  | "pos"
  | "caja"
  | "inventory"
  | "purchase"
  | "workshop"
  | "accounting";

export type RailItem = {
  app: RailApp;
  label: string;
  href: string;
  /** SVG path `d` for 24×24 stroke icon */
  icon: string;
};

export const RAIL_ITEMS: readonly RailItem[] = [
  {
    app: "home",
    label: AREA_LABELS.home,
    href: "/",
    icon: "M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4z",
  },
  {
    app: "pos",
    label: AREA_LABELS.pos,
    href: "/pos",
    icon: "M4 7h16v12H4zm3 3h2m2 0h2m2 0h2M8 17h8",
  },
  {
    app: "caja",
    label: AREA_LABELS.caja,
    href: "/caja",
    icon: "M3 7h18v12H3zm3 4h3m3 0h3m3 0h3M7 16h10",
  },
  {
    app: "inventory",
    label: AREA_LABELS.inventory,
    href: "/hubs/inventory",
    icon: "m4 7 8-4 8 4-8 4zm0 4 8 4 8-4M4 15l8 4 8-4",
  },
  {
    app: "purchase",
    label: AREA_LABELS.purchase,
    href: "/hubs/purchase",
    icon: "M6 8h12l1 12H5zm3 0V6a3 3 0 0 1 6 0v2",
  },
  {
    app: "workshop",
    label: AREA_LABELS.workshop,
    href: "/hubs/workshop",
    icon: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
  },
  {
    app: "accounting",
    label: AREA_LABELS.accounting,
    href: "/hubs/accounting",
    icon: "M4 19V9m5 10V5m6 14v-7m5 7V3",
  },
] as const;

const RAIL_APP_SET = new Set<string>(RAIL_ITEMS.map((item) => item.app));

export function isRailApp(app: string): app is RailApp {
  return RAIL_APP_SET.has(app);
}
