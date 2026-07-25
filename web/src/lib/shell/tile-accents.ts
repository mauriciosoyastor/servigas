/**
 * Accent tokens shared by launcher tiles and hub KPI cards.
 * Same palette as home tiles (flame / ember).
 */

export const TILE_ACCENT_CYCLE = [
  "flame-yellow",
  "flame-orange",
  "flame-deep",
  "flame-rust",
  "ember-amber",
  "ember-coral",
  "ember-scarlet",
  "ember-wine",
] as const;

export type TileAccentKey = (typeof TILE_ACCENT_CYCLE)[number] | string;

const ACCENT_CSS: Record<string, string> = {
  "flame-yellow": "var(--sg-flame-yellow)",
  "flame-orange": "var(--sg-flame-orange)",
  "flame-deep": "var(--sg-flame-deep)",
  "flame-rust": "var(--sg-flame-rust)",
  "ember-amber": "var(--sg-ember-amber)",
  "ember-coral": "var(--sg-ember-coral)",
  "ember-scarlet": "var(--sg-ember-scarlet)",
  "ember-wine": "var(--sg-ember-wine)",
  "bg-mid": "#555",
  "bg-charcoal": "var(--sg-bg-charcoal)",
  "bg-deep": "var(--sg-bg-deep)",
};

export function accentForIndex(index: number): string {
  const i = Number.isFinite(index) && index >= 0 ? Math.floor(index) : 0;
  return TILE_ACCENT_CYCLE[i % TILE_ACCENT_CYCLE.length];
}

/** Prefer stored key; otherwise cycle by index (hub cards without accent_key). */
export function resolveAccentKey(
  key: string | null | undefined,
  index = 0
): string {
  const normalized = String(key || "").trim();
  if (normalized && ACCENT_CSS[normalized]) return normalized;
  return accentForIndex(index);
}

export function accentCssVar(key: string | null | undefined): string {
  const resolved = resolveAccentKey(key, 0);
  return ACCENT_CSS[resolved] || "var(--sg-flame-orange)";
}
