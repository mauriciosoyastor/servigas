import type { APIRoute } from "astro";
import { BffError } from "../../../../lib/bff/errors.ts";
import { getBackend } from "../../../../lib/bff/get-backend.ts";
import {
  bffErrorResponse,
  json,
  requireOdooSession,
} from "../../../../lib/bff/http.ts";

type Body = {
  action?: "preview" | "purge";
  categoryId?: number;
  confirmName?: string;
};

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    let body: Body;
    try {
      const parsed = await request.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new BffError("validation_error", 400, "JSON inválido");
      }
      body = parsed as Body;
    } catch (cause) {
      if (cause instanceof BffError) throw cause;
      throw new BffError("validation_error", 400, "JSON inválido");
    }

    const { odooSessionId } = requireOdooSession(cookies);
    const categoryId = Number(body.categoryId);
    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      throw new BffError("validation_error", 400, "Categoría inválida.");
    }

    const action = body.action || "preview";
    if (action === "preview") {
      const count = await getBackend().countProductsInCategory(
        odooSessionId,
        categoryId
      );
      return json({ ok: true, productCount: count });
    }

    if (action !== "purge") {
      throw new BffError("validation_error", 400, "Acción inválida");
    }

    const result = await getBackend().purgeProductsByCategory(odooSessionId, {
      categoryId,
      confirmName: String(body.confirmName || ""),
    });
    return json({ ok: true, ...result });
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
