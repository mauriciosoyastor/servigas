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
  PriceListImportApplyLine,
  PriceListImportApplyResult,
  PriceListImportPreview,
  RecordDetailLines,
  RecordDetailPayload,
  RecordListPayload,
  RecordListRow,
  RecordNote,
  SessionInfo,
} from "./types.ts";
import { localizePaymentMethodName } from "../pos/payment-methods.ts";
import {
  buildProductIndexes,
  classifyRows,
  parseTabularText,
  resolveApplyStatus,
  suggestMapping,
  type PriceListMapping,
} from "../shell/price-list-import.ts";
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
import {
  isAllowedNoteModel,
  normalizeNoteBody,
  odooHtmlFromPlainText,
  plainTextFromOdooHtml,
  resolveNoteTarget,
} from "../shell/record-notes.ts";
import { roundCents, splitAmount, summarizeTaxes } from "../pos/tax.ts";

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
      barcode: "Barras",
      qty_available: "Stock",
      active: "Activo",
      vat: "CUIT",
      street: "Calle",
      city: "Ciudad",
      email: "Email",
      phone: "Teléfono",
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

  async previewPriceListImport(
    odooSessionId: string,
    input: {
      filename: string;
      content: string;
      mapping?: PriceListMapping;
    }
  ): Promise<PriceListImportPreview> {
    const parsed = parseTabularText(input.filename, input.content);
    if (parsed.error) {
      throw new BffError("validation_error", 400, parsed.error);
    }
    if (!parsed.rows.length) {
      throw new BffError("validation_error", 400, "El archivo no tiene filas de datos.");
    }

    const mapping = {
      ...suggestMapping(parsed.headers),
      ...(input.mapping || {}),
    };
    if (!mapping.name) {
      throw new BffError(
        "validation_error",
        400,
        "Indicá qué columna es el nombre del producto."
      );
    }
    if (!mapping.list_price && !mapping.standard_price) {
      throw new BffError(
        "validation_error",
        400,
        "Indicá al menos una columna de precio (venta o costo)."
      );
    }

    const catalog = await this.#loadProductCatalog(odooSessionId);
    const indexes = buildProductIndexes(catalog);
    const classified = classifyRows(parsed.rows, mapping, indexes);
    const lines = classified.map((row) => ({
      lineNumber: row.lineNumber,
      selected: row.status === "create" || row.status === "update",
      status: row.status,
      barcode: row.barcode,
      default_code: row.default_code,
      name: row.name,
      list_price: row.list_price,
      standard_price: row.standard_price,
      productId: row.productId,
      candidates: row.candidates,
      reason: row.reason,
    }));
    const counts = {
      create: lines.filter((l) => l.status === "create").length,
      update: lines.filter((l) => l.status === "update").length,
      review: lines.filter((l) => l.status === "review").length,
      error: lines.filter((l) => l.status === "error").length,
    };
    return { headers: parsed.headers, mapping, lines, counts };
  }

  async applyPriceListImport(
    odooSessionId: string,
    lines: PriceListImportApplyLine[]
  ): Promise<PriceListImportApplyResult> {
    if (!Array.isArray(lines) || !lines.length) {
      throw new BffError("validation_error", 400, "No hay filas para importar.");
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    for (const line of lines) {
      const action = resolveApplyStatus(line);
      if (action === "skip") {
        skipped += 1;
        continue;
      }

      if (action === "create") {
        const name = (line.name || "").trim();
        if (!name) {
          skipped += 1;
          continue;
        }
        const vals: Record<string, string | number | boolean> = {
          name: name.slice(0, 512),
          sale_ok: true,
          purchase_ok: true,
          is_storable: true,
          available_in_pos: true,
          type: "consu",
        };
        if (line.default_code) vals.default_code = String(line.default_code).slice(0, 128);
        if (line.barcode) vals.barcode = String(line.barcode).slice(0, 128);
        if (line.list_price != null && Number.isFinite(line.list_price)) {
          vals.list_price = line.list_price;
        }
        if (line.standard_price != null && Number.isFinite(line.standard_price)) {
          vals.standard_price = line.standard_price;
        }
        await this.#callKw(odooSessionId, "product.template", "create", [vals]);
        created += 1;
        continue;
      }

      const productId = Number(line.productId);
      if (!Number.isFinite(productId) || productId <= 0) {
        skipped += 1;
        continue;
      }
      const [product] = await this.#searchRead(
        odooSessionId,
        "product.template",
        [["id", "=", productId]],
        ["id", "barcode", "default_code"],
        1,
        0,
        "id"
      );
      if (!product) {
        skipped += 1;
        continue;
      }
      const writeVals: Record<string, string | number> = {};
      if (line.list_price != null && Number.isFinite(line.list_price)) {
        writeVals.list_price = line.list_price;
      }
      if (line.standard_price != null && Number.isFinite(line.standard_price)) {
        writeVals.standard_price = line.standard_price;
      }
      if (line.barcode && !product.barcode) {
        writeVals.barcode = String(line.barcode).slice(0, 128);
      }
      if (line.default_code && !product.default_code) {
        writeVals.default_code = String(line.default_code).slice(0, 128);
      }
      if (Object.keys(writeVals).length) {
        await this.#callKw(odooSessionId, "product.template", "write", [
          [productId],
          writeVals,
        ]);
      }
      updated += 1;
    }

    return { created, updated, skipped };
  }

  async #loadProductCatalog(odooSessionId: string) {
    const out: Array<{
      id: number;
      barcode: string | null;
      default_code: string | null;
      name: string | null;
    }> = [];
    const pageSize = 2000;
    let offset = 0;
    while (true) {
      const rows = await this.#searchRead(
        odooSessionId,
        "product.template",
        [["active", "=", true]],
        ["id", "name", "default_code", "barcode"],
        pageSize,
        offset,
        "id"
      );
      for (const row of rows) {
        out.push({
          id: Number(row.id),
          barcode: row.barcode ? String(row.barcode) : null,
          default_code: row.default_code ? String(row.default_code) : null,
          name: row.name ? String(row.name) : null,
        });
      }
      if (rows.length < pageSize) break;
      offset += pageSize;
    }
    return out;
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

  async listRecordNotes(
    odooSessionId: string,
    listKey: string,
    recordId: number,
    viewerUid: number
  ): Promise<RecordNote[]> {
    const target = resolveNoteTarget(listKey);
    if (!target || !Number.isFinite(recordId) || recordId <= 0) {
      throw new BffError("not_found", 404, "Registro no encontrado");
    }

    const rows = await this.#searchRead(
      odooSessionId,
      "mail.message",
      [
        ["model", "=", target.model],
        ["res_id", "=", recordId],
        ["message_type", "=", "comment"],
      ],
      ["body", "author_id", "create_uid", "date"],
      200,
      0,
      "id desc"
    );
    return rows.map((row) => this.#mapMailMessage(row, viewerUid));
  }

  async createRecordNote(
    odooSessionId: string,
    listKey: string,
    recordId: number,
    body: string,
    viewerUid: number
  ): Promise<RecordNote> {
    const target = resolveNoteTarget(listKey);
    if (!target || !Number.isFinite(recordId) || recordId <= 0) {
      throw new BffError("not_found", 404, "Registro no encontrado");
    }
    const normalized = normalizeNoteBody(body);
    if (!normalized.ok) {
      throw new BffError("validation_error", 400, normalized.error);
    }

    const noteId = await this.#callKw<number>(
      odooSessionId,
      target.model,
      "message_post",
      [[recordId]],
      {
        body: odooHtmlFromPlainText(normalized.body),
        message_type: "comment",
        subtype_xmlid: "mail.mt_note",
      }
    );
    return this.#readRecordNote(odooSessionId, Number(noteId), viewerUid);
  }

  async updateRecordNote(
    odooSessionId: string,
    noteId: number,
    body: string,
    viewerUid: number
  ): Promise<RecordNote> {
    if (!Number.isFinite(noteId) || noteId <= 0) {
      throw new BffError("not_found", 404, "Nota no encontrada");
    }
    const normalized = normalizeNoteBody(body);
    if (!normalized.ok) {
      throw new BffError("validation_error", 400, normalized.error);
    }

    const note = await this.#readRecordNote(
      odooSessionId,
      noteId,
      viewerUid,
      true
    );
    this.#assertNoteOwner(note, viewerUid);
    await this.#callKw(odooSessionId, "mail.message", "write", [
      [noteId],
      { body: odooHtmlFromPlainText(normalized.body) },
    ]);
    return this.#readRecordNote(odooSessionId, noteId, viewerUid);
  }

  async deleteRecordNote(
    odooSessionId: string,
    noteId: number,
    viewerUid: number
  ): Promise<void> {
    if (!Number.isFinite(noteId) || noteId <= 0) {
      throw new BffError("not_found", 404, "Nota no encontrada");
    }

    const note = await this.#readRecordNote(
      odooSessionId,
      noteId,
      viewerUid,
      true
    );
    this.#assertNoteOwner(note, viewerUid);
    await this.#callKw(odooSessionId, "mail.message", "unlink", [[noteId]]);
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

    if (actionDef.model === "stock.picking") {
      return this.#validateStockPicking(odooSessionId, id, state);
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

  async #validateStockPicking(
    odooSessionId: string,
    id: number,
    initialState: string | null
  ): Promise<{ ok: true; state: string | null }> {
    let state = initialState;

    if (state === "confirmed" || state === "waiting") {
      await this.#callKw(odooSessionId, "stock.picking", "action_assign", [
        [id],
      ]);
      const [assigned] = await this.#callKw<Record<string, unknown>[]>(
        odooSessionId,
        "stock.picking",
        "read",
        [[id], ["state"]]
      );
      state = assigned?.state == null ? null : String(assigned.state);
    }

    if (state !== "assigned") {
      throw new BffError(
        "action_failed",
        409,
        "No se pudo reservar stock para validar la transferencia"
      );
    }

    const moves = await this.#searchRead(
      odooSessionId,
      "stock.move",
      [["picking_id", "=", id]],
      ["product_uom_qty", "quantity"],
      200,
      0,
      "id asc"
    );
    for (const move of moves) {
      const moveId = Number(move.id);
      const demand = Number(move.product_uom_qty) || 0;
      const qty = Number(move.quantity) || 0;
      if (!Number.isFinite(moveId) || moveId <= 0) continue;
      if (demand > 0 && qty <= 0) {
        await this.#callKw(odooSessionId, "stock.move", "write", [
          [moveId],
          { quantity: demand },
        ]);
      }
    }

    await this.#callKw(
      odooSessionId,
      "stock.picking",
      "button_validate",
      [[id]],
      {
        context: {
          cancel_backorder: true,
          skip_backorder: true,
        },
      }
    );

    const [after] = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      "stock.picking",
      "read",
      [[id], ["state"]]
    );
    const afterState = after?.state == null ? null : String(after.state);
    if (afterState !== "done") {
      throw new BffError(
        "action_failed",
        409,
        "La validación no completó la transferencia (puede requerir asistente en Odoo)"
      );
    }
    return { ok: true, state: afterState };
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
        name: localizePaymentMethodName(String(row.name || "Pago")),
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
        name: localizePaymentMethodName(String(row.name || "Pago")),
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
      domain.push(
        "|",
        "|",
        ["name", "ilike", q],
        ["default_code", "ilike", q],
        ["barcode", "ilike", q]
      );
    }

    const catalogFields = [
      "display_name",
      "default_code",
      "barcode",
      "list_price",
      "qty_available",
      "taxes_id",
    ];

    let rows: Record<string, unknown>[];
    try {
      rows = await this.#searchRead(
        odooSessionId,
        "product.product",
        [...domain, ["available_in_pos", "=", true]],
        catalogFields,
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
        catalogFields,
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

    const taxByProduct = await this.#resolveProductTaxes(
      odooSessionId,
      rows.map((row) => Number(row.id)).filter((id) => id > 0),
      rows
    );

    return {
      config,
      q,
      paymentMethods,
      total: typeof total === "number" ? total : rows.length,
      products: rows.map((row) => {
        const id = Number(row.id);
        const tax = taxByProduct.get(id) || {
          taxRate: 0,
          priceIncludesTax: false,
        };
        return {
          id,
          name: String(row.display_name || row.name || ""),
          default_code:
            row.default_code === false || row.default_code == null
              ? null
              : String(row.default_code),
          barcode:
            row.barcode === false || row.barcode == null
              ? null
              : String(row.barcode),
          list_price: Number(row.list_price) || 0,
          qty_available: Number(row.qty_available) || 0,
          tax_rate: tax.taxRate,
          price_includes_tax: tax.priceIncludesTax,
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
        options.paymentMethodId,
        options.partnerId
      );
    } catch (cause) {
      if (cause instanceof BffError && cause.code === "unauthorized") throw cause;
      if (cause instanceof BffError && cause.code === "checkout_failed") {
        throw cause;
      }
      const detail =
        cause instanceof BffError
          ? cause.message
          : cause instanceof Error
            ? cause.message
            : String(cause || "");
      throw new BffError(
        "checkout_failed",
        503,
        detail || "No se pudo registrar la venta en caja"
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

  async #resolveProductTaxes(
    odooSessionId: string,
    productIds: number[],
    productRows?: Record<string, unknown>[]
  ): Promise<
    Map<
      number,
      { taxRate: number; priceIncludesTax: boolean; taxIds: number[] }
    >
  > {
    const result = new Map<
      number,
      { taxRate: number; priceIncludesTax: boolean; taxIds: number[] }
    >();
    const ids = [...new Set(productIds.filter((id) => id > 0))];
    if (!ids.length) return result;

    let rows = productRows;
    if (!rows?.length || !rows.every((row) => "taxes_id" in row)) {
      rows = await this.#searchRead(
        odooSessionId,
        "product.product",
        [["id", "in", ids]],
        ["taxes_id"],
        ids.length,
        0,
        "id asc"
      );
    }

    const taxIds = new Set<number>();
    for (const row of rows) {
      const raw = row.taxes_id;
      if (!Array.isArray(raw)) continue;
      for (const taxId of raw) {
        const id = Number(taxId);
        if (id > 0) taxIds.add(id);
      }
    }

    const taxById = new Map<
      number,
      { amount?: number; amount_type?: string; price_include?: boolean }
    >();
    if (taxIds.size) {
      const taxRows = await this.#searchRead(
        odooSessionId,
        "account.tax",
        [["id", "in", [...taxIds]]],
        ["amount", "amount_type", "price_include", "type_tax_use"],
        taxIds.size,
        0,
        "id asc"
      );
      for (const tax of taxRows) {
        const use = String(tax.type_tax_use || "sale");
        if (use !== "sale" && use !== "none") continue;
        taxById.set(Number(tax.id), {
          amount: Number(tax.amount) || 0,
          amount_type: String(tax.amount_type || "percent"),
          price_include: tax.price_include === true,
        });
      }
    }

    for (const row of rows) {
      const productId = Number(row.id);
      const raw = Array.isArray(row.taxes_id) ? row.taxes_id : [];
      const lineTaxIds = raw
        .map((taxId) => Number(taxId))
        .filter((taxId) => taxId > 0 && taxById.has(taxId));
      const taxes = lineTaxIds
        .map((taxId) => taxById.get(taxId))
        .filter(Boolean) as {
        amount?: number;
        amount_type?: string;
        price_include?: boolean;
      }[];
      result.set(productId, { ...summarizeTaxes(taxes), taxIds: lineTaxIds });
    }
    return result;
  }

  async #checkoutPosOrder(
    odooSessionId: string,
    clean: {
      productId: number;
      qty: number;
      price: number;
      discount: number;
    }[],
    preferredPaymentMethodId?: number,
    preferredPartnerId?: number
  ): Promise<PosCheckoutResult> {
    const sessionId = await this.#ensureOpenPosSession(odooSessionId);
    const taxByProduct = await this.#resolveProductTaxes(
      odooSessionId,
      clean.map((line) => line.productId)
    );

    const lineMoney = clean.map((line) => {
      const base = roundCents(
        line.price * line.qty * (1 - line.discount / 100)
      );
      const tax = taxByProduct.get(line.productId) || {
        taxRate: 0,
        priceIncludesTax: false,
        taxIds: [] as number[],
      };
      const amounts = splitAmount(base, tax.taxRate, tax.priceIncludesTax);
      return { line, taxIds: tax.taxIds, ...amounts };
    });

    const amountUntaxed = roundCents(
      lineMoney.reduce((sum, row) => sum + row.untaxed, 0)
    );
    const amountTax = roundCents(
      lineMoney.reduce((sum, row) => sum + row.tax, 0)
    );
    const amountTotal = roundCents(
      lineMoney.reduce((sum, row) => sum + row.total, 0)
    );

    let partnerId: number | false = false;
    let partnerName: string | null = null;
    const requestedPartner = Number(preferredPartnerId);
    if (Number.isFinite(requestedPartner) && requestedPartner > 0) {
      const partners = await this.#searchRead(
        odooSessionId,
        "res.partner",
        [["id", "=", requestedPartner]],
        ["name"],
        1,
        0,
        "id asc"
      );
      const partner = partners[0];
      if (!partner?.id) {
        throw new BffError("not_found", 404, "Cliente no encontrado");
      }
      partnerId = Number(partner.id);
      partnerName = String(partner.name || "");
    }

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
          partner_id: partnerId,
          name: "/",
          amount_tax: amountTax,
          amount_total: amountTotal,
          amount_paid: 0,
          amount_return: 0,
          lines: lineMoney.map(({ line, untaxed, total, taxIds }) => [
            0,
            0,
            {
              product_id: line.productId,
              qty: line.qty,
              price_unit: line.price,
              price_subtotal: untaxed,
              price_subtotal_incl: total,
              discount: line.discount,
              name: "Producto",
              // Sin tax_ids Odoo 19 recalcula amount_total sin IVA al pagar.
              tax_ids: [[6, 0, taxIds]],
            },
          ]),
        },
      ]
    );

    // Usar el total que Odoo persistió (fuente de verdad para action_pos_order_paid).
    const [createdOrder] = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      "pos.order",
      "read",
      [[orderId], ["amount_total", "amount_tax"]]
    );
    const paidTotal = roundCents(
      Number(createdOrder?.amount_total) || amountTotal
    );
    const paidTax = roundCents(
      Number(createdOrder?.amount_tax) || amountTax
    );
    const paidUntaxed = roundCents(paidTotal - paidTax);

    await this.#callKw(odooSessionId, "pos.order", "write", [
      [orderId],
      {
        amount_paid: paidTotal,
        amount_return: 0,
        payment_ids: [
          [
            0,
            0,
            {
              payment_method_id: paymentMethodId,
              amount: paidTotal,
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
      detailPath: `/lists/sales/ventas-caja/${orderId}`,
      channel: "pos.order",
      paymentMethodId,
      paymentMethodName: localizePaymentMethodName(
        String(cash?.name || "Pago")
      ),
      partnerId: partnerId === false ? null : partnerId,
      partnerName,
      amountUntaxed: paidUntaxed,
      amountTax: paidTax,
      amountTotal: paidTotal,
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

  async #readRecordNote(
    odooSessionId: string,
    noteId: number,
    viewerUid: number,
    requireAllowedModel = false
  ): Promise<RecordNote> {
    const rows = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      "mail.message",
      "read",
      [[noteId], ["body", "model", "author_id", "create_uid", "date"]]
    );
    if (!rows[0]) {
      throw new BffError("not_found", 404, "Nota no encontrada");
    }
    if (requireAllowedModel && !isAllowedNoteModel(rows[0].model)) {
      throw new BffError("not_found", 404, "Nota no encontrada");
    }
    return this.#mapMailMessage(rows[0], viewerUid);
  }

  #mapMailMessage(
    row: Record<string, unknown>,
    viewerUid: number
  ): RecordNote {
    const createUid = Array.isArray(row.create_uid) ? row.create_uid : [];
    const author = Array.isArray(row.author_id) ? row.author_id : [];
    const authorId = Number(createUid[0]) || 0;
    const rawDate = String(row.date || "");
    const normalizedDate = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(
      rawDate
    )
      ? `${rawDate.replace(" ", "T")}Z`
      : rawDate;
    const parsedDate = new Date(normalizedDate);

    return {
      id: Number(row.id) || 0,
      body: plainTextFromOdooHtml(String(row.body || "")),
      authorName: author[1] ? String(author[1]) : "Usuario",
      authorId,
      createdAt: Number.isNaN(parsedDate.getTime())
        ? rawDate
        : parsedDate.toISOString(),
      canEdit: authorId === viewerUid,
    };
  }

  #assertNoteOwner(note: RecordNote, viewerUid: number): void {
    if (note.authorId !== viewerUid) {
      throw new BffError(
        "forbidden",
        403,
        "Solo podés editar tus propias notas"
      );
    }
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
