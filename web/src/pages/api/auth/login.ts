import type { APIRoute } from "astro";
import { BffError } from "../../../lib/bff/errors.ts";
import { getBackend } from "../../../lib/bff/get-backend.ts";
import {
  bffErrorResponse,
  json,
  setBffCookie,
} from "../../../lib/bff/http.ts";
import { sessionStore } from "../../../lib/bff/session-store.ts";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    let body: { login?: unknown; password?: unknown };
    try {
      body = (await request.json()) as { login?: unknown; password?: unknown };
    } catch {
      throw new BffError("validation_error", 400, "JSON inválido");
    }
    const login = String(body.login || "").trim();
    const password = String(body.password || "");
    if (!login || !password) {
      throw new BffError(
        "validation_error",
        400,
        "Usuario y contraseña son requeridos"
      );
    }
    const { sessionId, session } = await getBackend().login(login, password);
    const bffSid = sessionStore.create(sessionId, session);
    setBffCookie(cookies, bffSid);
    return json({ ok: true, session });
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
