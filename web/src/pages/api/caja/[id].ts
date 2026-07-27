import type { APIRoute } from "astro";
import { getBackend } from "../../../lib/bff/get-backend.ts";
import {
  bffErrorResponse,
  json,
  requireOdooSession,
} from "../../../lib/bff/http.ts";

export const GET: APIRoute = async ({ cookies, params }) => {
  try {
    const { odooSessionId } = requireOdooSession(cookies);
    const id = Number(params.id);
    const payload = await getBackend().getCashSessionDetail(odooSessionId, id);
    return json(payload);
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
