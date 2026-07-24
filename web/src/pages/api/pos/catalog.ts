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
    const q = url.searchParams.get("q") || undefined;
    const limit = Number(url.searchParams.get("limit") || "48") || 48;
    const payload = await getBackend().getPosCatalog(odooSessionId, { q, limit });
    return json(payload);
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
