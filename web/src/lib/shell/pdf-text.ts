/**
 * PDF buffer → plain text for vendor-bill line extraction.
 */

import { PDFParse } from "pdf-parse";

export function isPdfMagic(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  );
}

export async function extractPdfText(bytes: Uint8Array): Promise<string> {
  if (!isPdfMagic(bytes)) return "";
  try {
    const parser = new PDFParse({ data: Buffer.from(bytes) });
    const result = await parser.getText();
    return String(result?.text || "").trim();
  } catch {
    return "";
  }
}
