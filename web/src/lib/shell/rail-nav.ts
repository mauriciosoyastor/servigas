/**
 * Primary shell rail — work-of-the-day navigation (opción B).
 */

export type RailApp =
  | "home"
  | "pos"
  | "caja"
  | "inventory"
  | "purchase"
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
    label: "Inicio",
    href: "/",
    icon: "M4 10.5 12 4l8 6.5V20h-5v-6H9v6H4z",
  },
  {
    app: "pos",
    label: "Mostrador",
    href: "/pos",
    icon: "M4 7h16v12H4zm3 3h2m2 0h2m2 0h2M8 17h8",
  },
  {
    app: "caja",
    label: "Caja",
    href: "/caja",
    icon: "M3 7h18v12H3zm3 4h3m3 0h3m3 0h3M7 16h10",
  },
  {
    app: "inventory",
    label: "Stock",
    href: "/hubs/inventory",
    icon: "m4 7 8-4 8 4-8 4zm0 4 8 4 8-4M4 15l8 4 8-4",
  },
  {
    app: "purchase",
    label: "Compras",
    href: "/hubs/purchase",
    icon: "M6 8h12l1 12H5zm3 0V6a3 3 0 0 1 6 0v2",
  },
  {
    app: "accounting",
    label: "Cobros",
    href: "/hubs/accounting",
    icon: "M4 19V9m5 10V5m6 14v-7m5 7V3",
  },
] as const;

const RAIL_APP_SET = new Set<string>(RAIL_ITEMS.map((item) => item.app));

export function isRailApp(app: string): app is RailApp {
  return RAIL_APP_SET.has(app);
}
