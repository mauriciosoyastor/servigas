import type { BackendClient } from "./backend-client.ts";
import { BffError } from "./errors.ts";
import type {
  HubPayload,
  LauncherPayload,
  PosCatalogPayload,
  PosCheckoutLine,
  PosCheckoutOptions,
  PosCheckoutResult,
  PosPaymentMethod,
  RecordDetailLines,
  RecordDetailPayload,
  RecordListPayload,
  RecordListRow,
  SessionInfo,
} from "./types.ts";
import {
  buildDetailPath,
  buildSearchDomain,
  getRecordListDef,
  isAllowedMedia,
  mediaPath,
  type RecordListQuery,
} from "../shell/record-lists.ts";
import {
  getRecordActionDef,
  isConfirmableState,
} from "../shell/record-actions.ts";
import {
  filterOrderCreateValues,
  getOrderCreateDef,
} from "../shell/order-creates.ts";
import {
  canArchiveRecord,
  filterCreateValues,
  filterWritableValues,
  getRecordWriteDef,
} from "../shell/record-writes.ts";

type DetailLineDef = {
  model: string;
  domainField: string;
  fields: string[];
  columns: { key: string; label: string }[];
  order: string;
  title: string;
  extraDomain?: unknown[];
};

const DETAIL_LINES: Record<string, DetailLineDef> = {
  "sale.order": {
    model: "sale.order.line",
    domainField: "order_id",
    fields: ["product_id", "product_uom_qty", "price_unit", "price_subtotal"],
    columns: [
      { key: "product_id", label: "Producto" },
      { key: "product_uom_qty", label: "Cantidad" },
      { key: "price_unit", label: "Precio" },
      { key: "price_subtotal", label: "Subtotal" },
    ],
    order: "id asc",
    title: "Líneas",
  },
  "purchase.order": {
    model: "purchase.order.line",
    domainField: "order_id",
    fields: ["product_id", "product_qty", "price_unit", "price_subtotal"],
    columns: [
      { key: "product_id", label: "Producto" },
      { key: "product_qty", label: "Cantidad" },
      { key: "price_unit", label: "Precio" },
      { key: "price_subtotal", label: "Subtotal" },
    ],
    order: "id asc",
    title: "Líneas",
  },
  "pos.order": {
    model: "pos.order.line",
    domainField: "order_id",
    fields: ["product_id", "qty", "price_unit", "discount", "price_subtotal"],
    columns: [
      { key: "product_id", label: "Producto" },
      { key: "qty", label: "Cantidad" },
      { key: "price_unit", label: "Precio" },
      { key: "discount", label: "Desc. %" },
      { key: "price_subtotal", label: "Subtotal" },
    ],
    order: "id asc",
    title: "Líneas",
  },
  "account.move": {
    model: "account.move.line",
    domainField: "move_id",
    fields: ["name", "product_id", "quantity", "price_unit", "price_subtotal"],
    columns: [
      { key: "name", label: "Etiqueta" },
      { key: "product_id", label: "Producto" },
      { key: "quantity", label: "Cantidad" },
      { key: "price_unit", label: "Precio" },
      { key: "price_subtotal", label: "Subtotal" },
    ],
    order: "id asc",
    title: "Líneas",
    extraDomain: [["display_type", "=", "product"]],
  },
  "stock.picking": {
    model: "stock.move",
    domainField: "picking_id",
    fields: ["product_id", "product_uom_qty", "quantity", "state"],
    columns: [
      { key: "product_id", label: "Producto" },
      { key: "product_uom_qty", label: "Demanda" },
      { key: "quantity", label: "Hecho" },
      { key: "state", label: "Estado" },
    ],
    order: "id asc",
    title: "Movimientos",
  },
};

type JsonRpcResponse<T> = {
  result?: T;
  error?: unknown;
};

type LoginResult = {
  uid?: number;
  name?: string;
  username?: string;
};

type OdooAdapterOptions = {
  baseUrl: string;
  db: string;
  fetchImpl?: typeof fetch;
  /** Abort RPC / media calls after this many ms (default 15000). */
  timeoutMs?: number;
};

export class OdooAdapter implements BackendClient {
  readonly #baseUrl: string;
  readonly #db: string;
  readonly #fetch: typeof fetch;
  readonly #timeoutMs: number;

  constructor({
    baseUrl,
    db,
    fetchImpl = fetch,
    timeoutMs = 15_000,
  }: OdooAdapterOptions) {
    this.#baseUrl = baseUrl.replace(/\/+$/, "");
    this.#db = db;
    this.#fetch = fetchImpl;
    this.#timeoutMs = Math.max(1000, Number(timeoutMs) || 15_000);
  }

  #abortSignal(): AbortSignal {
    return AbortSignal.timeout(this.#timeoutMs);
  }

  #mapFetchFailure(cause: unknown): never {
    if (cause instanceof BffError) throw cause;
    const name =
      cause && typeof cause === "object" && "name" in cause
        ? String((cause as { name: unknown }).name)
        : "";
    if (name === "TimeoutError" || name === "AbortError") {
      throw new BffError(
        "odoo_unavailable",
        503,
        "Timeout conectando con Odoo"
      );
    }
    throw new BffError(
      "odoo_unavailable",
      503,
      "No se pudo conectar con el servidor"
    );
  }

  async login(
    login: string,
    password: string
  ): Promise<{ sessionId: string; session: SessionInfo }> {
    const response = await this.#post("/web/session/authenticate", {
      jsonrpc: "2.0",
      params: { db: this.#db, login, password },
    });
    const payload = (await response.json()) as JsonRpcResponse<LoginResult>;

    if (!payload.result?.uid) {
      throw new BffError("bad_credentials", 401, "Credenciales incorrectas");
    }

    const sessionId = this.#readSessionId(response.headers.get("set-cookie"));
    if (!sessionId) {
      throw new BffError(
        "odoo_unavailable",
        503,
        "Odoo autenticó al usuario pero no devolvió la cookie session_id"
      );
    }

    return {
      sessionId,
      session: {
        uid: payload.result.uid,
        name: payload.result.name ?? "",
        login: payload.result.username ?? login,
      },
    };
  }

  async logout(odooSessionId: string): Promise<void> {
    try {
      await this.#fetch(`${this.#baseUrl}/web/session/destroy`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `session_id=${odooSessionId}`,
        },
        body: JSON.stringify({ jsonrpc: "2.0", params: {} }),
        signal: this.#abortSignal(),
      });
    } catch {
      // Logout is best-effort; the local BFF session is destroyed separately.
    }
  }

  async validateSession(odooSessionId: string): Promise<void> {
    const response = await this.#post(
      "/web/session/get_session_info",
      { jsonrpc: "2.0", params: {} },
      odooSessionId
    );
    const payload = (await response.json()) as JsonRpcResponse<{ uid?: number | false }>;
    if (!payload.result?.uid) {
      throw new BffError("unauthorized", 401, "La sesión de Odoo no es válida");
    }
  }

  getLauncher(odooSessionId: string): Promise<LauncherPayload> {
    return this.#callKw(
      odooSessionId,
      "sg.app.tile",
      "get_launcher_payload",
      []
    );
  }

  getHub(
    odooSessionId: string,
    app: string,
    section?: string
  ): Promise<HubPayload> {
    return this.#callKw(
      odooSessionId,
      "sg.hub.card",
      "get_hub_payload",
      [app, section ?? "summary"]
    );
  }

  async getRecordList(
    odooSessionId: string,
    listKey: string,
    query: RecordListQuery = {}
  ): Promise<RecordListPayload> {
    const def = getRecordListDef(listKey);
    if (!def) {
      throw new BffError("not_found", 404, "Lista no encontrada");
    }

    const page = Math.max(1, Number(query.page) || 1);
    const q = (query.q || "").trim();
    const domain = buildSearchDomain(def, q);
    const offset = (page - 1) * def.limit;

    let fields = [...def.fields];
    let rawRows: Record<string, unknown>[];

    try {
      rawRows = await this.#searchRead(
        odooSessionId,
        def.model,
        domain,
        fields,
        def.limit,
        offset,
        def.order
      );
    } catch (cause) {
      if (!(cause instanceof BffError) || cause.code === "unauthorized") {
        throw cause;
      }
      fields = fields.filter((field) => field !== "qty_available");
      rawRows = await this.#searchRead(
        odooSessionId,
        def.model,
        domain,
        fields,
        def.limit,
        offset,
        def.order
      );
    }

    const total = await this.#callKw<number>(
      odooSessionId,
      def.model,
      "search_count",
      [domain]
    );

    const columns = def.columns.filter(
      (column) =>
        column.kind === "image" ||
        fields.includes(column.key) ||
        column.key === "image_url"
    );

    const rows: RecordListRow[] = rawRows.map((row) => {
      const id = Number(row.id) || 0;
      const out: RecordListRow = { id };
      for (const column of columns) {
        if (column.kind === "image" || column.key === "image_url") {
          out.image_url =
            def.imageField && id
              ? mediaPath(def.model, id, def.imageField)
              : null;
          continue;
        }
        out[column.key] = this.#cellValue(row[column.key]);
      }
      const detail = buildDetailPath(def, id);
      if (detail) out.detail_path = detail;
      return out;
    });

    return {
      key: def.key,
      title: def.title,
      hint: def.hint,
      model: def.model,
      total: typeof total === "number" ? total : rows.length,
      page,
      pageSize: def.limit,
      q,
      hubBack: def.hubBack,
      columns,
      rows,
    };
  }

  async getRecordDetail(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<RecordDetailPayload> {
    const def = getRecordListDef(listKey);
    if (!def?.detailPath) {
      throw new BffError("not_found", 404, "Detalle no disponible");
    }
    if (!Number.isFinite(id) || id <= 0) {
      throw new BffError("not_found", 404, "Registro no encontrado");
    }

    let fields = [...def.fields];
    let rows: Record<string, unknown>[];
    try {
      rows = await this.#callKw<Record<string, unknown>[]>(
        odooSessionId,
        def.model,
        "read",
        [[id], fields]
      );
    } catch (cause) {
      if (!(cause instanceof BffError) || cause.code === "unauthorized") {
        throw cause;
      }
      fields = fields.filter((field) => field !== "qty_available");
      rows = await this.#callKw<Record<string, unknown>[]>(
        odooSessionId,
        def.model,
        "read",
        [[id], fields]
      );
    }

    const row = rows[0];
    if (!row) {
      throw new BffError("not_found", 404, "Registro no encontrado");
    }

    const labels: Record<string, string> = {
      name: "Nombre",
      display_name: "Nombre",
      default_code: "Referencia",
      qty_available: "Stock",
      active: "Activo",
    };
    for (const column of def.columns) {
      if (column.kind === "image") continue;
      labels[column.key] = column.label;
    }

    const lines = await this.#loadDetailLines(odooSessionId, def.model, id);

    return {
      key: def.key,
      title: String(
        row.name || row.display_name || row.complete_name || def.title
      ),
      model: def.model,
      hubBack: def.hubBack,
      listPath: def.path,
      imageUrl: def.imageField
        ? mediaPath(def.model, id, def.imageField)
        : null,
      fields: fields.map((key) => ({
        key,
        label: labels[key] || key,
        value: this.#cellValue(row[key]),
      })),
      lines,
    };
  }

  async updateRecord(
    odooSessionId: string,
    listKey: string,
    id: number,
    values: Record<string, unknown>
  ): Promise<void> {
    const writeDef = getRecordWriteDef(listKey);
    if (!writeDef) {
      throw new BffError("not_found", 404, "Escritura no permitida");
    }
    if (!Number.isFinite(id) || id <= 0) {
      throw new BffError("not_found", 404, "Registro no encontrado");
    }

    const filtered = filterWritableValues(listKey, values);
    if (!filtered) {
      throw new BffError("not_found", 404, "Sin campos editables");
    }

    await this.#callKw(odooSessionId, writeDef.model, "write", [
      [id],
      filtered,
    ]);
  }

  async createRecord(
    odooSessionId: string,
    listKey: string,
    values: Record<string, unknown>
  ): Promise<{ id: number; detailPath: string }> {
    if (getOrderCreateDef(listKey)) {
      return this.#createMinimalOrder(odooSessionId, listKey, values);
    }

    const writeDef = getRecordWriteDef(listKey);
    if (!writeDef?.createFields.length) {
      throw new BffError("not_found", 404, "Alta no permitida");
    }
    const filtered = filterCreateValues(listKey, values);
    if (!filtered) {
      throw new BffError("not_found", 404, "Datos de alta inválidos");
    }

    const id = await this.#callKw<number>(
      odooSessionId,
      writeDef.model,
      "create",
      [filtered]
    );
    const list = getRecordListDef(listKey);
    const detailPath =
      (list && buildDetailPath(list, id)) || `/lists/${listKey}/${id}`;
    return { id: Number(id), detailPath };
  }

  async #createMinimalOrder(
    odooSessionId: string,
    listKey: string,
    values: Record<string, unknown>
  ): Promise<{ id: number; detailPath: string }> {
    const orderDef = getOrderCreateDef(listKey);
    if (!orderDef) {
      throw new BffError("not_found", 404, "Alta no permitida");
    }
    const filtered = filterOrderCreateValues(listKey, values);
    if (!filtered) {
      throw new BffError("not_found", 404, "Datos de alta inválidos");
    }

    const order_line = filtered.lines.map((line) => {
      const vals: Record<string, number> = {
        product_id: line.productId,
        [orderDef.lineQtyField]: line.qty,
      };
      if (line.price !== undefined) vals.price_unit = line.price;
      if (line.discount !== undefined) vals.discount = line.discount;
      return [0, 0, vals];
    });

    const id = await this.#callKw<number>(
      odooSessionId,
      orderDef.model,
      "create",
      [
        {
          partner_id: filtered.partnerId,
          order_line,
        },
      ]
    );

    const list = getRecordListDef(listKey);
    const detailPath =
      (list && buildDetailPath(list, Number(id))) ||
      `/lists/${listKey}/${id}`;
    return { id: Number(id), detailPath };
  }

  async archiveRecord(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<void> {
    const writeDef = getRecordWriteDef(listKey);
    if (!writeDef || !canArchiveRecord(listKey)) {
      throw new BffError("not_found", 404, "Archivado no permitido");
    }
    if (!Number.isFinite(id) || id <= 0) {
      throw new BffError("not_found", 404, "Registro no encontrado");
    }

    await this.#callKw(odooSessionId, writeDef.model, "write", [
      [id],
      { active: false },
    ]);
  }

  async confirmRecord(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<{ ok: true; state: string | null }> {
    const actionDef = getRecordActionDef(listKey);
    if (!actionDef) {
      throw new BffError("not_found", 404, "Acción no permitida");
    }
    if (!Number.isFinite(id) || id <= 0) {
      throw new BffError("not_found", 404, "Registro no encontrado");
    }

    const [row] = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      actionDef.model,
      "read",
      [[id], ["state", "name"]]
    );
    const state = row?.state == null ? null : String(row.state);
    if (!isConfirmableState(listKey, state)) {
      throw new BffError(
        "not_found",
        404,
        "El registro no se puede confirmar en este estado"
      );
    }

    await this.#callKw(odooSessionId, actionDef.model, actionDef.method, [
      [id],
    ]);

    const [after] = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      actionDef.model,
      "read",
      [[id], ["state"]]
    );
    return {
      ok: true,
      state: after?.state == null ? null : String(after.state),
    };
  }

  async getPosCatalog(
    odooSessionId: string,
    query: { q?: string; limit?: number } = {}
  ): Promise<PosCatalogPayload> {
    const q = (query.q || "").trim();
    const limit = Math.min(Math.max(Number(query.limit) || 48, 1), 120);

    const configs = await this.#searchRead(
      odooSessionId,
      "pos.config",
      [["active", "=", true]],
      ["name", "payment_method_ids"],
      1,
      0,
      "id asc"
    );
    const configRow = configs[0];
    const config = configRow
      ? { id: Number(configRow.id), name: String(configRow.name || "Mostrador") }
      : null;

    const paymentMethodIds = Array.isArray(configRow?.payment_method_ids)
      ? (configRow.payment_method_ids as number[])
      : [];
    let paymentMethods: PosPaymentMethod[] = [];
    if (paymentMethodIds.length) {
      const rowsPm = await this.#searchRead(
        odooSessionId,
        "pos.payment.method",
        [["id", "in", paymentMethodIds]],
        ["name", "is_cash_count"],
        20,
        0,
        "id asc"
      );
      paymentMethods = rowsPm.map((row) => ({
        id: Number(row.id),
        name: String(row.name || "Pago"),
        isCash: row.is_cash_count === true,
      }));
    } else {
      const rowsPm = await this.#searchRead(
        odooSessionId,
        "pos.payment.method",
        [],
        ["name", "is_cash_count"],
        20,
        0,
        "id asc"
      );
      paymentMethods = rowsPm.map((row) => ({
        id: Number(row.id),
        name: String(row.name || "Pago"),
        isCash: row.is_cash_count === true,
      }));
    }
    // Prefer Cash then Card order for UI
    paymentMethods.sort((a, b) => Number(b.isCash) - Number(a.isCash));

    const domain: unknown[] = [
      ["sale_ok", "=", true],
      ["active", "=", true],
    ];
    if (q) {
      domain.push("|", ["name", "ilike", q], ["default_code", "ilike", q]);
    }

    let rows: Record<string, unknown>[];
    try {
      rows = await this.#searchRead(
        odooSessionId,
        "product.product",
        [...domain, ["available_in_pos", "=", true]],
        ["display_name", "default_code", "list_price"],
        limit,
        0,
        "default_code asc"
      );
    } catch (cause) {
      if (cause instanceof BffError && cause.code === "unauthorized") throw cause;
      rows = await this.#searchRead(
        odooSessionId,
        "product.product",
        domain,
        ["display_name", "default_code", "list_price"],
        limit,
        0,
        "default_code asc"
      );
    }

    let total = rows.length;
    try {
      total = await this.#callKw<number>(
        odooSessionId,
        "product.product",
        "search_count",
        [[...domain, ["available_in_pos", "=", true]]]
      );
    } catch {
      total = await this.#callKw<number>(
        odooSessionId,
        "product.product",
        "search_count",
        [domain]
      );
    }

    return {
      config,
      q,
      paymentMethods,
      total: typeof total === "number" ? total : rows.length,
      products: rows.map((row) => {
        const id = Number(row.id);
        return {
          id,
          name: String(row.display_name || row.name || ""),
          default_code:
            row.default_code === false || row.default_code == null
              ? null
              : String(row.default_code),
          list_price: Number(row.list_price) || 0,
          image_url: mediaPath("product.product", id, "image_128"),
        };
      }),
    };
  }

  async checkoutPosCart(
    odooSessionId: string,
    lines: PosCheckoutLine[],
    options: PosCheckoutOptions = {}
  ): Promise<PosCheckoutResult> {
    const clean = (lines || [])
      .map((line) => ({
        productId: Number(line.productId),
        qty: Number(line.qty),
        price: Number(line.price),
        discount: Math.min(100, Math.max(0, Number(line.discount) || 0)),
      }))
      .filter(
        (line) =>
          Number.isFinite(line.productId) &&
          line.productId > 0 &&
          Number.isFinite(line.qty) &&
          line.qty > 0 &&
          Number.isFinite(line.price)
      );

    if (!clean.length) {
      throw new BffError("not_found", 404, "Carrito vacío");
    }

    try {
      return await this.#checkoutPosOrder(
        odooSessionId,
        clean,
        options.paymentMethodId
      );
    } catch (cause) {
      if (cause instanceof BffError && cause.code === "unauthorized") throw cause;
      if (cause instanceof BffError && cause.code === "checkout_failed") {
        throw cause;
      }
      throw new BffError(
        "checkout_failed",
        503,
        cause instanceof BffError
          ? cause.message
          : "No se pudo registrar la venta en caja"
      );
    }
  }

  async #ensureOpenPosSession(odooSessionId: string): Promise<number> {
    const configs = await this.#searchRead(
      odooSessionId,
      "pos.config",
      [["active", "=", true]],
      ["name"],
      1,
      0,
      "id asc"
    );
    const configId = Number(configs[0]?.id);
    if (!configId) {
      throw new BffError("not_found", 404, "No hay caja POS configurada");
    }

    const openSessions = await this.#searchRead(
      odooSessionId,
      "pos.session",
      [
        ["config_id", "=", configId],
        ["state", "=", "opened"],
      ],
      ["name", "state"],
      1,
      0,
      "id desc"
    );
    if (openSessions[0]?.id) return Number(openSessions[0].id);

    try {
      await this.#callKw(odooSessionId, "pos.config", "open_session_cb", [
        [configId],
      ]);
    } catch {
      await this.#callKw(odooSessionId, "pos.session", "create", [
        { config_id: configId },
      ]);
    }

    const again = await this.#searchRead(
      odooSessionId,
      "pos.session",
      [
        ["config_id", "=", configId],
        ["state", "in", ["opened", "opening_control"]],
      ],
      ["name", "state"],
      1,
      0,
      "id desc"
    );
    const sessionId = Number(again[0]?.id);
    if (!sessionId) {
      throw new BffError(
        "odoo_unavailable",
        503,
        "No se pudo abrir la sesión de caja"
      );
    }
    return sessionId;
  }

  async #checkoutPosOrder(
    odooSessionId: string,
    clean: {
      productId: number;
      qty: number;
      price: number;
      discount: number;
    }[],
    preferredPaymentMethodId?: number
  ): Promise<PosCheckoutResult> {
    const sessionId = await this.#ensureOpenPosSession(odooSessionId);
    const amountTotal = Number(
      clean
        .reduce(
          (sum, line) =>
            sum + line.price * line.qty * (1 - line.discount / 100),
          0
        )
        .toFixed(2)
    );

    const paymentMethods = await this.#searchRead(
      odooSessionId,
      "pos.payment.method",
      [],
      ["name", "is_cash_count"],
      20,
      0,
      "id asc"
    );
    const preferred = paymentMethods.find(
      (row) => Number(row.id) === Number(preferredPaymentMethodId)
    );
    const cash =
      preferred ||
      paymentMethods.find((row) => row.is_cash_count === true) ||
      paymentMethods[0];
    const paymentMethodId = Number(cash?.id);
    if (!paymentMethodId) {
      throw new BffError(
        "odoo_unavailable",
        503,
        "No hay método de pago POS"
      );
    }

    const orderId = await this.#callKw<number>(
      odooSessionId,
      "pos.order",
      "create",
      [
        {
          session_id: sessionId,
          partner_id: false,
          name: "/",
          amount_tax: 0,
          amount_total: amountTotal,
          amount_paid: 0,
          amount_return: 0,
          lines: clean.map((line) => {
            const subtotal = Number(
              (line.price * line.qty * (1 - line.discount / 100)).toFixed(2)
            );
            return [
              0,
              0,
              {
                product_id: line.productId,
                qty: line.qty,
                price_unit: line.price,
                price_subtotal: subtotal,
                price_subtotal_incl: subtotal,
                discount: line.discount,
                name: "Producto",
              },
            ];
          }),
        },
      ]
    );

    await this.#callKw(odooSessionId, "pos.order", "write", [
      [orderId],
      {
        amount_paid: amountTotal,
        amount_return: 0,
        payment_ids: [
          [
            0,
            0,
            {
              payment_method_id: paymentMethodId,
              amount: amountTotal,
            },
          ],
        ],
      },
    ]);

    await this.#callKw(odooSessionId, "pos.order", "action_pos_order_paid", [
      [orderId],
    ]);

    const [order] = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      "pos.order",
      "read",
      [[orderId], ["name"]]
    );

    return {
      orderId,
      orderName: String(order?.name || `POS/${orderId}`),
      detailPath: `/lists/sales/pos-orders/${orderId}`,
      channel: "pos.order",
      paymentMethodId,
      paymentMethodName: String(cash?.name || "Pago"),
      amountTotal,
    };
  }

  async #loadDetailLines(
    odooSessionId: string,
    model: string,
    id: number
  ): Promise<RecordDetailLines | null> {
    const lineDef = DETAIL_LINES[model];
    if (!lineDef) return null;

    try {
      const domain: unknown[] = [
        [lineDef.domainField, "=", id],
        ...(lineDef.extraDomain || []),
      ];
      const rows = await this.#callKw<Record<string, unknown>[]>(
        odooSessionId,
        lineDef.model,
        "search_read",
        [domain],
        {
          fields: lineDef.fields,
          limit: 200,
          order: lineDef.order,
        }
      );

      return {
        title: lineDef.title,
        columns: lineDef.columns,
        rows: rows.map((row) => {
          const out: RecordListRow = { id: Number(row.id) || 0 };
          for (const column of lineDef.columns) {
            out[column.key] = this.#cellValue(row[column.key]);
          }
          return out;
        }),
      };
    } catch (cause) {
      if (cause instanceof BffError && cause.code === "unauthorized") {
        throw cause;
      }
      return { title: lineDef.title, columns: lineDef.columns, rows: [] };
    }
  }

  async fetchMedia(
    odooSessionId: string,
    model: string,
    id: number,
    field: string
  ): Promise<{ body: ArrayBuffer; contentType: string }> {
    if (!isAllowedMedia(model, field) || !Number.isFinite(id) || id <= 0) {
      throw new BffError("not_found", 404, "Media no permitida");
    }

    try {
      const response = await this.#fetch(
        `${this.#baseUrl}/web/image/${encodeURIComponent(model)}/${id}/${encodeURIComponent(field)}`,
        {
          headers: { cookie: `session_id=${odooSessionId}` },
          signal: this.#abortSignal(),
        }
      );
      if (!response.ok) {
        throw new BffError("not_found", 404, "Imagen no encontrada");
      }
      return {
        body: await response.arrayBuffer(),
        contentType: response.headers.get("content-type") || "image/png",
      };
    } catch (cause) {
      this.#mapFetchFailure(cause);
    }
  }

  #searchRead(
    sessionId: string,
    model: string,
    domain: unknown[],
    fields: string[],
    limit: number,
    offset: number,
    order: string
  ) {
    return this.#callKw<Record<string, unknown>[]>(
      sessionId,
      model,
      "search_read",
      [domain],
      { fields, limit, offset, order }
    );
  }

  #cellValue(value: unknown): string | number | boolean | null {
    if (value === null || value === undefined || value === false) {
      return value === false ? false : null;
    }
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return value;
    }
    if (Array.isArray(value) && value.length >= 2) {
      return String(value[1]);
    }
    return String(value);
  }

  async #callKw<T>(
    sessionId: string,
    model: string,
    method: string,
    args: unknown[],
    kwargs: Record<string, unknown> = {}
  ): Promise<T> {
    const response = await this.#post(
      "/web/dataset/call_kw",
      {
        jsonrpc: "2.0",
        params: { model, method, args, kwargs },
      },
      sessionId
    );
    const payload = (await response.json()) as JsonRpcResponse<T>;
    if (payload.error !== undefined) {
      const errorText = this.#describeRpcError(payload.error);
      if (
        /(session|access|authenticat|unauthoriz|permission)/i.test(
          errorText
        )
      ) {
        throw new BffError("unauthorized", 401, "La sesión de Odoo no es válida");
      }

      throw new BffError(
        "odoo_unavailable",
        503,
        `Odoo devolvió un error JSON-RPC${errorText ? `: ${errorText}` : ""}`
      );
    }

    if (payload.result === undefined) {
      throw new BffError(
        "odoo_unavailable",
        503,
        "Odoo devolvió una respuesta JSON-RPC sin resultado"
      );
    }

    return payload.result;
  }

  async #post(
    path: string,
    body: unknown,
    sessionId?: string
  ): Promise<Response> {
    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (sessionId) {
      headers.cookie = `session_id=${sessionId}`;
    }

    try {
      return await this.#fetch(`${this.#baseUrl}${path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: this.#abortSignal(),
      });
    } catch (cause) {
      this.#mapFetchFailure(cause);
    }
  }

  #readSessionId(setCookie: string | null): string {
    return setCookie?.match(/(?:^|[;,]\s*)session_id=([^;,\s]+)/)?.[1] ?? "";
  }

  #describeRpcError(error: unknown): string {
    if (typeof error === "string") {
      return error;
    }

    try {
      return JSON.stringify(error) ?? "";
    } catch {
      return "";
    }
  }
}
