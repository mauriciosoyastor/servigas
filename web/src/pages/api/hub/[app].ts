import type { APIRoute } from "astro";
import { BffError } from "../../../lib/bff/errors.ts";
import { getBackend } from "../../../lib/bff/get-backend.ts";
import {
  bffErrorResponse,
  json,
  requireOdooSession,
} from "../../../lib/bff/http.ts";
import { isHubApp } from "../../../lib/shell/hub-apps.ts";

export const GET: APIRoute = async ({ cookies, params, url }) => {
  try {
    if (!isHubApp(params.app || "")) {
      throw new BffError("not_found", 404, "Sección no encontrada");
    }
    const { odooSessionId } = requireOdooSession(cookies);
    const section = url.searchParams.get("section") || "summary";
    const payload = await getBackend().getHub(
      odooSessionId,
      params.app,
      section
    );
    return json(payload);
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
