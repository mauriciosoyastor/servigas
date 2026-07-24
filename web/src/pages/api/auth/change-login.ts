import type { APIRoute } from "astro";
import { BffError } from "../../../lib/bff/errors.ts";
import { getBackend } from "../../../lib/bff/get-backend.ts";
import {
  bffErrorResponse,
  json,
  requireOdooSession,
} from "../../../lib/bff/http.ts";
import { sessionStore } from "../../../lib/bff/session-store.ts";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { bffSid, odooSessionId, session } = requireOdooSession(cookies);

    let body: { login?: unknown; currentPassword?: unknown };
    try {
      body = (await request.json()) as {
        login?: unknown;
        currentPassword?: unknown;
      };
    } catch {
      throw new BffError("validation_error", 400, "JSON inválido");
    }

    const login = String(body.login || "").trim();
    const currentPassword = String(body.currentPassword || "");
    if (!login) {
      throw new BffError("validation_error", 400, "El usuario no puede estar vacío");
    }
    if (!currentPassword) {
      throw new BffError(
        "validation_error",
        400,
        "Confirmá tu contraseña actual para cambiar el usuario"
      );
    }
    if (login === session.login) {
      throw new BffError(
        "validation_error",
        400,
        "El usuario es el mismo que ya tenés"
      );
    }

    const backend = getBackend();

    // Confirm password before mutating login, so a typo never locks the user out.
    let probe: { sessionId: string; session: typeof session };
    try {
      probe = await backend.login(session.login, currentPassword);
    } catch (cause) {
      if (cause instanceof BffError && cause.code === "bad_credentials") {
        throw new BffError(
          "validation_error",
          400,
          "La contraseña actual no es correcta"
        );
      }
      throw cause;
    }

    try {
      const updated = await backend.updateLogin(
        probe.sessionId,
        session.uid,
        login
      );
      const fresh = await backend.login(updated.login, currentPassword);
      if (fresh.session.uid !== session.uid) {
        throw new BffError(
          "odoo_unavailable",
          503,
          "No se pudo confirmar la sesión del usuario"
        );
      }

      const nextSession = {
        uid: session.uid,
        name: fresh.session.name || session.name,
        login: updated.login,
      };
      if (!sessionStore.updateSession(bffSid, nextSession, fresh.sessionId)) {
        throw new BffError("unauthorized", 401, "Sesión inválida");
      }

      if (odooSessionId !== fresh.sessionId) {
        await backend.logout(odooSessionId);
      }
      if (
        probe.sessionId !== fresh.sessionId &&
        probe.sessionId !== odooSessionId
      ) {
        await backend.logout(probe.sessionId);
      }

      return json({ ok: true, session: nextSession });
    } catch (cause) {
      try {
        await backend.updateLogin(probe.sessionId, session.uid, session.login);
      } catch {
        // ignore rollback failures
      }
      await backend.logout(probe.sessionId);
      throw cause;
    }
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
