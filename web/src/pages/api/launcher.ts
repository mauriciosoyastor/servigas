import type { APIRoute } from "astro";
import { getBackend } from "../../lib/bff/get-backend.ts";
import {
  bffErrorResponse,
  json,
  requireOdooSession,
} from "../../lib/bff/http.ts";

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const { odooSessionId } = requireOdooSession(cookies);
    const payload = await getBackend().getLauncher(odooSessionId);
    return json(payload);
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
