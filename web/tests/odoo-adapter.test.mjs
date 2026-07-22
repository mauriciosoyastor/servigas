import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { OdooAdapter } from "../src/lib/bff/odoo-adapter.ts";
import { BffError } from "../src/lib/bff/errors.ts";
import { BFF_COOKIE, MemorySessionStore } from "../src/lib/bff/session-store.ts";

describe("OdooAdapter.login", () => {
  it("maps auth failure to bad_credentials", async () => {
    const fetchImpl = mock.fn(async () =>
      Response.json({ error: { data: { message: "Access Denied" } } }, { status: 200 })
    );
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });
    await assert.rejects(
      () => adapter.login("bad", "bad"),
      (err) => err instanceof BffError && err.code === "bad_credentials"
    );
  });

  it("returns session on success", async () => {
    const fetchImpl = mock.fn(async () =>
      Response.json({
        result: { uid: 2, name: "Admin", username: "admin" },
      }, {
        status: 200,
        headers: { "set-cookie": "session_id=abc123; Path=/" },
      })
    );
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });
    const out = await adapter.login("admin", "admin");
    assert.deepEqual(out, {
      sessionId: "abc123",
      session: { uid: 2, name: "Admin", login: "admin" },
    });

    const [url, init] = fetchImpl.mock.calls[0].arguments;
    assert.equal(String(url), "http://odoo.test/web/session/authenticate");
    assert.deepEqual(JSON.parse(String(init.body)), {
      jsonrpc: "2.0",
      params: { db: "servigas_dev", login: "admin", password: "admin" },
    });
  });

  it("rejects authentication success without a session cookie", async () => {
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl: async () =>
        Response.json({
          result: { uid: 2, name: "Admin", username: "admin" },
        }),
    });

    await assert.rejects(
      () => adapter.login("admin", "admin"),
      (err) =>
        err instanceof BffError &&
        err.code === "odoo_unavailable" &&
        err.status === 503 &&
        /session_id/.test(err.message)
    );
  });

  it("maps network failures to odoo_unavailable", async () => {
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl: async () => {
        throw new TypeError("fetch failed");
      },
    });

    await assert.rejects(
      () => adapter.login("admin", "admin"),
      (err) =>
        err instanceof BffError &&
        err.code === "odoo_unavailable" &&
        err.status === 503
    );
  });
});

describe("OdooAdapter.getLauncher", () => {
  it("calls sg.app.tile get_launcher_payload", async () => {
    const calls = [];
    const fetchImpl = mock.fn(async (url, init) => {
      calls.push({ url: String(url), body: init?.body });
      return Response.json({ result: { tiles: [] } });
    });
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });
    const payload = await adapter.getLauncher("sess");
    assert.deepEqual(payload, { tiles: [] });
    assert.equal(calls[0].url, "http://odoo.test/web/dataset/call_kw");
    assert.match(String(calls[0].body), /get_launcher_payload/);
    assert.match(String(calls[0].body), /sg\.app\.tile/);
  });

  it("maps session JSON-RPC errors to unauthorized", async () => {
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl: async () =>
        Response.json({
          error: {
            code: 100,
            message: "Session expired",
            data: { message: "Access Denied" },
          },
        }),
    });

    await assert.rejects(
      () => adapter.getLauncher("expired"),
      (err) =>
        err instanceof BffError &&
        err.code === "unauthorized" &&
        err.status === 401
    );
  });

  it("maps other JSON-RPC errors to odoo_unavailable", async () => {
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl: async () =>
        Response.json({
          error: {
            code: 200,
            message: "Odoo Server Error",
            data: { message: "Database failure" },
          },
        }),
    });

    await assert.rejects(
      () => adapter.getLauncher("sess"),
      (err) =>
        err instanceof BffError &&
        err.code === "odoo_unavailable" &&
        err.status === 503
    );
  });

  it("rejects JSON-RPC responses without a result", async () => {
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl: async () => Response.json({ jsonrpc: "2.0" }),
    });

    await assert.rejects(
      () => adapter.getLauncher("sess"),
      (err) =>
        err instanceof BffError &&
        err.code === "odoo_unavailable" &&
        err.status === 503
    );
  });
});

describe("OdooAdapter.getHub", () => {
  it("calls sg.hub.card get_hub_payload with the requested section", async () => {
    const calls = [];
    const fetchImpl = mock.fn(async (url, init) => {
      calls.push({ url: String(url), init });
      return Response.json({
        result: {
          app: "inventory",
          section: "operations",
          sections: [],
          groups: [],
          cards: [],
        },
      });
    });
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test/",
      db: "servigas_dev",
      fetchImpl,
    });

    const payload = await adapter.getHub("sess", "inventory", "operations");

    assert.equal(payload.section, "operations");
    assert.equal(calls[0].init.headers.cookie, "session_id=sess");
    assert.deepEqual(JSON.parse(String(calls[0].init.body)).params, {
      model: "sg.hub.card",
      method: "get_hub_payload",
      args: ["inventory", "operations"],
      kwargs: {},
    });
  });

  it("defaults the section to summary", async () => {
    const fetchImpl = mock.fn(async (_url, init) => {
      const request = JSON.parse(String(init.body));
      return Response.json({
        result: {
          app: request.params.args[0],
          section: request.params.args[1],
          sections: [],
          groups: [],
          cards: [],
        },
      });
    });
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });

    const payload = await adapter.getHub("sess", "inventory");

    assert.equal(payload.section, "summary");
  });

  it("maps network failures to odoo_unavailable", async () => {
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl: async () => {
        throw new TypeError("fetch failed");
      },
    });

    await assert.rejects(
      () => adapter.getHub("sess", "inventory"),
      (err) => err instanceof BffError && err.code === "odoo_unavailable"
    );
  });
});

describe("OdooAdapter.logout", () => {
  it("posts to the destroy endpoint with the Odoo session cookie", async () => {
    const fetchImpl = mock.fn(async () => Response.json({ result: true }));
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });

    await adapter.logout("sess");

    const [url, init] = fetchImpl.mock.calls[0].arguments;
    assert.equal(String(url), "http://odoo.test/web/session/destroy");
    assert.equal(init.headers.cookie, "session_id=sess");
    assert.equal(init.method, "POST");
  });

  it("ignores fetch failures", async () => {
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl: async () => {
        throw new TypeError("fetch failed");
      },
    });

    await assert.doesNotReject(() => adapter.logout("sess"));
  });
});

describe("MemorySessionStore", () => {
  it("creates, retrieves, and destroys a BFF session", () => {
    const store = new MemorySessionStore();
    const session = { uid: 2, name: "Admin", login: "admin" };

    const bffSid = store.create("odoo-session", session);

    assert.match(bffSid, /^[0-9a-f-]{36}$/);
    assert.deepEqual(store.get(bffSid), {
      odooSessionId: "odoo-session",
      session,
    });
    store.destroy(bffSid);
    assert.equal(store.get(bffSid), undefined);
    assert.equal(BFF_COOKIE, "sg_bff_sid");
  });
});
