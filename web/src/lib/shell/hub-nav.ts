/**
 * Hub presentation helpers — thin hubs (opción B).
 */

import type { HubApp } from "./hub-apps.ts";
import type { HubCard, HubGroup, HubSection } from "../bff/types.ts";
import { AREA_LABELS } from "./ui-glossary.ts";

/** Display labels (work language, not raw Odoo module names). */
export const HUB_LABELS: Record<HubApp, string> = {
  inventory: AREA_LABELS.inventory,
  sales: AREA_LABELS.sales,
  purchase: AREA_LABELS.purchase,
  accounting: AREA_LABELS.accounting,
};

/** Sections shown as primary pills; everything else goes under «Más». */
export const HUB_PRIMARY_SECTIONS: Record<HubApp, readonly string[]> = {
  inventory: ["summary", "products", "operations"],
  sales: ["summary", "quotations", "orders", "customers"],
  purchase: ["summary", "orders", "vendors"],
  accounting: ["summary", "receivables", "payables"],
};

export const HUB_SUMMARY_CARD_LIMIT = 5;

export type SplitHubSections = {
  primary: HubSection[];
  more: HubSection[];
};

export function splitHubSections(
  app: HubApp,
  sections: HubSection[]
): SplitHubSections {
  const primaryCodes = new Set(HUB_PRIMARY_SECTIONS[app]);
  const primary: HubSection[] = [];
  const more: HubSection[] = [];
  for (const section of sections) {
    if (primaryCodes.has(section.code)) primary.push(section);
    else more.push(section);
  }
  return { primary, more };
}

export function limitHubCards<T extends HubCard>(
  cards: T[],
  limit = HUB_SUMMARY_CARD_LIMIT
): T[] {
  if (limit < 1) return [];
  return cards.slice(0, limit);
}

export function limitHubGroups(
  groups: HubGroup[],
  limit = HUB_SUMMARY_CARD_LIMIT
): HubGroup[] {
  let remaining = limit;
  const out: HubGroup[] = [];
  for (const group of groups) {
    if (remaining <= 0) break;
    const cards = limitHubCards(group.cards, remaining);
    if (!cards.length) continue;
    out.push({ ...group, cards });
    remaining -= cards.length;
  }
  return out;
}

/** Apply thin-hub limits only on the summary section. */
export function thinHubPayload(input: {
  app: HubApp;
  section: string;
  cards: HubCard[];
  groups: HubGroup[];
}): { cards: HubCard[]; groups: HubGroup[] } {
  if (input.section !== "summary") {
    return { cards: input.cards, groups: input.groups };
  }
  if (input.groups.length) {
    return { cards: input.cards, groups: limitHubGroups(input.groups) };
  }
  return { cards: limitHubCards(input.cards), groups: input.groups };
}
