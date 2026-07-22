import type { APIRoute } from "astro";
import { getBackend } from "../../../lib/bff/get-backend.ts";
import {
  bffErrorResponse,
  json,
  setBffCookie,
} from "../../../lib/bff/http.ts";
import { sessionStore } from "../../../lib/bff/session-store.ts";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const login = String(body.login || "");
    const password = String(body.password || "");
    const { sessionId, session } = await getBackend().login(login, password);
    const bffSid = sessionStore.create(sessionId, session);
    setBffCookie(cookies, bffSid);
    return json({ ok: true, session });
  } catch (err) {
    return bffErrorResponse(err);
  }
};
