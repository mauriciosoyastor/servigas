import type { APIRoute } from "astro";
import { BffError } from "../../../lib/bff/errors.ts";
import { getBackend } from "../../../lib/bff/get-backend.ts";
import {
  bffErrorResponse,
  requireOdooSession,
} from "../../../lib/bff/http.ts";

export const GET: APIRoute = async ({ cookies, params }) => {
  try {
    const id = Number(params.id);
    if (!Number.isFinite(id) || id <= 0) {
      throw new BffError("not_found", 404, "Adjunto no encontrado");
    }
    const { odooSessionId } = requireOdooSession(cookies);
    const file = await getBackend().fetchAttachment(odooSessionId, id);
    const safeName = String(file.filename || "comprobante")
      .replace(/[\r\n"]/g, "")
      .slice(0, 180);
    return new Response(file.body, {
      status: 200,
      headers: {
        "content-type": file.contentType,
        "content-disposition": `inline; filename="${safeName}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
