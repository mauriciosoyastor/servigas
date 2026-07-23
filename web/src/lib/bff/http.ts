import type { APIContext } from "astro";
import { BffError, type BffErrorCode } from "./errors.ts";
import {
  BFF_COOKIE,
  getSessionTtlSeconds,
  sessionStore,
} from "./session-store.ts";

/** Safe user-facing copy — never forward raw Odoo / internal messages. */
export const USER_ERROR_MESSAGES: Record<BffErrorCode, string> = {
  unauthorized: "Sesión requerida",
  bad_credentials: "Usuario o contraseña incorrectos",
  odoo_unavailable: "No se pudo conectar con el servidor",
<<<<<<< HEAD
  not_found: "No encontrado",
  validation_error: "Datos inválidos",
  checkout_failed: "No se pudo registrar la venta en caja",
  action_failed: "No se pudo completar la acción",
=======
  not_found: "Hub no encontrado",
  checkout_failed: "No se pudo registrar la venta en caja",
>>>>>>> 0dad2e2 (fix(web): checkout POS fail-loud sin fallback sale.order)
};

export function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
}

/**
 * Map errors to safe JSON. If `unauthorized` and cookies are provided,
 * destroy the local BFF session (Odoo session is dead or cookie invalid).
 */
export function bffErrorResponse(
  err: unknown,
  cookies?: APIContext["cookies"]
) {
  if (err instanceof BffError) {
    if (err.code === "unauthorized" && cookies) {
      invalidateBffSession(cookies);
    }
    return json(
      { error: { code: err.code, message: USER_ERROR_MESSAGES[err.code] } },
      { status: err.status }
    );
  }
  return json(
    {
      error: {
        code: "odoo_unavailable",
        message: USER_ERROR_MESSAGES.odoo_unavailable,
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
    maxAge: getSessionTtlSeconds(),
  });
}

export function clearBffCookie(cookies: APIContext["cookies"]) {
  cookies.delete(BFF_COOKIE, { path: "/" });
}

export function invalidateBffSession(cookies: APIContext["cookies"]) {
  const sid = cookies.get(BFF_COOKIE)?.value;
  if (sid) {
    sessionStore.destroy(sid);
  }
  clearBffCookie(cookies);
}
