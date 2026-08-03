import type { APIRoute } from "astro";
import { BffError } from "../../../lib/bff/errors.ts";
import { getBackend } from "../../../lib/bff/get-backend.ts";
import {
  bffErrorResponse,
  json,
  requireOdooSession,
} from "../../../lib/bff/http.ts";

type Body = {
  filename?: string;
  content?: string;
};

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    let body: Body;
    try {
      const parsed = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new BffError("validation_error", 400, "JSON inválido");
      }
      body = parsed as Body;
    } catch (cause) {
      if (cause instanceof BffError) throw cause;
      throw new BffError("validation_error", 400, "JSON inválido");
    }

    const { odooSessionId } = requireOdooSession(cookies);
    const filename = String(body.filename || "").trim();
    const content = String(body.content || "");
    if (!filename || !content) {
      throw new BffError(
        "validation_error",
        400,
        "Subí un archivo PDF con nombre y contenido."
      );
    }

    const preview = await getBackend().previewVendorBillPdf(odooSessionId, {
      filename,
      content,
    });
    return json({ ok: true, ...preview });
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
