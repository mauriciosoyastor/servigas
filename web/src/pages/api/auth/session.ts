import type { APIRoute } from "astro";
import {
  bffErrorResponse,
  json,
  requireOdooSession,
} from "../../../lib/bff/http.ts";

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const { session } = requireOdooSession(cookies);
    return json({ session });
  } catch (err) {
    return bffErrorResponse(err);
  }
};
