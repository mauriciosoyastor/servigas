import type { APIRoute } from "astro";
import { BffError } from "../../../../lib/bff/errors.ts";
import { getBackend } from "../../../../lib/bff/get-backend.ts";
import {
  bffErrorResponse,
  requireOdooSession,
} from "../../../../lib/bff/http.ts";
import {
  canFetchWorkshopOrderPdf,
  parseWorkshopOrderPdfSlug,
} from "../../../../lib/shell/workshop-order-share.ts";

export const GET: APIRoute = async ({ cookies, params, url }) => {
  try {
    const slug = Array.isArray(params.slug)
      ? params.slug.join("/")
      : String(params.slug || "");
    const parsed = parseWorkshopOrderPdfSlug(slug);
    if (!parsed || !canFetchWorkshopOrderPdf(parsed.listKey)) {
      throw new BffError("not_found", 404, "PDF no encontrado");
    }

    const { odooSessionId } = requireOdooSession(cookies);
    await getBackend().getRecordDetail(
      odooSessionId,
      parsed.listKey,
      parsed.id
    );

    const download = url.searchParams.get("download") === "1";
    const pdf = await getBackend().fetchWorkshopOrderPdf(
      odooSessionId,
      parsed.listKey,
      parsed.id
    );
    const disposition = download
      ? `attachment; filename="${pdf.filename.replace(/"/g, "")}"`
      : `inline; filename="${pdf.filename.replace(/"/g, "")}"`;

    return new Response(pdf.body, {
      status: 200,
      headers: {
        "content-type": pdf.contentType,
        "content-disposition": disposition,
        "cache-control": "private, no-store",
      },
    });
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
