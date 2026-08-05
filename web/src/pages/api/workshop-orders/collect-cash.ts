import type { APIRoute } from "astro";
import { BffError } from "../../../lib/bff/errors.ts";
import { getBackend } from "../../../lib/bff/get-backend.ts";
import {
  bffErrorResponse,
  json,
  requireOdooSession,
} from "../../../lib/bff/http.ts";
import { canCollectWorkOrderCash } from "../../../lib/shell/workshop-order-cash.ts";

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const { odooSessionId } = requireOdooSession(cookies);

    let body: {
      listKey?: unknown;
      id?: unknown;
      amount?: unknown;
      paymentMethod?: unknown;
    };
    try {
      const parsed = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new BffError("validation_error", 400, "JSON inválido");
      }
      body = parsed as typeof body;
    } catch (cause) {
      if (cause instanceof BffError) throw cause;
      throw new BffError("validation_error", 400, "JSON inválido");
    }

    const listKey = String(body.listKey || "");
    const id = Number(body.id);
    if (!canCollectWorkOrderCash(listKey)) {
      throw new BffError("not_found", 404, "Cobro no permitido");
    }
    if (!Number.isFinite(id) || id <= 0) {
      throw new BffError("validation_error", 400, "OT inválida");
    }

    const result = await getBackend().collectWorkOrderCash(
      odooSessionId,
      listKey,
      id,
      {
        amount: Number(body.amount),
        paymentMethod: String(body.paymentMethod || ""),
      }
    );
    return json(result);
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
