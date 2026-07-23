import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { BffError } from "../src/lib/bff/errors.ts";
import {
  bffErrorResponse,
  clearBffCookie,
  invalidateBffSession,
  json,
  requireOdooSession,
  setBffCookie,
} from "../src/lib/bff/http.ts";
import {
  BFF_COOKIE,
  sessionStore,
} from "../src/lib/bff/session-store.ts";
import { GET as getSession } from "../src/pages/api/auth/session.ts";
import { GET as getLauncher } from "../src/pages/api/launcher.ts";
import { GET as getHub } from "../src/pages/api/hub/[app].ts";
import { POST as postRecord } from "../src/pages/api/records/[...slug].ts";
import { GET as getPosCatalog } from "../src/pages/api/pos/catalog.ts";
import { POST as postPosCheckout } from "../src/pages/api/pos/checkout.ts";

class FakeCookies {
  values = new Map();
  setCalls = [];
  deleteCalls = [];

  get(name) {
    const value = this.values.get(name);
    return value === undefined ? undefined : { value };
  }

  set(name, value, options) {
    this.values.set(name, value);
    this.setCalls.push({ name, value, options });
  }

  delete(name, options) {
    this.values.delete(name);
    this.deleteCalls.push({ name, options });
  }
}

describe("BFF HTTP helpers", () => {
  it("serializes JSON while preserving response options", async () => {
    const response = json({ ok: true }, {
      status: 201,
      headers: { "x-request-id": "req-1" },
    });

    assert.equal(response.status, 201);
    assert.equal(response.headers.get("content-type"), "application/json");
    assert.equal(response.headers.get("x-request-id"), "req-1");
    assert.deepEqual(await response.json(), { ok: true });
  });

  it("does not expose raw Odoo details for unavailable errors", async () => {
    const rawOdooMessage =
      '{"jsonrpc":"2.0","error":{"data":{"debug":"Traceback: password=secret"}}}';
    const unavailable = bffErrorResponse(
      new BffError("odoo_unavailable", 503, rawOdooMessage)
    );

    assert.equal(unavailable.status, 503);
    const unavailableBody = await unavailable.json();
    assert.deepEqual(unavailableBody, {
      error: {
        code: "odoo_unavailable",
        message: "No se pudo conectar con el servidor",
      },
    });
    assert.doesNotMatch(JSON.stringify(unavailableBody), /jsonrpc|Traceback|secret/);
  });

  it("maps known and unexpected errors", async () => {
    const known = bffErrorResponse(
      new BffError("bad_credentials", 401, "Credenciales inválidas")
    );
    const unexpected = bffErrorResponse(new Error("secret"));

    assert.equal(known.status, 401);
    assert.deepEqual(await known.json(), {
      error: {
        code: "bad_credentials",
        message: "Usuario o contraseña incorrectos",
      },
    });
    assert.equal(unexpected.status, 503);
    assert.deepEqual(await unexpected.json(), {
      error: {
        code: "odoo_unavailable",
        message: "No se pudo conectar con el servidor",
      },
    });
  });

  it("sets, resolves, and clears the opaque BFF cookie", () => {
    const cookies = new FakeCookies();
    const bffSid = sessionStore.create("odoo-session", {
      uid: 2,
      name: "Admin",
      login: "admin",
    });

    setBffCookie(cookies, bffSid);
    const resolved = requireOdooSession(cookies);
    assert.equal(resolved.bffSid, bffSid);
    assert.equal(resolved.odooSessionId, "odoo-session");
    assert.deepEqual(resolved.session, {
      uid: 2,
      name: "Admin",
      login: "admin",
    });
    assert.ok(resolved.expiresAt > Date.now());
    assert.equal(cookies.setCalls[0].name, BFF_COOKIE);
    assert.equal(cookies.setCalls[0].options.httpOnly, true);
    assert.equal(cookies.setCalls[0].options.path, "/");
    assert.equal(cookies.setCalls[0].options.sameSite, "lax");
    assert.equal(cookies.setCalls[0].options.maxAge, 12 * 60 * 60);

    clearBffCookie(cookies);
    assert.deepEqual(cookies.deleteCalls, [{
      name: BFF_COOKIE,
      options: { path: "/" },
    }]);
    sessionStore.destroy(bffSid);
  });

  it("rejects missing and stale BFF sessions", () => {
    assert.throws(
      () => requireOdooSession(new FakeCookies()),
      (error) => error instanceof BffError && error.code === "unauthorized"
    );

    const cookies = new FakeCookies();
    cookies.values.set(BFF_COOKIE, "stale");
    assert.throws(
      () => requireOdooSession(cookies),
      (error) => error instanceof BffError && error.code === "unauthorized"
    );
  });

  it("destroys the local session and clears its cookie", () => {
    const cookies = new FakeCookies();
    const bffSid = sessionStore.create("expired-odoo-session", {
      uid: 2,
      name: "Admin",
      login: "admin",
    });
    cookies.values.set(BFF_COOKIE, bffSid);

    invalidateBffSession(cookies);

    assert.equal(sessionStore.get(bffSid), undefined);
    assert.deepEqual(cookies.deleteCalls, [{
      name: BFF_COOKIE,
      options: { path: "/" },
    }]);
  });
});

describe("BFF API routes", () => {
  it("returns the local session without exposing the Odoo session id", async () => {
    const cookies = new FakeCookies();
    const bffSid = sessionStore.create("private-odoo-session", {
      uid: 7,
      name: "Usuario",
      login: "usuario",
    });
    cookies.values.set(BFF_COOKIE, bffSid);

    const response = await getSession({ cookies });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      session: { uid: 7, name: "Usuario", login: "usuario" },
    });
    sessionStore.destroy(bffSid);
  });

  it("returns 401 for protected routes without a session", async () => {
    const cookies = new FakeCookies();
    const sessionResponse = await getSession({ cookies });
    const launcherResponse = await getLauncher({ cookies });
    const writeResponse = await postRecord({
      cookies,
      params: { slug: "sales/customers" },
      request: new Request("http://localhost/api/records/sales/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: 6, values: { phone: "1" } }),
      }),
    });
    const posCatalogResponse = await getPosCatalog({
      cookies,
      url: new URL("http://localhost/api/pos/catalog"),
    });
    const posCheckoutResponse = await postPosCheckout({
      cookies,
      request: new Request("http://localhost/api/pos/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lines: [{ productId: 1, qty: 1, price: 10 }] }),
      }),
    });

    assert.equal(sessionResponse.status, 401);
    assert.equal(launcherResponse.status, 401);
    assert.equal(writeResponse.status, 401);
    assert.equal(posCatalogResponse.status, 401);
    assert.equal(posCheckoutResponse.status, 401);
  });

  it("returns 404 for an unknown hub app", async () => {
    const response = await getHub({
      cookies: new FakeCookies(),
      params: { app: "unknown" },
      url: new URL("http://localhost/api/hub/unknown"),
    });

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), {
      error: { code: "not_found", message: "Hub no encontrado" },
    });
  });
});
