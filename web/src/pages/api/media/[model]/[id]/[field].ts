import type { APIRoute } from "astro";
import { BffError } from "../../../../../lib/bff/errors.ts";
import { getBackend } from "../../../../../lib/bff/get-backend.ts";
import {
  bffErrorResponse,
  requireOdooSession,
} from "../../../../../lib/bff/http.ts";
import { isAllowedMedia } from "../../../../../lib/shell/record-lists.ts";

export const GET: APIRoute = async ({ cookies, params }) => {
  try {
    const model = decodeURIComponent(params.model || "");
    const field = decodeURIComponent(params.field || "");
    const id = Number(params.id);
    if (!isAllowedMedia(model, field) || !Number.isFinite(id)) {
      throw new BffError("not_found", 404, "Media no encontrada");
    }
    const { odooSessionId } = requireOdooSession(cookies);
    const media = await getBackend().fetchMedia(
      odooSessionId,
      model,
      id,
      field
    );
    return new Response(media.body, {
      status: 200,
      headers: {
        "content-type": media.contentType,
        "cache-control": "private, max-age=300",
      },
    });
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
