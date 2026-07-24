import type { APIRoute } from "astro";
import { BffError } from "../../../lib/bff/errors.ts";
import { getBackend } from "../../../lib/bff/get-backend.ts";
import {
  bffErrorResponse,
  json,
  requireOdooSession,
} from "../../../lib/bff/http.ts";
import { canConfirmRecord } from "../../../lib/shell/record-actions.ts";
import { canCreateInvoice } from "../../../lib/shell/invoice-creates.ts";
import { canCreateOrder } from "../../../lib/shell/order-creates.ts";
import {
  canArchiveRecord,
  canCreateRecord,
  getRecordWriteDef,
} from "../../../lib/shell/record-writes.ts";

type RecordAction = "create" | "update" | "archive" | "confirm";

export const POST: APIRoute = async ({ cookies, params, request }) => {
  try {
    const slug = Array.isArray(params.slug)
      ? params.slug.join("/")
      : String(params.slug || "");

    let body: {
      action?: RecordAction;
      id?: unknown;
      values?: Record<string, unknown>;
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
    let action: RecordAction = body.action || "update";
    const id = Number(body.id);
    if (!body.action && !Number.isFinite(id)) {
      action = "create";
    }
    if (
      body.action &&
      !["create", "update", "archive", "confirm"].includes(body.action)
    ) {
      throw new BffError("validation_error", 400, "Acción inválida");
    }

    const writes = getRecordWriteDef(slug);
    const canAct =
      Boolean(writes) ||
      (action === "confirm" && canConfirmRecord(slug)) ||
      (action === "create" &&
        (canCreateOrder(slug) || canCreateInvoice(slug)));
    if (!canAct) {
      throw new BffError("not_found", 404, "Escritura no permitida");
    }

    const { odooSessionId } = requireOdooSession(cookies);
    const values =
      body.values && typeof body.values === "object" ? body.values : {};

    if (action === "create") {
      if (!canCreateRecord(slug)) {
        throw new BffError("not_found", 404, "Alta no permitida");
      }
      const result = await getBackend().createRecord(
        odooSessionId,
        slug,
        values
      );
      return json({ ok: true, ...result });
    }

    if (action === "archive") {
      if (!canArchiveRecord(slug)) {
        throw new BffError("not_found", 404, "Archivado no permitido");
      }
      await getBackend().archiveRecord(odooSessionId, slug, id);
      return json({ ok: true });
    }

    if (action === "confirm") {
      if (!canConfirmRecord(slug)) {
        throw new BffError("not_found", 404, "Confirmación no permitida");
      }
      const result = await getBackend().confirmRecord(
        odooSessionId,
        slug,
        id
      );
      return json(result);
    }

    await getBackend().updateRecord(odooSessionId, slug, id, values);
    return json({ ok: true });
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
