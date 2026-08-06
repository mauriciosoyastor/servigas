import type { APIRoute } from "astro";
import { BffError } from "../../../lib/bff/errors.ts";
import { getBackend } from "../../../lib/bff/get-backend.ts";
import {
  bffErrorResponse,
  json,
  requireOdooSession,
} from "../../../lib/bff/http.ts";
import type { PosCheckoutLine, PosCheckoutOptions } from "../../../lib/bff/types.ts";
import { parsePartnerNew } from "../../../lib/shell/partner-inline.ts";

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const { odooSessionId } = requireOdooSession(cookies);
    const body = (await request.json()) as {
      lines?: PosCheckoutLine[];
      paymentMethodId?: number;
      partnerId?: number;
      partnerNew?: unknown;
    };
    if (!Array.isArray(body.lines)) {
      throw new BffError("validation_error", 400, "Carrito inválido");
    }
    const partnerNew = parsePartnerNew(body.partnerNew);
    const checkoutOptions: PosCheckoutOptions = {
      paymentMethodId:
        body.paymentMethodId != null
          ? Number(body.paymentMethodId)
          : undefined,
      partnerId:
        body.partnerId != null ? Number(body.partnerId) : undefined,
    };
    if (partnerNew) checkoutOptions.partnerNew = partnerNew;
    const result = await getBackend().checkoutPosCart(
      odooSessionId,
      body.lines,
      checkoutOptions
    );
    return json(result);
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
