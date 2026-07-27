import type { APIRoute } from "astro";
import { BffError } from "../../../lib/bff/errors.ts";
import { getBackend } from "../../../lib/bff/get-backend.ts";
import {
  bffErrorResponse,
  json,
  requireOdooSession,
} from "../../../lib/bff/http.ts";

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const { odooSessionId } = requireOdooSession(cookies);
    const body = (await request.json()) as {
      kind?: string;
      amount?: number;
      motiveCode?: string;
      note?: string;
      /** @deprecated prefer motiveCode */
      reason?: string;
    };
    const kind = body.kind === "out" ? "out" : body.kind === "in" ? "in" : null;
    if (!kind) {
      throw new BffError(
        "validation_error",
        400,
        "El movimiento debe ser ingreso o egreso"
      );
    }
    const motiveCode = String(body.motiveCode || "").trim();
    if (!motiveCode) {
      throw new BffError(
        "validation_error",
        400,
        "Elegí un motivo"
      );
    }
    const result = await getBackend().addCashMovement(odooSessionId, {
      kind,
      amount: Number(body.amount),
      motiveCode,
      note: body.note,
    });
    return json(result);
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
