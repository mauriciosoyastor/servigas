import type { APIRoute } from "astro";
import { getBackend } from "../../../lib/bff/get-backend.ts";
import {
  bffErrorResponse,
  requireOdooSession,
} from "../../../lib/bff/http.ts";

/** GET CSV de FC pendientes de cargar en Factura Web. */
export const GET: APIRoute = async ({ cookies }) => {
  try {
    const { odooSessionId } = requireOdooSession(cookies);
    const result = await getBackend().exportFwPendingCsv(odooSessionId);
    return new Response(result.csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${result.filename}"`,
        "x-sg-export-count": String(result.count),
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
