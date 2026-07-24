import type { APIRoute } from "astro";
import { BffError } from "../../../lib/bff/errors.ts";
import { getBackend } from "../../../lib/bff/get-backend.ts";
import {
  bffErrorResponse,
  clearBffCookie,
  json,
  requireOdooSession,
} from "../../../lib/bff/http.ts";
import { sessionStore } from "../../../lib/bff/session-store.ts";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { bffSid, odooSessionId, session } = requireOdooSession(cookies);

    let body: { login?: unknown };
    try {
      body = (await request.json()) as { login?: unknown };
    } catch {
      throw new BffError("validation_error", 400, "JSON inválido");
    }

    const login = String(body.login || "").trim();
    if (!login) {
      throw new BffError("validation_error", 400, "El usuario no puede estar vacío");
    }
    if (login === session.login) {
      throw new BffError(
        "validation_error",
        400,
        "El usuario es el mismo que ya tenés"
      );
    }

    const backend = getBackend();
    const updated = await backend.updateLogin(
      odooSessionId,
      session.uid,
      login
    );
    // Changing login invalidates the Odoo session; mirror password-change UX.
    await backend.logout(odooSessionId);
    sessionStore.destroy(bffSid);
    clearBffCookie(cookies);
    return json({ ok: true, login: updated.login });
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
