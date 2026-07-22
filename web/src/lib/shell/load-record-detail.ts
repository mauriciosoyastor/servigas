import type { AstroCookies } from "astro";
import { BffError } from "../bff/errors.ts";
import { getBackend } from "../bff/get-backend.ts";
import { invalidateBffSession, requireOdooSession } from "../bff/http.ts";
import type { RecordDetailPayload } from "../bff/types.ts";

export type LoadRecordDetailResult =
  | { kind: "redirect"; path: string }
  | {
      kind: "ok";
      userName: string;
      detail: RecordDetailPayload | null;
      error: string;
      status?: number;
    };

export async function loadRecordDetail(
  cookies: AstroCookies,
  listKey: string,
  id: number,
  notFoundMessage: string
): Promise<LoadRecordDetailResult> {
  try {
    const { session, odooSessionId } = requireOdooSession(cookies);
    const userName = session.name || session.login;
    try {
      const detail = await getBackend().getRecordDetail(
        odooSessionId,
        listKey,
        id
      );
      return { kind: "ok", userName, detail, error: "" };
    } catch (cause) {
      if (cause instanceof BffError && cause.code === "unauthorized") {
        invalidateBffSession(cookies);
        return { kind: "redirect", path: "/login" };
      }
      if (cause instanceof BffError && cause.code === "not_found") {
        return {
          kind: "ok",
          userName,
          detail: null,
          error: notFoundMessage,
          status: 404,
        };
      }
      return {
        kind: "ok",
        userName,
        detail: null,
        error: "No pudimos cargar el registro. Intentá nuevamente en unos minutos.",
      };
    }
  } catch {
    invalidateBffSession(cookies);
    return { kind: "redirect", path: "/login" };
  }
}
