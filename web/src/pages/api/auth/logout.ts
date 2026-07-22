import type { APIRoute } from "astro";
import { getBackend } from "../../../lib/bff/get-backend.ts";
import {
  bffErrorResponse,
  clearBffCookie,
  json,
  requireOdooSession,
} from "../../../lib/bff/http.ts";
import { sessionStore } from "../../../lib/bff/session-store.ts";

export const POST: APIRoute = async ({ cookies }) => {
  try {
    const { bffSid, odooSessionId } = requireOdooSession(cookies);
    await getBackend().logout(odooSessionId);
    sessionStore.destroy(bffSid);
    clearBffCookie(cookies);
    return json({ ok: true });
  } catch (err) {
    return bffErrorResponse(err);
  }
};
