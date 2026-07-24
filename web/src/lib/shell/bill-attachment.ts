/**
 * Validate vendor-bill proof attachments (PDF / JPG / PNG).
 * Spec: docs/superpowers/specs/2026-07-24-vendor-bill-attachment-design.md
 */

import { BffError } from "../bff/errors.ts";

export const MAX_BILL_ATTACHMENT_BYTES = 10_485_760; // 10 MiB

export const BILL_ATTACHMENT_MISSING_MSG =
  "Adjuntá el PDF o la foto del comprobante";
export const BILL_ATTACHMENT_MIME_MSG = "Usá un archivo PDF, JPG o PNG.";
export const BILL_ATTACHMENT_SIZE_MSG =
  "El archivo es demasiado grande (máx. 10 MB).";

const DATA_URL_RE =
  /^data:([a-z0-9.+/-]+);base64,([a-z0-9+/=\s]+)$/i;

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
]);

export type BillAttachmentInput = {
  filename: string;
  mimetype: string;
  content: string; // data-URL or raw base64
};

export type NormalizedBillAttachment = {
  filename: string;
  mimetype: string;
  content: string; // pure base64
};

export type BillSource = "whatsapp" | "mail" | "other";

const BILL_SOURCES = new Set<BillSource>(["whatsapp", "mail", "other"]);

export function billSourceLabel(raw: unknown): string {
  const key = String(raw || "").trim().toLowerCase();
  if (key === "whatsapp") return "WhatsApp";
  if (key === "mail") return "Mail";
  if (key === "other") return "Otro";
  return "";
}

export function normalizeBillSource(raw: unknown): BillSource | "" {
  if (raw == null || raw === "") return "";
  const key = String(raw).trim().toLowerCase();
  return BILL_SOURCES.has(key as BillSource) ? (key as BillSource) : "";
}

function decodedByteLength(base64: string): number {
  const clean = base64.replace(/\s+/g, "");
  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  return Math.floor((clean.length * 3) / 4) - padding;
}

function sanitizeFilename(raw: unknown): string {
  const name = String(raw || "")
    .replace(/\\/g, "/")
    .split("/")
    .pop()
    ?.trim();
  if (!name) return "comprobante";
  return name.slice(0, 180);
}

function normalizeMime(raw: unknown): string {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .split(";")[0]
    .trim();
}

function assertBillMagic(base64: string, mimetype: string): void {
  const buf = Buffer.from(base64.replace(/\s+/g, ""), "base64");
  if (buf.length < 4) {
    throw new BffError("validation_error", 400, BILL_ATTACHMENT_MIME_MSG);
  }
  const isPdf =
    buf[0] === 0x25 &&
    buf[1] === 0x50 &&
    buf[2] === 0x44 &&
    buf[3] === 0x46; // %PDF
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const isPng =
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47;

  if (mimetype === "application/pdf" && isPdf) return;
  if (
    (mimetype === "image/jpeg" || mimetype === "image/jpg") &&
    isJpeg
  ) {
    return;
  }
  if (mimetype === "image/png" && isPng) return;

  // Allow mime/extension mismatch if magic clearly matches an allowed type.
  if (isPdf || isJpeg || isPng) return;

  throw new BffError("validation_error", 400, BILL_ATTACHMENT_MIME_MSG);
}

export function normalizeBillAttachment(
  raw: unknown
): NormalizedBillAttachment {
  if (!raw || typeof raw !== "object") {
    throw new BffError("validation_error", 400, BILL_ATTACHMENT_MISSING_MSG);
  }
  const row = raw as Record<string, unknown>;
  const contentRaw = row.content ?? row.datas ?? row.data;
  if (typeof contentRaw !== "string" || !contentRaw.trim()) {
    throw new BffError("validation_error", 400, BILL_ATTACHMENT_MISSING_MSG);
  }

  const trimmed = contentRaw.trim();
  let base64: string;
  let mimeFromDataUrl = "";

  const dataMatch = trimmed.match(DATA_URL_RE);
  if (dataMatch) {
    mimeFromDataUrl = normalizeMime(dataMatch[1]);
    base64 = dataMatch[2].replace(/\s+/g, "");
  } else if (/^[a-z0-9+/=\s]+$/i.test(trimmed)) {
    base64 = trimmed.replace(/\s+/g, "");
  } else {
    throw new BffError("validation_error", 400, BILL_ATTACHMENT_MIME_MSG);
  }

  let mimetype = normalizeMime(
    row.mimetype ?? row.mimeType ?? mimeFromDataUrl
  );
  if (mimetype === "image/jpg") mimetype = "image/jpeg";

  // Infer only when the client omitted mime entirely.
  if (!mimetype) {
    const buf = Buffer.from(base64, "base64");
    if (
      buf[0] === 0x25 &&
      buf[1] === 0x50 &&
      buf[2] === 0x44 &&
      buf[3] === 0x46
    ) {
      mimetype = "application/pdf";
    } else if (buf[0] === 0xff && buf[1] === 0xd8) {
      mimetype = "image/jpeg";
    } else if (
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47
    ) {
      mimetype = "image/png";
    }
  }

  if (mimetype === "image/jpg") mimetype = "image/jpeg";
  if (!ALLOWED_MIME.has(mimetype)) {
    throw new BffError("validation_error", 400, BILL_ATTACHMENT_MIME_MSG);
  }

  if (decodedByteLength(base64) > MAX_BILL_ATTACHMENT_BYTES) {
    throw new BffError("validation_error", 400, BILL_ATTACHMENT_SIZE_MSG);
  }

  assertBillMagic(base64, mimetype);

  return {
    filename: sanitizeFilename(row.filename ?? row.name),
    mimetype: mimetype === "image/jpg" ? "image/jpeg" : mimetype,
    content: base64,
  };
}
