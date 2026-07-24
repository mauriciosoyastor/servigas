import type { APIRoute } from "astro";
import { BffError } from "../../../lib/bff/errors.ts";
import { getBackend } from "../../../lib/bff/get-backend.ts";
import {
  bffErrorResponse,
  json,
  requireOdooSession,
} from "../../../lib/bff/http.ts";
import type { PriceListImportApplyLine } from "../../../lib/bff/types.ts";
import { TEMPLATE_CSV } from "../../../lib/shell/price-list-import.ts";

type Body = {
  action?: "preview" | "apply" | "template";
  filename?: string;
  content?: string;
  mapping?: Record<string, string>;
  lines?: PriceListImportApplyLine[];
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

    const action = body.action || "preview";
    if (!["preview", "apply", "template"].includes(action)) {
      throw new BffError("validation_error", 400, "Acción inválida");
    }

    if (action === "template") {
      return json({
        ok: true,
        filename: "plantilla_lista_precios_servigas.csv",
        content: TEMPLATE_CSV,
      });
    }

    const { odooSessionId } = requireOdooSession(cookies);

    if (action === "preview") {
      const filename = String(body.filename || "").trim();
      const content = String(body.content || "");
      if (!filename || !content) {
        throw new BffError(
          "validation_error",
          400,
          "Subí un archivo CSV con nombre y contenido."
        );
      }
      const preview = await getBackend().previewPriceListImport(odooSessionId, {
        filename,
        content,
        mapping: body.mapping,
      });
      return json({ ok: true, preview });
    }

    const lines = Array.isArray(body.lines) ? body.lines : [];
    const result = await getBackend().applyPriceListImport(odooSessionId, lines);
    return json({ ok: true, ...result });
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
