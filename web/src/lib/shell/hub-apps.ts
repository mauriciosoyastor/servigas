const TAG_TO_APP: Record<string, string> = {
  servigas_inventory_hub: "inventory",
  servigas_sales_hub: "sales",
  servigas_purchase_hub: "purchase",
  servigas_accounting_hub: "accounting",
};

export const HUB_APPS = ["inventory", "sales", "purchase", "accounting"] as const;
export type HubApp = (typeof HUB_APPS)[number];

export function isHubApp(app: string): app is HubApp {
  return (HUB_APPS as readonly string[]).includes(app);
}

export function clientTagToApp(tag: string): HubApp | null {
  return (TAG_TO_APP[tag] as HubApp | undefined) ?? null;
}
