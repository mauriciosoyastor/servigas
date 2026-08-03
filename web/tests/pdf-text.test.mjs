import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractPdfText, isPdfMagic } from "../src/lib/shell/pdf-text.ts";

function makeMinimalPdf(text) {
  const content = `BT /F1 12 Tf 50 750 Td (${text}) Tj ET`;
  const stream = Buffer.from(content, "latin1");
  const objects = [
    Buffer.from("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n"),
    Buffer.from("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n"),
    Buffer.from(
      "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n"
    ),
    Buffer.concat([
      Buffer.from(`4 0 obj<< /Length ${stream.length} >>stream\n`),
      stream,
      Buffer.from("\nendstream\nendobj\n"),
    ]),
    Buffer.from(
      "5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n"
    ),
  ];
  let out = Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n");
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(out.length);
    out = Buffer.concat([out, obj]);
  }
  const xrefPos = out.length;
  let xref = `xref\n0 ${offsets.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  out = Buffer.concat([
    out,
    Buffer.from(xref),
    Buffer.from(
      `trailer<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`
    ),
  ]);
  return out;
}

describe("pdf-text", () => {
  it("detects magic", () => {
    assert.equal(isPdfMagic(Buffer.from("%PDF-1.4")), true);
    assert.equal(isPdfMagic(Buffer.from("not")), false);
  });

  it("returns empty for non-pdf", async () => {
    assert.equal(await extractPdfText(Buffer.from("hello")), "");
  });

  it("extracts text from minimal PDF with Tj operators", async () => {
    const fixtureBytes = makeMinimalPdf("ABRANORT-1 FACTURA CUIT");
    const text = await extractPdfText(fixtureBytes);
    assert.match(text, /ABRANORT|FACTURA|CUIT/i);
  });
});
