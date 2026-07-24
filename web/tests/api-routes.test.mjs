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
import { __setBackendForTests } from "../src/lib/bff/get-backend.ts";
import { GET as getSession } from "../src/pages/api/auth/session.ts";
import { POST as postLogin } from "../src/pages/api/auth/login.ts";
import { POST as postChangePassword } from "../src/pages/api/auth/change-password.ts";
import { GET as getLauncher } from "../src/pages/api/launcher.ts";
import { GET as getHub } from "../src/pages/api/hub/[app].ts";
import { POST as postRecord } from "../src/pages/api/records/[...slug].ts";
import {
  GET as getNotes,
  PATCH as patchNote,
  POST as postNote,
} from "../src/pages/api/notes.ts";
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
    const checkout = bffErrorResponse(
      new BffError("checkout_failed", 503, "raw odoo")
    );

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
    assert.equal(checkout.status, 503);
    assert.deepEqual(await checkout.json(), {
      error: {
        code: "checkout_failed",
        message: "No se pudo registrar la venta en caja",
      },
    });
  });

  it("invalidates the BFF session on unauthorized API errors", () => {
    const cookies = new FakeCookies();
    const bffSid = sessionStore.create("dead-odoo", {
      uid: 2,
      name: "Admin",
      login: "admin",
    });
    cookies.values.set(BFF_COOKIE, bffSid);

    const response = bffErrorResponse(
      new BffError("unauthorized", 401, "La sesión de Odoo no es válida"),
      cookies
    );

    assert.equal(response.status, 401);
    assert.equal(sessionStore.get(bffSid), undefined);
    assert.deepEqual(cookies.deleteCalls, [
      { name: BFF_COOKIE, options: { path: "/" } },
    ]);
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
    __setBackendForTests({
      validateSession: async () => {},
    });

    try {
      const response = await getSession({ cookies });

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), {
        session: { uid: 7, name: "Usuario", login: "usuario" },
      });
    } finally {
      __setBackendForTests(undefined);
      sessionStore.destroy(bffSid);
    }
  });

  it("clears BFF session when Odoo rejects validateSession", async () => {
    const cookies = new FakeCookies();
    const bffSid = sessionStore.create("stale-odoo", {
      uid: 7,
      name: "Usuario",
      login: "usuario",
    });
    cookies.values.set(BFF_COOKIE, bffSid);
    __setBackendForTests({
      validateSession: async () => {
        throw new BffError("unauthorized", 401, "dead");
      },
    });

    try {
      const response = await getSession({ cookies });
      assert.equal(response.status, 401);
      assert.equal(sessionStore.get(bffSid), undefined);
    } finally {
      __setBackendForTests(undefined);
    }
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
      error: { code: "not_found", message: "No encontrado" },
    });
  });

  it("rejects empty login credentials with validation_error", async () => {
    const response = await postLogin({
      cookies: new FakeCookies(),
      request: new Request("http://localhost/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ login: "  ", password: "" }),
      }),
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: {
        code: "validation_error",
        message: "Usuario y contraseña son requeridos",
      },
    });
  });

  it("rejects invalid record action with validation_error", async () => {
    const cookies = new FakeCookies();
    const bffSid = sessionStore.create("odoo", {
      uid: 1,
      name: "A",
      login: "a",
    });
    cookies.values.set(BFF_COOKIE, bffSid);
    const response = await postRecord({
      cookies,
      params: { slug: "sales/customers" },
      request: new Request("http://localhost/api/records/sales/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "explode", id: 1, values: {} }),
      }),
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: {
        code: "validation_error",
        message: "Acción inválida",
      },
    });
    sessionStore.destroy(bffSid);
  });

  it("returns 401 when listing notes without a session", async () => {
    const response = await getNotes({
      cookies: new FakeCookies(),
      url: new URL("http://localhost/api/notes?listKey=sales/customers&recordId=1"),
    });

    assert.equal(response.status, 401);
  });

  it("returns 404 when listing notes for an invalid list key", async () => {
    const cookies = new FakeCookies();
    const bffSid = sessionStore.create("odoo", {
      uid: 7,
      name: "Usuario",
      login: "usuario",
    });
    cookies.values.set(BFF_COOKIE, bffSid);
    __setBackendForTests({
      listRecordNotes: async () => {
        throw new BffError("not_found", 404, "Bitácora no disponible");
      },
    });

    try {
      const response = await getNotes({
        cookies,
        url: new URL("http://localhost/api/notes?listKey=unknown&recordId=1"),
      });

      assert.equal(response.status, 404);
      assert.deepEqual(await response.json(), {
        error: { code: "not_found", message: "No encontrado" },
      });
    } finally {
      __setBackendForTests(undefined);
      sessionStore.destroy(bffSid);
    }
  });

  it("rejects an empty note body", async () => {
    const cookies = new FakeCookies();
    const bffSid = sessionStore.create("odoo", {
      uid: 7,
      name: "Usuario",
      login: "usuario",
    });
    cookies.values.set(BFF_COOKIE, bffSid);

    try {
      const response = await postNote({
        cookies,
        request: new Request("http://localhost/api/notes", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            listKey: "sales/customers",
            recordId: 1,
            body: "   ",
          }),
        }),
      });

      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), {
        error: { code: "validation_error", message: "Escribí una nota" },
      });
    } finally {
      sessionStore.destroy(bffSid);
    }
  });

  it("returns 403 when updating another user's note", async () => {
    const cookies = new FakeCookies();
    const bffSid = sessionStore.create("odoo", {
      uid: 7,
      name: "Usuario",
      login: "usuario",
    });
    cookies.values.set(BFF_COOKIE, bffSid);
    __setBackendForTests({
      updateRecordNote: async () => {
        throw new BffError("forbidden", 403, "Solo podés editar tus propias notas");
      },
    });

    try {
      const response = await patchNote({
        cookies,
        request: new Request("http://localhost/api/notes", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: 5, body: "Cambio" }),
        }),
      });

      assert.equal(response.status, 403);
      assert.deepEqual(await response.json(), {
        error: {
          code: "forbidden",
          message: "Solo podés editar tus propias notas",
        },
      });
    } finally {
      __setBackendForTests(undefined);
      sessionStore.destroy(bffSid);
    }
  });

  it("creates a normalized note for the current viewer", async () => {
    const cookies = new FakeCookies();
    const bffSid = sessionStore.create("odoo", {
      uid: 7,
      name: "Usuario",
      login: "usuario",
    });
    cookies.values.set(BFF_COOKIE, bffSid);
    let received;
    const note = {
      id: 1,
      body: "Primera nota",
      authorId: 7,
      authorName: "Usuario",
      createdAt: "2026-07-23 19:00:00",
      updatedAt: "2026-07-23 19:00:00",
      canEdit: true,
    };
    __setBackendForTests({
      createRecordNote: async (...args) => {
        received = args;
        return note;
      },
    });

    try {
      const response = await postNote({
        cookies,
        request: new Request("http://localhost/api/notes", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            listKey: "sales/customers",
            recordId: 4,
            body: "  Primera nota  ",
          }),
        }),
      });

      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { ok: true, note });
      assert.deepEqual(received, [
        "odoo",
        "sales/customers",
        4,
        "Primera nota",
        7,
      ]);
    } finally {
      __setBackendForTests(undefined);
      sessionStore.destroy(bffSid);
    }
  });
});

describe("POST /api/auth/change-password", () => {
  it("returns 401 without BFF session", async () => {
    const response = await postChangePassword({
      cookies: new FakeCookies(),
      request: new Request("http://localhost/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: "a",
          newPassword: "b",
        }),
      }),
    });
    assert.equal(response.status, 401);
  });

  it("validates required passwords", async () => {
    const cookies = new FakeCookies();
    const bffSid = sessionStore.create("odoo", {
      uid: 1,
      name: "A",
      login: "a",
    });
    cookies.values.set(BFF_COOKIE, bffSid);
    try {
      const response = await postChangePassword({
        cookies,
        request: new Request("http://localhost/api/auth/change-password", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ currentPassword: "", newPassword: "" }),
        }),
      });
      assert.equal(response.status, 400);
      const body = await response.json();
      assert.equal(body.error.code, "validation_error");
      assert.equal(sessionStore.get(bffSid)?.odooSessionId, "odoo");
    } finally {
      sessionStore.destroy(bffSid);
    }
  });

  it("changes password then destroys BFF session and clears cookie", async () => {
    const cookies = new FakeCookies();
    const bffSid = sessionStore.create("odoo-sid", {
      uid: 2,
      name: "Admin",
      login: "admin",
    });
    cookies.values.set(BFF_COOKIE, bffSid);
    const calls = [];
    __setBackendForTests({
      changePassword: async (...args) => {
        calls.push(["changePassword", ...args]);
      },
      logout: async (...args) => {
        calls.push(["logout", ...args]);
      },
    });
    try {
      const response = await postChangePassword({
        cookies,
        request: new Request("http://localhost/api/auth/change-password", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            currentPassword: "old",
            newPassword: "new",
          }),
        }),
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { ok: true });
      assert.deepEqual(calls, [
        ["changePassword", "odoo-sid", "old", "new"],
        ["logout", "odoo-sid"],
      ]);
      assert.equal(sessionStore.get(bffSid), undefined);
      assert.ok(cookies.deleteCalls.some((c) => c.name === BFF_COOKIE));
    } finally {
      __setBackendForTests(undefined);
    }
  });

  it("keeps BFF session when current password is wrong", async () => {
    const cookies = new FakeCookies();
    const bffSid = sessionStore.create("odoo-sid", {
      uid: 2,
      name: "Admin",
      login: "admin",
    });
    cookies.values.set(BFF_COOKIE, bffSid);
    __setBackendForTests({
      changePassword: async () => {
        throw new BffError(
          "validation_error",
          400,
          "La contraseña actual no es correcta"
        );
      },
    });
    try {
      const response = await postChangePassword({
        cookies,
        request: new Request("http://localhost/api/auth/change-password", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            currentPassword: "bad",
            newPassword: "new",
          }),
        }),
      });
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), {
        error: {
          code: "validation_error",
          message: "La contraseña actual no es correcta",
        },
      });
      assert.equal(sessionStore.get(bffSid)?.odooSessionId, "odoo-sid");
    } finally {
      __setBackendForTests(undefined);
      sessionStore.destroy(bffSid);
    }
  });
});
