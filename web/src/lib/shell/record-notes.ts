import { getRecordListDef } from "./record-lists.ts";

export const MAX_NOTE_BODY_LENGTH = 4000;

export const NOTE_MODELS = [
  "res.partner",
  "product.template",
  "sale.order",
  "purchase.order",
] as const;

const NOTE_MODELS_SET = new Set<string>(NOTE_MODELS);

export function isAllowedNoteModel(model: unknown): boolean {
  return typeof model === "string" && NOTE_MODELS_SET.has(model);
}

export function resolveNoteTarget(
  listKey: string
): { model: string } | null {
  const list = getRecordListDef(listKey);
  if (!list || !isAllowedNoteModel(list.model)) return null;
  return { model: list.model };
}

export function normalizeNoteBody(
  raw: unknown
): { ok: true; body: string } | { ok: false; error: string } {
  if (typeof raw !== "string") {
    return { ok: false, error: "Escribí una nota" };
  }
  const body = raw.trim();
  if (!body) return { ok: false, error: "Escribí una nota" };
  if (body.length > MAX_NOTE_BODY_LENGTH) {
    return { ok: false, error: "La nota es demasiado larga" };
  }
  return { ok: true, body };
}

function stripMarkupToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<[^>]+>/g, "");
}

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

/**
 * Odoo sometimes stores note bodies with tags already entity-escaped
 * (e.g. `&lt;p&gt;hola&lt;/p&gt;`). Strip once, decode, and if the source
 * looked double-escaped, strip again so the UI never shows raw tags.
 */
export function plainTextFromOdooHtml(html: string): string {
  const raw = String(html || "");
  const doubleEscaped = /&lt;\s*\/?\s*(?:p|div|br)\b/i.test(raw);
  let text = decodeBasicEntities(stripMarkupToText(raw));
  if (doubleEscaped) {
    text = stripMarkupToText(text);
  }
  return text.replace(/\n+$/g, "").trim();
}

export function odooHtmlFromPlainText(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const withBreaks = escaped.replace(/\n/g, "<br/>");
  return `<p>${withBreaks}</p>`;
}
