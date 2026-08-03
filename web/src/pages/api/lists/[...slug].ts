import type { APIRoute } from "astro";
import { BffError } from "../../../lib/bff/errors.ts";
import { getBackend } from "../../../lib/bff/get-backend.ts";
import {
  bffErrorResponse,
  json,
  requireOdooSession,
} from "../../../lib/bff/http.ts";
import {
  getRecordListDef,
  parsePositiveIntParam,
} from "../../../lib/shell/record-lists.ts";

export const GET: APIRoute = async ({ cookies, params, url }) => {
  try {
    const slug = Array.isArray(params.slug)
      ? params.slug.join("/")
      : String(params.slug || "");
    if (!getRecordListDef(slug)) {
      throw new BffError("not_found", 404, "Lista no encontrada");
    }
    const { odooSessionId } = requireOdooSession(cookies);
    const q = url.searchParams.get("q") || undefined;
    const page = Number(url.searchParams.get("page") || "1") || 1;
    const categId =
      slug === "inventory/products"
        ? parsePositiveIntParam(url.searchParams.get("categ_id"))
        : undefined;
    const payload = await getBackend().getRecordList(odooSessionId, slug, {
      q,
      page,
      categId,
    });
    return json(payload);
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
