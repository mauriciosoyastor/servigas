import type { APIRoute } from "astro";
import { BffError } from "../../lib/bff/errors.ts";
import { getBackend } from "../../lib/bff/get-backend.ts";
import {
  bffErrorResponse,
  json,
  requireOdooSession,
} from "../../lib/bff/http.ts";
import { normalizeNoteBody } from "../../lib/shell/record-notes.ts";

async function parseJsonObject(request: Request): Promise<Record<string, unknown>> {
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new BffError("validation_error", 400, "JSON inválido");
    }
    return parsed as Record<string, unknown>;
  } catch (cause) {
    if (cause instanceof BffError) throw cause;
    throw new BffError("validation_error", 400, "JSON inválido");
  }
}

function requirePositiveId(raw: unknown): number {
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) {
    throw new BffError(
      "validation_error",
      400,
      "Revisá los datos e intentá de nuevo"
    );
  }
  return id;
}

function requireNoteBody(raw: unknown): string {
  const normalized = normalizeNoteBody(raw);
  if (!normalized.ok) {
    throw new BffError("validation_error", 400, normalized.error);
  }
  return normalized.body;
}

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    const { odooSessionId, session } = requireOdooSession(cookies);
    const listKey = String(url.searchParams.get("listKey") || "");
    const recordId = requirePositiveId(url.searchParams.get("recordId"));
    if (!listKey) {
      throw new BffError(
        "validation_error",
        400,
        "Revisá los datos e intentá de nuevo"
      );
    }
    const notes = await getBackend().listRecordNotes(
      odooSessionId,
      listKey,
      recordId,
      session.uid
    );
    return json({ notes });
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};

export const POST: APIRoute = async ({ cookies, request }) => {
  try {
    const body = await parseJsonObject(request);
    const listKey = typeof body.listKey === "string" ? body.listKey : "";
    const recordId = requirePositiveId(body.recordId);
    const noteBody = requireNoteBody(body.body);
    if (!listKey) {
      throw new BffError(
        "validation_error",
        400,
        "Revisá los datos e intentá de nuevo"
      );
    }
    const { odooSessionId, session } = requireOdooSession(cookies);
    const note = await getBackend().createRecordNote(
      odooSessionId,
      listKey,
      recordId,
      noteBody,
      session.uid
    );
    return json({ ok: true, note });
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};

export const PATCH: APIRoute = async ({ cookies, request }) => {
  try {
    const body = await parseJsonObject(request);
    const noteId = requirePositiveId(body.id);
    const noteBody = requireNoteBody(body.body);
    const { odooSessionId, session } = requireOdooSession(cookies);
    const note = await getBackend().updateRecordNote(
      odooSessionId,
      noteId,
      noteBody,
      session.uid
    );
    return json({ ok: true, note });
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};

export const DELETE: APIRoute = async ({ cookies, request }) => {
  try {
    const body = await parseJsonObject(request);
    const noteId = requirePositiveId(body.id);
    const { odooSessionId, session } = requireOdooSession(cookies);
    await getBackend().deleteRecordNote(
      odooSessionId,
      noteId,
      session.uid
    );
    return json({ ok: true });
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
