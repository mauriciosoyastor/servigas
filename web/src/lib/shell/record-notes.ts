import { getRecordListDef } from "./record-lists.ts";

export const MAX_NOTE_BODY_LENGTH = 4000;

export const NOTE_MODELS = [
  "res.partner",
  "product.template",
  "sale.order",
  "purchase.order",
] as const;

const NOTE_MODELS_SET = new Set<string>(NOTE_MODELS);

export function resolveNoteTarget(
  listKey: string
): { model: string } | null {
  const list = getRecordListDef(listKey);
  if (!list || !NOTE_MODELS_SET.has(list.model)) return null;
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

export function plainTextFromOdooHtml(html: string): string {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\n+$/g, "")
    .trim();
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
