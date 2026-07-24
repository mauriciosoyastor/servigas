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
    const { bffSid, odooSessionId } = requireOdooSession(cookies);

    let body: { currentPassword?: unknown; newPassword?: unknown };
    try {
      body = (await request.json()) as {
        currentPassword?: unknown;
        newPassword?: unknown;
      };
    } catch {
      throw new BffError("validation_error", 400, "JSON inválido");
    }

    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    if (!currentPassword || !newPassword) {
      throw new BffError(
        "validation_error",
        400,
        "Completá la contraseña actual y la nueva"
      );
    }
    if (currentPassword === newPassword) {
      throw new BffError(
        "validation_error",
        400,
        "La nueva contraseña debe ser distinta a la actual"
      );
    }

    const backend = getBackend();
    await backend.changePassword(
      odooSessionId,
      currentPassword,
      newPassword
    );
    await backend.logout(odooSessionId);
    sessionStore.destroy(bffSid);
    clearBffCookie(cookies);
    return json({ ok: true });
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
