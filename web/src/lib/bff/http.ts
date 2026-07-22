import type { APIContext } from "astro";
import { BffError } from "./errors.ts";
import { BFF_COOKIE, sessionStore } from "./session-store.ts";

export function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
}

export function bffErrorResponse(err: unknown) {
  if (err instanceof BffError) {
    return json(
      { error: { code: err.code, message: err.message } },
      { status: err.status }
    );
  }
  return json(
    {
      error: {
        code: "odoo_unavailable",
        message: "No se pudo conectar con el servidor",
      },
    },
    { status: 503 }
  );
}

export function requireOdooSession(cookies: APIContext["cookies"]) {
  const sid = cookies.get(BFF_COOKIE)?.value;
  if (!sid) {
    throw new BffError("unauthorized", 401, "Sesión requerida");
  }
  const entry = sessionStore.get(sid);
  if (!entry) {
    throw new BffError("unauthorized", 401, "Sesión inválida");
  }
  return { bffSid: sid, ...entry };
}

export function setBffCookie(
  cookies: APIContext["cookies"],
  bffSid: string
) {
  cookies.set(BFF_COOKIE, bffSid, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: Boolean(import.meta.env?.PROD),
  });
}

export function clearBffCookie(cookies: APIContext["cookies"]) {
  cookies.delete(BFF_COOKIE, { path: "/" });
}
