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
      countedAmount?: number;
      bankDeposit?: number;
      leaveFloat?: number;
      differenceNote?: string;
    };
    if (body.countedAmount == null || body.countedAmount === ("" as never)) {
      throw new BffError(
        "validation_error",
        400,
        "Indicá el efectivo contado al cerrar"
      );
    }
    const result = await getBackend().closeCashSession(odooSessionId, {
      countedAmount: Number(body.countedAmount),
      bankDeposit: body.bankDeposit,
      leaveFloat: body.leaveFloat,
      differenceNote: body.differenceNote,
    });
    return json(result);
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
