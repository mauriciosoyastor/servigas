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

  it("maps AbortSignal timeouts to odoo_unavailable", async () => {
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      timeoutMs: 1000,
      fetchImpl: async (_url, init) => {
        assert.ok(init?.signal instanceof AbortSignal);
        const err = new Error("aborted");
        err.name = "TimeoutError";
        throw err;
      },
    });

    await assert.rejects(
      () => adapter.login("admin", "admin"),
      (err) =>
        err instanceof BffError &&
        err.code === "odoo_unavailable" &&
        /Timeout/i.test(err.message)
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

describe("OdooAdapter.validateSession", () => {
  it("validates the Odoo session with its private cookie", async () => {
    const fetchImpl = mock.fn(async () =>
      Response.json({ result: { uid: 2 } })
    );
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });

    await adapter.validateSession("sess");

    const [url, init] = fetchImpl.mock.calls[0].arguments;
    assert.equal(String(url), "http://odoo.test/web/session/get_session_info");
    assert.equal(init.headers.cookie, "session_id=sess");
  });

  it("maps an expired Odoo session to unauthorized", async () => {
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl: async () => Response.json({ result: { uid: false } }),
    });

    await assert.rejects(
      () => adapter.validateSession("expired"),
      (err) => err instanceof BffError && err.code === "unauthorized"
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

describe("OdooAdapter.getRecordList", () => {
  it("search_reads the allowlisted products list with image urls", async () => {
    const fetchImpl = mock.fn(async (_url, init) => {
      const body = JSON.parse(String(init.body));
      if (body.params.method === "search_read") {
        return Response.json({
          result: [
            {
              id: 10,
              name: "Calefactor",
              default_code: "CAL-01",
              qty_available: 3,
              active: true,
            },
          ],
        });
      }
      if (body.params.method === "search_count") {
        return Response.json({ result: 8771 });
      }
      return Response.json({ result: null });
    });
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });

    const payload = await adapter.getRecordList("sess", "inventory/products", {
      q: "",
      page: 2,
    });

    assert.equal(payload.title, "Productos");
    assert.equal(payload.model, "product.template");
    assert.equal(payload.total, 8771);
    assert.equal(payload.page, 2);
    assert.equal(payload.rows[0].name, "Calefactor");
    assert.equal(
      payload.rows[0].image_url,
      "/api/media/product.template/10/image_128"
    );
    assert.equal(
      payload.rows[0].detail_path,
      "/lists/inventory/products/10"
    );

    const searchRead = JSON.parse(String(fetchImpl.mock.calls[0].arguments[1].body));
    assert.equal(searchRead.params.model, "product.template");
    assert.equal(searchRead.params.method, "search_read");
    assert.deepEqual(searchRead.params.args, [[["active", "=", true]]]);
    assert.equal(searchRead.params.kwargs.limit, 50);
    assert.equal(searchRead.params.kwargs.offset, 50);
  });

  it("applies search query to domain", async () => {
    const fetchImpl = mock.fn(async (_url, init) => {
      const body = JSON.parse(String(init.body));
      if (body.params.method === "search_read") {
        return Response.json({ result: [] });
      }
      return Response.json({ result: 0 });
    });
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });

    await adapter.getRecordList("sess", "inventory/products", { q: "gas" });
    const searchRead = JSON.parse(String(fetchImpl.mock.calls[0].arguments[1].body));
    assert.ok(
      JSON.stringify(searchRead.params.args[0]).includes("ilike")
    );
  });

  it("rejects unknown list keys", async () => {
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl: async () => Response.json({ result: [] }),
    });

    await assert.rejects(
      () => adapter.getRecordList("sess", "inventory/unknown"),
      (err) => err instanceof BffError && err.code === "not_found"
    );
  });
});

describe("OdooAdapter.getRecordDetail", () => {
  it("reads a product template detail", async () => {
    const fetchImpl = mock.fn(async () =>
      Response.json({
        result: [
          {
            id: 10,
            name: "Calefactor",
            default_code: "CAL-01",
            qty_available: 3,
            active: true,
          },
        ],
      })
    );
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });

    const detail = await adapter.getRecordDetail(
      "sess",
      "inventory/products",
      10
    );
    assert.equal(detail.title, "Calefactor");
    assert.equal(detail.imageUrl, "/api/media/product.template/10/image_128");
    assert.equal(detail.listPath, "/lists/inventory/products");
  });

  it("reads a sale order detail with column labels", async () => {
    const fetchImpl = mock.fn(async (url, init) => {
      const body = init?.body ? JSON.parse(init.body) : {};
      const method = body?.params?.method;
      const model = body?.params?.model;
      if (method === "read" && model === "sale.order") {
        return Response.json({
          result: [
            {
              id: 42,
              name: "S00042",
              partner_id: [7, "Cliente Demo"],
              date_order: "2026-07-01 12:00:00",
              amount_total: 1500,
              state: "sale",
            },
          ],
        });
      }
      if (method === "search_read" && model === "sale.order.line") {
        return Response.json({
          result: [
            {
              id: 1,
              product_id: [9, "Calefactor"],
              product_uom_qty: 2,
              price_unit: 750,
              price_subtotal: 1500,
            },
          ],
        });
      }
      return Response.json({ result: [] });
    });
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });

    const detail = await adapter.getRecordDetail("sess", "sales/orders", 42);
    assert.equal(detail.title, "S00042");
    assert.equal(detail.listPath, "/lists/sales/orders");
    assert.equal(detail.imageUrl, null);
    const partner = detail.fields.find((field) => field.key === "partner_id");
    assert.equal(partner?.label, "Contacto");
    assert.equal(partner?.value, "Cliente Demo");
    assert.equal(detail.lines?.title, "Líneas");
    assert.equal(detail.lines?.rows.length, 1);
    assert.equal(detail.lines?.rows[0].product_id, "Calefactor");
  });

  it("loads stock.picking move lines", async () => {
    const fetchImpl = mock.fn(async (_url, init) => {
      const body = init?.body ? JSON.parse(init.body) : {};
      const method = body?.params?.method;
      const model = body?.params?.model;
      if (method === "read" && model === "stock.picking") {
        return Response.json({
          result: [
            {
              id: 4,
              name: "WH/OUT/0001",
              partner_id: false,
              scheduled_date: "2026-07-01",
              state: "done",
              origin: "POS",
            },
          ],
        });
      }
      if (method === "search_read" && model === "stock.move") {
        return Response.json({
          result: [
            {
              id: 20,
              product_id: [3, "Calefactor"],
              product_uom_qty: 1,
              quantity: 1,
              state: "done",
            },
          ],
        });
      }
      return Response.json({ result: [] });
    });
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });

    const detail = await adapter.getRecordDetail(
      "sess",
      "inventory/transfers",
      4
    );
    assert.equal(detail.lines?.rows.length, 1);
    assert.equal(detail.lines?.rows[0].product_id, "Calefactor");
  });

  it("loads pos.order lines with discount percent", async () => {
    const fetchImpl = mock.fn(async (_url, init) => {
      const body = init?.body ? JSON.parse(init.body) : {};
      const method = body?.params?.method;
      const model = body?.params?.model;
      if (method === "read" && model === "pos.order") {
        return Response.json({
          result: [
            {
              id: 7,
              name: "Mostrador Servigas - 000003",
              partner_id: false,
              date_order: "2026-07-22 12:00:00",
              amount_total: 68.72,
              state: "paid",
            },
          ],
        });
      }
      if (method === "search_read" && model === "pos.order.line") {
        const fields = body?.params?.kwargs?.fields || [];
        if (!fields.includes("discount")) {
          return Response.json({
            error: { data: { message: "missing discount field" } },
          });
        }
        return Response.json({
          result: [
            {
              id: 1,
              product_id: [42, "Arandela"],
              qty: 1,
              price_unit: 76.35,
              discount: 10,
              price_subtotal: 68.72,
            },
          ],
        });
      }
      return Response.json({ result: [] });
    });
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });

    const detail = await adapter.getRecordDetail("sess", "sales/pos-orders", 7);
    assert.equal(detail.lines?.columns.some((col) => col.key === "discount"), true);
    assert.equal(detail.lines?.rows[0].discount, 10);
    assert.equal(detail.lines?.rows[0].product_id, "Arandela");
  });

  it("loads account.move lines with product display_type domain", async () => {
    const fetchImpl = mock.fn(async (_url, init) => {
      const body = init?.body ? JSON.parse(init.body) : {};
      const method = body?.params?.method;
      const model = body?.params?.model;
      if (method === "read" && model === "account.move") {
        return Response.json({
          result: [
            {
              id: 9,
              name: "FC0001",
              partner_id: [1, "Cliente"],
              invoice_date: "2026-07-01",
              amount_total: 100,
              payment_state: "not_paid",
              state: "posted",
            },
          ],
        });
      }
      if (method === "search_read" && model === "account.move.line") {
        const domain = body?.params?.args?.[0] || [];
        const domainText = JSON.stringify(domain);
        if (!domainText.includes("display_type") || !domainText.includes("product")) {
          return Response.json({
            error: { data: { message: "missing product display_type filter" } },
          });
        }
        return Response.json({
          result: [
            {
              id: 11,
              name: "Calefactor",
              product_id: [3, "Calefactor"],
              quantity: 1,
              price_unit: 100,
              price_subtotal: 100,
            },
          ],
        });
      }
      return Response.json({ result: [] });
    });
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });

    const detail = await adapter.getRecordDetail(
      "sess",
      "accounting/customer-invoices",
      9
    );
    assert.equal(detail.lines?.rows.length, 1);
    assert.equal(detail.lines?.rows[0].product_id, "Calefactor");
  });
});

describe("OdooAdapter.getPosCatalog", () => {
  it("loads POS config, payment methods and saleable products", async () => {
    const fetchImpl = mock.fn(async (_url, init) => {
      const body = init?.body ? JSON.parse(init.body) : {};
      const model = body?.params?.model;
      const method = body?.params?.method;
      if (model === "pos.config" && method === "search_read") {
        return Response.json({
          result: [
            {
              id: 1,
              name: "Mostrador Servigas",
              payment_method_ids: [1, 2],
            },
          ],
        });
      }
      if (model === "pos.payment.method" && method === "search_read") {
        return Response.json({
          result: [
            { id: 1, name: "Cash", is_cash_count: true },
            { id: 2, name: "Card", is_cash_count: false },
          ],
        });
      }
      if (model === "product.product" && method === "search_read") {
        return Response.json({
          result: [
            {
              id: 42,
              display_name: "Calefactor",
              default_code: "CAL-01",
              list_price: 1500,
            },
          ],
        });
      }
      if (model === "product.product" && method === "search_count") {
        return Response.json({ result: 1 });
      }
      return Response.json({ result: [] });
    });
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });

    const catalog = await adapter.getPosCatalog("sess", { q: "cale" });
    assert.equal(catalog.config?.name, "Mostrador Servigas");
    assert.equal(catalog.products.length, 1);
    assert.equal(catalog.products[0].image_url, "/api/media/product.product/42/image_128");
    assert.equal(catalog.total, 1);
    assert.equal(catalog.paymentMethods.length, 2);
    assert.equal(catalog.paymentMethods[0].name, "Cash");
    assert.equal(catalog.paymentMethods[1].id, 2);
  });
});

describe("OdooAdapter.checkoutPosCart", () => {
  it("creates a paid pos.order with selected payment method and discount", async () => {
    const fetchImpl = mock.fn(async (_url, init) => {
      const body = init?.body ? JSON.parse(init.body) : {};
      const model = body?.params?.model;
      const method = body?.params?.method;
      if (model === "pos.config" && method === "search_read") {
        return Response.json({
          result: [{ id: 1, name: "Mostrador Servigas" }],
        });
      }
      if (model === "pos.session" && method === "search_read") {
        return Response.json({
          result: [{ id: 4, name: "Mostrador Servigas/00002", state: "opened" }],
        });
      }
      if (model === "pos.payment.method" && method === "search_read") {
        return Response.json({
          result: [
            { id: 1, name: "Cash", is_cash_count: true },
            { id: 2, name: "Card", is_cash_count: false },
          ],
        });
      }
      if (model === "pos.order" && method === "create") {
        return Response.json({ result: 55 });
      }
      if (model === "pos.order" && method === "write") {
        return Response.json({ result: true });
      }
      if (model === "pos.order" && method === "action_pos_order_paid") {
        return Response.json({ result: true });
      }
      if (model === "pos.order" && method === "read") {
        return Response.json({
          result: [{ id: 55, name: "Mostrador Servigas - 000099" }],
        });
      }
      return Response.json({ result: true });
    });
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });

    const result = await adapter.checkoutPosCart(
      "sess",
      [{ productId: 42, qty: 2, price: 100, discount: 10 }],
      { paymentMethodId: 2 }
    );
    assert.equal(result.orderId, 55);
    assert.equal(result.orderName, "Mostrador Servigas - 000099");
    assert.equal(result.detailPath, "/lists/sales/pos-orders/55");
    assert.equal(result.channel, "pos.order");
    assert.equal(result.paymentMethodId, 2);
    assert.equal(result.paymentMethodName, "Card");
    assert.equal(result.amountTotal, 180);

    const bodies = fetchImpl.mock.calls.map((call) =>
      JSON.parse(call.arguments[1].body)
    );
    const createCall = bodies.find(
      (body) =>
        body.params?.model === "pos.order" && body.params?.method === "create"
    );
    assert.equal(createCall.params.args[0].session_id, 4);
    assert.equal(createCall.params.args[0].lines[0][2].product_id, 42);
    assert.equal(createCall.params.args[0].lines[0][2].discount, 10);
    assert.equal(createCall.params.args[0].amount_total, 180);
    const writeCall = bodies.find(
      (body) =>
        body.params?.model === "pos.order" && body.params?.method === "write"
    );
    assert.equal(
      writeCall.params.args[1].payment_ids[0][2].payment_method_id,
      2
    );
    assert.equal(writeCall.params.args[1].amount_paid, 180);
  });

  it("fails loud when POS session cannot open and never creates sale.order", async () => {
    const fetchImpl = mock.fn(async (_url, init) => {
      const body = init?.body ? JSON.parse(init.body) : {};
      const model = body?.params?.model;
      const method = body?.params?.method;
      if (model === "pos.config" && method === "search_read") {
        return Response.json({
          result: [{ id: 1, name: "Mostrador Servigas" }],
        });
      }
      if (model === "pos.session" && method === "search_read") {
        return Response.json({ result: [] });
      }
      if (model === "pos.config" && method === "open_session_cb") {
        return Response.json({
          error: { message: "Opening control required", data: { message: "fail" } },
        });
      }
      if (model === "pos.session" && method === "create") {
        return Response.json({
          error: { message: "Create denied", data: { message: "fail" } },
        });
      }
      // Legacy silent fallback paths — must not be used after fail-loud.
      if (model === "res.partner" && method === "search") {
        return Response.json({ result: [7] });
      }
      if (model === "sale.order" && method === "create") {
        return Response.json({ result: 99 });
      }
      if (model === "sale.order" && method === "action_confirm") {
        return Response.json({ result: true });
      }
      if (model === "sale.order" && method === "read") {
        return Response.json({ result: [{ id: 99, name: "S00099" }] });
      }
      return Response.json({ result: true });
    });
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });

    await assert.rejects(
      () =>
        adapter.checkoutPosCart(
          "sess",
          [{ productId: 42, qty: 1, price: 100, discount: 0 }],
          { paymentMethodId: 1 }
        ),
      (error) => error?.code === "checkout_failed"
    );

    const models = fetchImpl.mock.calls.map((call) => {
      const body = JSON.parse(call.arguments[1].body);
      return body.params?.model;
    });
    assert.ok(!models.includes("sale.order"));
    assert.ok(!models.includes("res.partner"));
  });
});

describe("OdooAdapter.updateRecord", () => {
  it("writes allowlisted partner fields", async () => {
    const fetchImpl = mock.fn(async () => Response.json({ result: true }));
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });

    await adapter.updateRecord("sess", "sales/customers", 6, {
      phone: "11-9999",
      name: "ignored",
    });

    const [, init] = fetchImpl.mock.calls[0].arguments;
    const body = JSON.parse(init.body);
    assert.equal(body.params.model, "res.partner");
    assert.equal(body.params.method, "write");
    assert.deepEqual(body.params.args, [[6], { phone: "11-9999" }]);
  });

  it("rejects unknown write targets", async () => {
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl: async () => Response.json({ result: true }),
    });

    await assert.rejects(
      () => adapter.updateRecord("sess", "inventory/products", 1, { name: "x" }),
      (error) => error?.code === "not_found"
    );
  });
});

describe("OdooAdapter.createRecord", () => {
  it("creates a customer with defaults and returns detail path", async () => {
    const fetchImpl = mock.fn(async () => Response.json({ result: 88 }));
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });

    const result = await adapter.createRecord("sess", "sales/customers", {
      name: "Cliente Nuevo",
      phone: "11-0000",
    });
    assert.equal(result.id, 88);
    assert.equal(result.detailPath, "/lists/sales/customers/88");

    const body = JSON.parse(fetchImpl.mock.calls[0].arguments[1].body);
    assert.equal(body.params.model, "res.partner");
    assert.equal(body.params.method, "create");
    assert.deepEqual(body.params.args[0], {
      name: "Cliente Nuevo",
      phone: "11-0000",
      customer_rank: 1,
    });
  });
});

describe("OdooAdapter.archiveRecord", () => {
  it("archives a partner with active=false", async () => {
    const fetchImpl = mock.fn(async () => Response.json({ result: true }));
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });

    await adapter.archiveRecord("sess", "sales/customers", 88);
    const body = JSON.parse(fetchImpl.mock.calls[0].arguments[1].body);
    assert.equal(body.params.method, "write");
    assert.deepEqual(body.params.args, [[88], { active: false }]);
  });
});

describe("OdooAdapter.createRecord products", () => {
  it("creates a product.template with defaults", async () => {
    const fetchImpl = mock.fn(async () => Response.json({ result: 501 }));
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });

    const result = await adapter.createRecord("sess", "inventory/products", {
      name: "Producto Astro",
      default_code: "AST-01",
      list_price: "2500",
    });
    assert.equal(result.id, 501);
    assert.equal(result.detailPath, "/lists/inventory/products/501");

    const body = JSON.parse(fetchImpl.mock.calls[0].arguments[1].body);
    assert.equal(body.params.model, "product.template");
    assert.deepEqual(body.params.args[0], {
      name: "Producto Astro",
      default_code: "AST-01",
      list_price: 2500,
      sale_ok: true,
      is_storable: true,
    });
  });
});

describe("OdooAdapter.createRecord quotations", () => {
  it("creates a draft sale.order with one line", async () => {
    const fetchImpl = mock.fn(async () => Response.json({ result: 77 }));
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });

    const result = await adapter.createRecord("sess", "sales/quotations", {
      partnerId: 6,
      productId: 42,
      qty: 2,
    });
    assert.equal(result.id, 77);
    assert.equal(result.detailPath, "/lists/sales/quotations/77");

    const body = JSON.parse(fetchImpl.mock.calls[0].arguments[1].body);
    assert.equal(body.params.model, "sale.order");
    assert.equal(body.params.method, "create");
    assert.equal(body.params.args[0].partner_id, 6);
    assert.deepEqual(body.params.args[0].order_line[0][2], {
      product_id: 42,
      product_uom_qty: 2,
    });
  });
});

describe("OdooAdapter.createRecord RFQ", () => {
  it("creates a draft purchase.order with product_qty line", async () => {
    const fetchImpl = mock.fn(async () => Response.json({ result: 91 }));
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });

    const result = await adapter.createRecord("sess", "purchase/rfq", {
      partnerId: 8,
      productId: 42,
      qty: 3,
    });
    assert.equal(result.id, 91);
    assert.equal(result.detailPath, "/lists/purchase/orders/91");

    const body = JSON.parse(fetchImpl.mock.calls[0].arguments[1].body);
    assert.equal(body.params.model, "purchase.order");
    assert.deepEqual(body.params.args[0].order_line[0][2], {
      product_id: 42,
      product_qty: 3,
    });
  });
});

describe("OdooAdapter.confirmRecord", () => {
  it("calls action_confirm on sale.order quotations", async () => {
    let reads = 0;
    const fetchImpl = mock.fn(async (_url, init) => {
      const body = init?.body ? JSON.parse(init.body) : {};
      if (body.params?.method === "read") {
        reads += 1;
        return Response.json({
          result: [
            {
              id: 12,
              state: reads === 1 ? "draft" : "sale",
              name: "S00012",
            },
          ],
        });
      }
      return Response.json({ result: true });
    });
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });

    const result = await adapter.confirmRecord("sess", "sales/quotations", 12);
    assert.equal(result.ok, true);
    assert.equal(result.state, "sale");

    const bodies = fetchImpl.mock.calls.map((call) =>
      JSON.parse(call.arguments[1].body)
    );
    const confirmCall = bodies.find(
      (body) => body.params?.method === "action_confirm"
    );
    assert.equal(confirmCall.params.model, "sale.order");
    assert.deepEqual(confirmCall.params.args, [[12]]);
  });

  it("rejects confirm when state is not confirmable", async () => {
    const fetchImpl = mock.fn(async () =>
      Response.json({
        result: [{ id: 12, state: "sale", name: "S00012" }],
      })
    );
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });

    await assert.rejects(
      () => adapter.confirmRecord("sess", "sales/quotations", 12),
      (error) => error?.code === "not_found"
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
    const entry = store.get(bffSid);
    assert.ok(entry);
    assert.equal(entry.odooSessionId, "odoo-session");
    assert.deepEqual(entry.session, session);
    assert.ok(entry.expiresAt > Date.now());
    store.destroy(bffSid);
    assert.equal(store.get(bffSid), undefined);
    assert.equal(BFF_COOKIE, "sg_bff_sid");
  });
});
