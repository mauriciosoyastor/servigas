import type { APIRoute } from "astro";
import {
  bffErrorResponse,
  json,
  requireOdooSession,
} from "../../../lib/bff/http.ts";
import { getBackend } from "../../../lib/bff/get-backend.ts";
import { BffError } from "../../../lib/bff/errors.ts";
import { filterAlertSettingsValues } from "../../../lib/shell/servigas-settings.ts";

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const { odooSessionId } = requireOdooSession(cookies);
    const settings = await getBackend().getAlertSettings(odooSessionId);
    return json(settings);
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const { odooSessionId } = requireOdooSession(cookies);
    let body: Record<string, unknown>;
    try {
      const parsed = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new BffError("validation_error", 400, "JSON inválido");
      }
      body = parsed as Record<string, unknown>;
    } catch (cause) {
      if (cause instanceof BffError) throw cause;
      throw new BffError("validation_error", 400, "JSON inválido");
    }
    if (!filterAlertSettingsValues(body)) {
      throw new BffError(
        "validation_error",
        400,
        "Revisá los umbrales de alerta"
      );
    }
    const settings = await getBackend().updateAlertSettings(
      odooSessionId,
      body
    );
    return json(settings);
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
