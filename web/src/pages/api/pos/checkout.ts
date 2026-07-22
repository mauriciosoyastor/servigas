import type { APIRoute } from "astro";
import { BffError } from "../../../lib/bff/errors.ts";
import { getBackend } from "../../../lib/bff/get-backend.ts";
import {
  bffErrorResponse,
  json,
  requireOdooSession,
} from "../../../lib/bff/http.ts";
import type { PosCheckoutLine } from "../../../lib/bff/types.ts";

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const { odooSessionId } = requireOdooSession(cookies);
    const body = (await request.json()) as {
      lines?: PosCheckoutLine[];
      paymentMethodId?: number;
    };
    if (!Array.isArray(body.lines)) {
      throw new BffError("not_found", 404, "Carrito inválido");
    }
    const result = await getBackend().checkoutPosCart(
      odooSessionId,
      body.lines,
      {
        paymentMethodId:
          body.paymentMethodId != null
            ? Number(body.paymentMethodId)
            : undefined,
      }
    );
    return json(result);
  } catch (err) {
    return bffErrorResponse(err);
  }
};
