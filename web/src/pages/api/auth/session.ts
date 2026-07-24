import type { APIRoute } from "astro";
import { getBackend } from "../../../lib/bff/get-backend.ts";
import {
  bffErrorResponse,
  json,
  requireOdooSession,
} from "../../../lib/bff/http.ts";

/**
 * Returns local session info after confirming Odoo still accepts the sid.
 * Dead Odoo sessions clear the BFF cookie (see bffErrorResponse).
 */
export const GET: APIRoute = async ({ cookies }) => {
  try {
    const { session, odooSessionId } = requireOdooSession(cookies);
    await getBackend().validateSession(odooSessionId);
    return json({ session });
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
