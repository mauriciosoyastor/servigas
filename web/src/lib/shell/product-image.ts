import { BffError } from "../bff/errors.ts";

export const MAX_PRODUCT_IMAGE_BYTES = 2_621_440; // 2.5 MiB

const DATA_URL_RE = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i;

function decodedByteLength(base64: string): number {
  const clean = base64.replace(/\s+/g, "");
  const padding = clean.endsWith("==") ? 2 : clean.endsWith("=") ? 1 : 0;
  return Math.floor((clean.length * 3) / 4) - padding;
}

function assertImageMagic(base64: string): void {
  const buf = Buffer.from(base64.replace(/\s+/g, ""), "base64");
  if (buf.length < 3) {
    throw new BffError(
      "validation_error",
      400,
      "La imagen no es válida."
    );
  }
  const isPng =
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8;
  const isGif = buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46;
  const isWebp =
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP";
  if (!isPng && !isJpeg && !isGif && !isWebp) {
    throw new BffError(
      "validation_error",
      400,
      "Usá una imagen JPG, PNG, GIF o WebP."
    );
  }
}

export function normalizeProductImage1920(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) {
    throw new BffError(
      "validation_error",
      400,
      "Seleccioná una imagen válida."
    );
  }

  const trimmed = raw.trim();
  let base64: string;

  const dataMatch = trimmed.match(DATA_URL_RE);
  if (dataMatch) {
    base64 = dataMatch[2].replace(/\s+/g, "");
  } else if (/^[a-z0-9+/=\s]+$/i.test(trimmed)) {
    base64 = trimmed.replace(/\s+/g, "");
  } else {
    throw new BffError(
      "validation_error",
      400,
      "Seleccioná una imagen válida."
    );
  }

  if (decodedByteLength(base64) > MAX_PRODUCT_IMAGE_BYTES) {
    throw new BffError(
      "validation_error",
      400,
      "La imagen es demasiado grande (máx. 2,5 MB)."
    );
  }

  assertImageMagic(base64);
  return base64;
}
