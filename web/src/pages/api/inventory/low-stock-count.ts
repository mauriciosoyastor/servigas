import type { APIRoute } from "astro";
import {
  bffErrorResponse,
  json,
  requireOdooSession,
} from "../../../lib/bff/http.ts";
import { getBackend } from "../../../lib/bff/get-backend.ts";

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const { odooSessionId } = requireOdooSession(cookies);
    const result = await getBackend().countLowStockProducts(odooSessionId);
    return json(result);
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
