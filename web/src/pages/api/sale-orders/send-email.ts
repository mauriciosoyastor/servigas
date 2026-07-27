import type { APIRoute } from "astro";
import { BffError } from "../../../lib/bff/errors.ts";
import { getBackend } from "../../../lib/bff/get-backend.ts";
import {
  bffErrorResponse,
  json,
  requireOdooSession,
} from "../../../lib/bff/http.ts";
import { canSendSaleOrderEmail } from "../../../lib/shell/sale-order-share.ts";

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const { odooSessionId } = requireOdooSession(cookies);

    let body: { listKey?: unknown; id?: unknown };
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
    if (!canSendSaleOrderEmail(listKey)) {
      throw new BffError("not_found", 404, "Envío no permitido");
    }
    if (!Number.isFinite(id) || id <= 0) {
      throw new BffError("validation_error", 400, "Pedido inválido");
    }

    const result = await getBackend().sendSaleOrderEmail(
      odooSessionId,
      listKey,
      id
    );
    return json(result);
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
