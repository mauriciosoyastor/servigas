import type { APIRoute } from "astro";
import { getBackend } from "../../../lib/bff/get-backend.ts";
import {
  bffErrorResponse,
  json,
  requireOdooSession,
} from "../../../lib/bff/http.ts";

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const { odooSessionId } = requireOdooSession(cookies);
    const limit = Number(url.searchParams.get("limit") || "20") || 20;
    const history = await getBackend().getCashHistory(odooSessionId, limit);
    return json({ history });
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
