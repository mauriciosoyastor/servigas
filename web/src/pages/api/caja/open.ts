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
      openingBalance?: number;
      note?: string;
      shift?: string;
    };
    if (body.openingBalance == null || body.openingBalance === ("" as never)) {
      throw new BffError(
        "validation_error",
        400,
        "Indicá el monto inicial de la caja"
      );
    }
    const result = await getBackend().openCashSession(odooSessionId, {
      openingBalance: Number(body.openingBalance),
      note: body.note,
      shift: body.shift,
    });
    return json(result);
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
