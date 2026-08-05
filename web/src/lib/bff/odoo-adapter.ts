import type { BackendClient } from "./backend-client.ts";
import { BffError } from "./errors.ts";
import type {
  CashCloseResult,
  CashFeedItemDto,
  CashHubPayload,
  CashMoveResult,
  CashOpenResult,
  CashSessionDetailPayload,
  CashSessionInfo,
  CashShift,
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
  ProductPurgeByCategoryResult,
  DeleteRecordResult,
  VendorBillPdfPreview,
  RecordDetailLines,
  RecordDetailPayload,
  RecordListPayload,
  RecordListRow,
  RecordNote,
  SessionInfo,
} from "./types.ts";
import {
  classifyJournalMedium,
  classifyPosPaymentMedium,
  mergeCashFeed,
  summarizeCash,
  type CashFeedItem,
} from "../caja/cash-feed.ts";
import { buildCashMovementReason } from "../caja/cash-motives.ts";
import {
  canCollectWorkOrderCash,
  normalizeWorkOrderCashMedium,
  workOrderCashFeedHref,
  workOrderCashFeedLabel,
} from "../shell/workshop-order-cash.ts";
import {
  buildCashAlerts,
  canOwnerWithdraw,
  resolveCashShift,
  suggestedBankWithdraw,
  validateCashClose,
} from "../caja/cash-ops.ts";
import {
  formatPosOrderPaymentLabel,
  localizePaymentMethodName,
} from "../pos/payment-methods.ts";
import {
  buildProductIndexes,
  classifyRows,
  parseTabularText,
  resolveApplyStatus,
  suggestMapping,
  type PriceListMapping,
} from "../shell/price-list-import.ts";
import {
  confirmCategoryName,
  hybridPurgeIds,
  summarizePurgeResult,
} from "../shell/product-purge.ts";
import { extractPdfText, isPdfMagic } from "../shell/pdf-text.ts";
import {
  classifyBillLines,
  countBillLineStatuses,
  parseVendorBillText,
} from "../shell/vendor-bill-pdf-parse.ts";
import {
  BILL_ATTACHMENT_SIZE_MSG,
  MAX_BILL_ATTACHMENT_BYTES,
} from "../shell/bill-attachment.ts";
import {
  accentSearchHaystackFields,
  buildDetailPath,
  buildSearchDomain,
  getRecordListDef,
  isAllowedMedia,
  matchesAccentInsensitiveSearch,
  mediaPath,
  usesAccentInsensitiveListSearch,
  type RecordListQuery,
} from "../shell/record-lists.ts";
import {
  getRecordActionDef,
  isConfirmableState,
} from "../shell/record-actions.ts";
import {
  filterInvoiceCreateValues,
  getInvoiceCreateDef,
} from "../shell/invoice-creates.ts";
import { canUpdateInvoiceDraft,
  filterInvoiceDraftUpdateValues,
} from "../shell/invoice-updates.ts";
import {
  publishInvoiceDestError,
  SUGGESTED_DOC_TYPE_NOTE,
  suggestedDocTypeLabel,
  suggestedDocTypeShort,
} from "../shell/invoice-dest.ts";
import {
  canCreateInvoiceFromOrder,
  isOrderReadyToInvoice,
} from "../shell/order-invoice.ts";
import {
  canCreateInvoiceFromPos,
  isPosOrderReadyToInvoice,
} from "../shell/pos-invoice.ts";
import {
  filterOrderCreateValues,
  getOrderCreateDef,
} from "../shell/order-creates.ts";
import {
  canCreateWorkOrder,
  filterWorkOrderCreateValues,
} from "../shell/workshop-creates.ts";
import {
  billSourceLabel,
  normalizeBillAttachment,
} from "../shell/bill-attachment.ts";
import {
  filterPaymentRegisterValues,
  getPaymentRegisterDef,
  isPaymentRegisterableState,
  paymentMethodLabel,
  pickJournalId,
  type PaymentMethodCode,
} from "../shell/payment-registers.ts";
import {
  buildFwPendingCsv,
  canMarkFwLoaded,
  canMarkFwLoadedBulk,
  filterMarkFwBulkItems,
  filterMarkFwLoadedValues,
  isFwMarkableState,
} from "../shell/fw-bridge.ts";
import {
  canArchiveRecord,
  canHardDelete,
  customerInvoiceDestError,
  filterCreateValues,
  filterWritableValues,
  getRecordWriteDef,
} from "../shell/record-writes.ts";
import {
  canFetchInvoicePdf,
  INVOICE_PDF_REPORT,
  invoicePdfFilename,
} from "../shell/invoice-pdf.ts";
import {
  canFetchPurchaseOrderPdf,
  canSendPurchaseOrderEmail,
  missingVendorContactHint,
  normalizeWhatsappPhone,
  purchaseOrderPdfFilename,
  purchaseOrderPdfPath,
  purchaseOrderWhatsappMessage,
  purchaseOrderWhatsappUrl,
  PURCHASE_ORDER_EMAIL_TEMPLATE,
  PURCHASE_ORDER_PDF_REPORT,
  type PurchaseOrderShareMeta,
} from "../shell/purchase-order-share.ts";
import {
  mapPurchaseOrderReceiptRow,
  receiptStatusLabel,
  type PurchaseOrderReceiptsPayload,
} from "../shell/purchase-order-receipts.ts";
import {
  canFetchSaleOrderPdf,
  canSendSaleOrderEmail,
  missingCustomerContactHint,
  normalizeWhatsappPhone as normalizeSaleWhatsappPhone,
  saleOrderDocumentLabel,
  saleOrderPdfFilename,
  saleOrderPdfPath,
  saleOrderWhatsappMessage,
  saleOrderWhatsappUrl,
  shouldMarkQuotationSentAfterEmail,
  SALE_ORDER_EMAIL_TEMPLATE,
  SALE_ORDER_PDF_REPORT,
  type SaleOrderShareMeta,
} from "../shell/sale-order-share.ts";
import {
  canFetchWorkshopOrderPdf,
  canSendWorkshopOrderEmail,
  missingWorkshopContactHint,
  resolveWorkshopShareContacts,
  workshopOrderPdfFilename,
  workshopOrderPdfPath,
  workshopOrderWhatsappMessage,
  workshopOrderWhatsappUrl,
  WORKSHOP_ORDER_EMAIL_TEMPLATE,
  WORKSHOP_ORDER_PDF_REPORT,
  type WorkshopOrderShareMeta,
} from "../shell/workshop-order-share.ts";
import {
  canCancelInvoice,
  canResetInvoiceDraft,
  getInvoiceLifecycleMoveType,
  isInvoiceLifecycleReady,
} from "../shell/invoice-lifecycle.ts";

/** Never requested from Odoo; computed in the BFF. */
const COMPUTED_LIST_FIELDS = new Set([
  "sg_doc_type_short",
  "payment_method",
  "product_count",
]);
/** On account.move only: filled from partner, not a move column. */
const MOVE_PARTNER_DEST_FIELD = "sg_invoice_dest";
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
    fields: [
      "name",
      "product_id",
      "quantity",
      "price_unit",
      "discount",
      "price_subtotal",
    ],
    columns: [
      { key: "name", label: "Etiqueta" },
      { key: "product_id", label: "Producto" },
      { key: "quantity", label: "Cantidad" },
      { key: "price_unit", label: "Precio" },
      { key: "discount", label: "Desc. %" },
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
  "sg.appliance": {
    model: "sg.work.order",
    domainField: "appliance_id",
    fields: ["date", "name", "owner_name", "amount", "state"],
    columns: [
      { key: "date", label: "Fecha" },
      { key: "name", label: "OT" },
      { key: "owner_name", label: "Propietario" },
      { key: "amount", label: "Importe" },
      { key: "state", label: "Estado" },
    ],
    order: "date desc, id desc",
    title: "Historial de órdenes",
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

  async changePassword(
    odooSessionId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const current = String(currentPassword || "");
    const next = String(newPassword || "");
    if (!current || !next) {
      throw new BffError(
        "validation_error",
        400,
        "Completá la contraseña actual y la nueva"
      );
    }
    if (current === next) {
      throw new BffError(
        "validation_error",
        400,
        "La nueva contraseña debe ser distinta a la actual"
      );
    }

    // Dedicated call: do NOT use #callKw — its Access Denied → unauthorized
    // mapping would wipe the BFF session on a wrong current password.
    let response: Response;
    try {
      response = await this.#post(
        "/web/dataset/call_kw",
        {
          jsonrpc: "2.0",
          params: {
            model: "res.users",
            method: "change_password",
            args: [current, next],
            kwargs: {},
          },
        },
        odooSessionId
      );
    } catch (cause) {
      this.#mapFetchFailure(cause);
    }

    const payload = (await response.json()) as JsonRpcResponse<unknown>;
    if (payload.error !== undefined) {
      const errObj = payload.error as {
        code?: number;
        data?: { name?: string; message?: string };
      } | undefined;
      const dataName = String(errObj?.data?.name || "");
      const dataMessage = String(errObj?.data?.message || "");

      if (
        dataName === "odoo.http.SessionExpiredException" ||
        /session expired/i.test(dataMessage)
      ) {
        throw new BffError(
          "unauthorized",
          401,
          "La sesión de Odoo no es válida"
        );
      }
      if (dataName === "odoo.exceptions.AccessDenied") {
        throw new BffError(
          "validation_error",
          400,
          "La contraseña actual no es correcta"
        );
      }
      if (dataName === "odoo.exceptions.UserError") {
        throw new BffError(
          "validation_error",
          400,
          dataMessage.trim() || "No se pudo cambiar la contraseña"
        );
      }

      const errorText = this.#describeRpcError(payload.error);
      if (/session expired|invalid session/i.test(errorText)) {
        throw new BffError(
          "unauthorized",
          401,
          "La sesión de Odoo no es válida"
        );
      }
      if (
        /access denied|incorrect current password|wrong current password/i.test(
          errorText
        )
      ) {
        throw new BffError(
          "validation_error",
          400,
          "La contraseña actual no es correcta"
        );
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
  }

  async updateLogin(
    odooSessionId: string,
    uid: number,
    login: string
  ): Promise<{ login: string }> {
    const next = String(login || "").trim();
    if (!next) {
      throw new BffError("validation_error", 400, "El usuario no puede estar vacío");
    }
    if (!Number.isFinite(uid) || uid <= 0) {
      throw new BffError("unauthorized", 401, "La sesión de Odoo no es válida");
    }
    if (!/^[a-zA-Z0-9._@+-]{2,64}$/.test(next)) {
      throw new BffError(
        "validation_error",
        400,
        "Usá un usuario de 2 a 64 caracteres (letras, números o . _ @ + -)"
      );
    }

    try {
      await this.#callKw(odooSessionId, "res.users", "write", [
        [uid],
        { login: next },
      ]);
    } catch (cause) {
      if (cause instanceof BffError) {
        if (cause.code === "unauthorized") throw cause;
        const detail = cause.message || "";
        if (/(already|existe|unique|duplic|taken)/i.test(detail)) {
          throw new BffError(
            "validation_error",
            400,
            "Ese usuario ya está en uso"
          );
        }
        throw new BffError(
          "validation_error",
          400,
          "No se pudo actualizar el usuario"
        );
      }
      throw cause;
    }

    return { login: next };
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
    const accentInsensitiveSearch =
      Boolean(q) && usesAccentInsensitiveListSearch(def.key);
    // Load base domain (no text ilike) and filter accent-insensitively so
    // "practica" matches "Práctica …" on categories and product lists.
    const domain = buildSearchDomain(
      def,
      accentInsensitiveSearch ? "" : q,
      new Date(),
      {
        categId: query.categId,
      }
    );
    const offset = (page - 1) * def.limit;

    const displayFields = [...def.fields];
    let fields = displayFields.filter((field) => {
      if (COMPUTED_LIST_FIELDS.has(field)) return false;
      if (
        def.model === "account.move" &&
        field === MOVE_PARTNER_DEST_FIELD
      ) {
        return false;
      }
      return true;
    });
    let rawRows: Record<string, unknown>[];
    const readLimit = accentInsensitiveSearch ? 2000 : def.limit;
    const readOffset = accentInsensitiveSearch ? 0 : offset;

    const readOnce = async (
      readDomain: unknown[],
      limit: number,
      readOff: number
    ) =>
      this.#searchRead(
        odooSessionId,
        def.model,
        readDomain,
        fields,
        limit,
        readOff,
        def.order
      );

    try {
      if (accentInsensitiveSearch) {
        rawRows = [];
        let scanOffset = 0;
        const scanCap = 20_000;
        while (scanOffset < scanCap) {
          const batch = await readOnce(domain, readLimit, scanOffset);
          rawRows.push(...batch);
          if (batch.length < readLimit) break;
          scanOffset += readLimit;
        }
      } else {
        rawRows = await readOnce(domain, readLimit, readOffset);
      }
    } catch (cause) {
      if (!(cause instanceof BffError) || cause.code === "unauthorized") {
        throw cause;
      }
      // Campos opcionales / aún no migrados en la BD.
      fields = fields.filter(
        (field) =>
          field !== "qty_available" &&
          field !== "sg_fw_loaded" &&
          field !== "sg_fw_number" &&
          field !== "sg_fw_loaded_at"
      );
      // Dominio con sg_fw_loaded falla si el campo no existe: degradar a FC posted.
      let retryDomain = domain;
      if (
        def.key === "accounting/factura-web-pending" &&
        JSON.stringify(domain).includes("sg_fw_loaded")
      ) {
        retryDomain = [
          ["move_type", "=", "out_invoice"],
          ["state", "=", "posted"],
        ];
      }
      if (accentInsensitiveSearch) {
        rawRows = [];
        let scanOffset = 0;
        const scanCap = 20_000;
        while (scanOffset < scanCap) {
          const batch = await readOnce(retryDomain, readLimit, scanOffset);
          rawRows.push(...batch);
          if (batch.length < readLimit) break;
          scanOffset += readLimit;
        }
      } else {
        rawRows = await readOnce(retryDomain, readLimit, readOffset);
      }
    }

    let filteredTotal: number | null = null;
    if (accentInsensitiveSearch) {
      const matched = rawRows.filter((row) =>
        matchesAccentInsensitiveSearch(
          accentSearchHaystackFields(def.key, row, def.searchFields || []),
          q
        )
      );
      filteredTotal = matched.length;
      rawRows = matched.slice(offset, offset + def.limit);
    }

    if (
      def.model === "account.move" &&
      displayFields.includes("sg_invoice_dest")
    ) {
      await this.#enrichRowsWithPartnerInvoiceDest(odooSessionId, rawRows);
    }

    if (displayFields.includes("sg_doc_type_short")) {
      for (const row of rawRows) {
        row.sg_doc_type_short = suggestedDocTypeShort(row.sg_invoice_dest);
      }
    }

    if (
      def.model === "pos.order" &&
      displayFields.includes("payment_method")
    ) {
      await this.#enrichPosOrdersWithPaymentMethod(odooSessionId, rawRows);
    }

    if (
      def.key === "inventory/categories" &&
      displayFields.includes("product_count")
    ) {
      await this.#enrichCategoryProductCounts(odooSessionId, rawRows);
    }

    const total =
      filteredTotal != null
        ? filteredTotal
        : await this.#callKw<number>(odooSessionId, def.model, "search_count", [
            domain,
          ]);

    const columns = def.columns.filter(
      (column) =>
        column.kind === "image" ||
        fields.includes(column.key) ||
        COMPUTED_LIST_FIELDS.has(column.key) ||
        (def.model === "account.move" &&
          column.key === MOVE_PARTNER_DEST_FIELD) ||
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

    const displayFields = [...def.fields];
    let fields = displayFields.filter((field) => {
      if (COMPUTED_LIST_FIELDS.has(field)) return false;
      if (
        def.model === "account.move" &&
        field === MOVE_PARTNER_DEST_FIELD
      ) {
        return false;
      }
      return true;
    });
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

    if (
      def.model === "account.move" &&
      displayFields.includes("sg_invoice_dest")
    ) {
      await this.#enrichRowsWithPartnerInvoiceDest(odooSessionId, [row]);
    }

    if (displayFields.includes("sg_doc_type_short")) {
      row.sg_doc_type_short = suggestedDocTypeShort(row.sg_invoice_dest);
    }

    if (
      def.model === "pos.order" &&
      displayFields.includes("payment_method")
    ) {
      await this.#enrichPosOrdersWithPaymentMethod(odooSessionId, [row]);
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
      sg_invoice_dest: "Factura como",
      sg_doc_type_short: "Tipo sugerido",
      sg_bill_source: "Origen del comprobante",
      invoice_status: "Estado factura",
      invoice_date_due: "Vence",
      amount_residual: "Saldo",
      amount_total: "Total",
      payment_state: "Pago",
      payment_method: "Tipo de pago",
      sg_fw_loaded: "Factura Web",
      sg_fw_number: "N° Factura Web",
      sg_fw_loaded_at: "Cargada el",
      serial_number: "Nº de serie",
      brand: "Marca",
      model: "Modelo",
      gas_type: "Tipo de gas",
      owner_name: "Propietario",
      owner_phone: "Celular",
      problem: "Problema",
      observation: "Observación",
      work_done: "Trabajos",
      materials: "Materiales",
      amount: "Importe",
      amount_collected: "Cobrado en caja",
      appliance_id: "Artefacto",
      work_order_count: "Órdenes",
      date: "Fecha",
      state: "Estado",
      partner_id: "Cliente",
    };
    for (const column of def.columns) {
      if (column.kind === "image") continue;
      labels[column.key] = column.label;
    }

    const lines = await this.#loadDetailLines(odooSessionId, def.model, id);

    const detailFields = displayFields.map((key) => {
      let value = this.#cellValue(row[key]);
      if (key === "sg_bill_source") {
        value = billSourceLabel(value) || value;
      }
      return {
        key,
        label: labels[key] || key,
        value,
      };
    });

    // Tipo sugerido largo en fichas de cliente / FC (fase 3a)
    if (
      (def.model === "res.partner" || def.model === "account.move") &&
      (row.sg_invoice_dest != null || def.model === "res.partner")
    ) {
      detailFields.push({
        key: "sg_doc_type_label",
        label: "Tipo sugerido",
        value: `${suggestedDocTypeLabel(row.sg_invoice_dest)} — ${SUGGESTED_DOC_TYPE_NOTE}`,
      });
    }

    // IDs crudos para editar borradores (no se muestran en UI de lectura).
    if (def.model === "account.move") {
      const partnerRef = this.#partnerIdFromM2o(row.partner_id);
      if (partnerRef > 0) {
        detailFields.push({
          key: "partner_ref_id",
          label: "Ref. contacto",
          value: partnerRef,
        });
      }
    }
    if (def.model === "sg.work.order") {
      const applianceRef = this.#partnerIdFromM2o(row.appliance_id);
      if (applianceRef > 0) {
        detailFields.push({
          key: "appliance_ref_id",
          label: "Ref. artefacto",
          value: applianceRef,
        });
      }
    }

    const attachments =
      def.key === "accounting/vendor-bills" || def.key === "workshop/orders"
        ? await this.#loadRecordAttachments(
            odooSessionId,
            def.model,
            id
          )
        : undefined;

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
      fields: detailFields,
      lines,
      ...(attachments ? { attachments } : {}),
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

    const fiscalError = customerInvoiceDestError(listKey, filtered);
    if (fiscalError) {
      throw new BffError("validation_error", 400, fiscalError);
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
    if (getInvoiceCreateDef(listKey)) {
      return this.#createInvoice(odooSessionId, listKey, values);
    }
    if (getOrderCreateDef(listKey)) {
      return this.#createMinimalOrder(odooSessionId, listKey, values);
    }
    if (canCreateWorkOrder(listKey)) {
      return this.#createWorkOrder(odooSessionId, listKey, values);
    }

    const writeDef = getRecordWriteDef(listKey);
    if (!writeDef?.createFields.length) {
      throw new BffError("not_found", 404, "Alta no permitida");
    }
    const filtered = filterCreateValues(listKey, values);
    if (!filtered) {
      throw new BffError("not_found", 404, "Datos de alta inválidos");
    }

    const fiscalError = customerInvoiceDestError(listKey, filtered);
    if (fiscalError) {
      throw new BffError("validation_error", 400, fiscalError);
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
      categoria: row.categoria,
      proveedor: row.proveedor,
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

      const categoria = String(line.categoria || "").trim();
      const proveedor = String(line.proveedor || "").trim();
      const categId = categoria
        ? await this.#ensureCategoryId(odooSessionId, categoria)
        : null;
      const partnerId = proveedor
        ? await this.#ensureSupplierPartnerId(odooSessionId, proveedor)
        : null;

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
        if (categId) vals.categ_id = categId;
        const productId = Number(
          await this.#callKw(odooSessionId, "product.template", "create", [vals])
        );
        if (partnerId && Number.isFinite(productId) && productId > 0) {
          await this.#upsertSupplierInfo(
            odooSessionId,
            productId,
            partnerId,
            line.standard_price
          );
        }
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
      if (categId) writeVals.categ_id = categId;
      if (Object.keys(writeVals).length) {
        await this.#callKw(odooSessionId, "product.template", "write", [
          [productId],
          writeVals,
        ]);
      }
      if (partnerId) {
        await this.#upsertSupplierInfo(
          odooSessionId,
          productId,
          partnerId,
          line.standard_price
        );
      }
      updated += 1;
    }

    return { created, updated, skipped };
  }

  async countProductsInCategory(
    odooSessionId: string,
    categoryId: number
  ): Promise<number> {
    const id = Number(categoryId);
    if (!Number.isFinite(id) || id <= 0) {
      throw new BffError("validation_error", 400, "Categoría inválida.");
    }
    const count = await this.#callKw<number>(
      odooSessionId,
      "product.template",
      "search_count",
      [[["categ_id", "=", id], ["active", "=", true]]]
    );
    return Number(count) || 0;
  }

  async purgeProductsByCategory(
    odooSessionId: string,
    input: { categoryId: number; confirmName: string }
  ): Promise<ProductPurgeByCategoryResult> {
    const categoryId = Number(input.categoryId);
    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      throw new BffError("validation_error", 400, "Categoría inválida.");
    }
    const [category] = await this.#searchRead(
      odooSessionId,
      "product.category",
      [["id", "=", categoryId]],
      ["id", "name", "complete_name"],
      1,
      0,
      "id"
    );
    if (!category) {
      throw new BffError("not_found", 404, "No encontramos esa categoría.");
    }
    const expectedName = String(category.name || category.complete_name || "");
    if (!confirmCategoryName(expectedName, input.confirmName)) {
      throw new BffError(
        "validation_error",
        400,
        "Escribí el nombre exacto de la categoría para confirmar."
      );
    }
    const productIds: number[] = [];
    const pageSize = 500;
    let offset = 0;
    while (true) {
      const batch = await this.#callKw<number[]>(
        odooSessionId,
        "product.template",
        "search",
        [[["categ_id", "=", categoryId]]],
        { limit: pageSize, offset, order: "id" }
      );
      if (!Array.isArray(batch) || !batch.length) break;
      for (const raw of batch) {
        const id = Number(raw);
        if (id > 0) productIds.push(id);
      }
      if (batch.length < pageSize) break;
      offset += pageSize;
    }
    const result = await hybridPurgeIds(productIds, {
      unlink: async (id) => {
        await this.#callKw(odooSessionId, "product.template", "unlink", [[id]]);
      },
      archive: async (id) => {
        await this.#callKw(odooSessionId, "product.template", "write", [
          [id],
          { active: false },
        ]);
      },
    });
    return {
      ...result,
      productCount: productIds.length,
      summary: summarizePurgeResult(result),
    };
  }

  async deleteCategoryHard(
    odooSessionId: string,
    input: { categoryId: number; confirmName: string }
  ): Promise<ProductPurgeByCategoryResult & { categoryDeleted: boolean }> {
    const categoryId = Number(input.categoryId);
    if (!Number.isFinite(categoryId) || categoryId <= 0) {
      throw new BffError("validation_error", 400, "Categoría inválida.");
    }
    const [category] = await this.#searchRead(
      odooSessionId,
      "product.category",
      [["id", "=", categoryId]],
      ["id", "name", "complete_name", "parent_id"],
      1,
      0,
      "id"
    );
    if (!category) {
      throw new BffError("not_found", 404, "No encontramos esa categoría.");
    }
    const expectedName = String(category.name || category.complete_name || "");
    if (!confirmCategoryName(expectedName, input.confirmName)) {
      throw new BffError(
        "validation_error",
        400,
        "Escribí el nombre exacto de la categoría para confirmar."
      );
    }
    const productIds: number[] = [];
    const pageSize = 500;
    let offset = 0;
    while (true) {
      const batch = await this.#callKw<number[]>(
        odooSessionId,
        "product.template",
        "search",
        [[["categ_id", "=", categoryId]]],
        { limit: pageSize, offset, order: "id" }
      );
      if (!Array.isArray(batch) || !batch.length) break;
      for (const raw of batch) {
        const id = Number(raw);
        if (id > 0) productIds.push(id);
      }
      if (batch.length < pageSize) break;
      offset += pageSize;
    }
    // Archive products (never hard-unlink) so they remain recoverable.
    const result = { deleted: 0, archived: 0, errors: [] as Array<{ id: number; message: string }> };
    for (const id of productIds) {
      try {
        await this.#callKw(odooSessionId, "product.template", "write", [
          [id],
          { active: false },
        ]);
        result.archived += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : "archive_failed";
        result.errors.push({ id, message });
      }
    }
    if (result.errors.length > 0) {
      return {
        ...result,
        productCount: productIds.length,
        summary: summarizePurgeResult(result),
        categoryDeleted: false,
      };
    }

    const parentRaw = category.parent_id;
    const parentId = Array.isArray(parentRaw)
      ? Number(parentRaw[0]) || 0
      : Number(parentRaw) || 0;
    const fallbackId = await this.#fallbackCategoryId(
      odooSessionId,
      categoryId,
      parentId
    );

    // Reassign remaining templates (incl. archived) so category can unlink.
    const remainingIds: number[] = [];
    offset = 0;
    while (true) {
      const batch = await this.#callKw<number[]>(
        odooSessionId,
        "product.template",
        "search",
        [[["categ_id", "=", categoryId]]],
        {
          limit: pageSize,
          offset,
          order: "id",
          context: { active_test: false },
        }
      );
      if (!Array.isArray(batch) || !batch.length) break;
      for (const raw of batch) {
        const id = Number(raw);
        if (id > 0) remainingIds.push(id);
      }
      if (batch.length < pageSize) break;
      offset += pageSize;
    }
    if (remainingIds.length > 0) {
      await this.#callKw(odooSessionId, "product.template", "write", [
        remainingIds,
        { categ_id: fallbackId },
      ]);
    }

    await this.#callKw(odooSessionId, "product.category", "unlink", [
      [categoryId],
    ]);
    return {
      ...result,
      productCount: productIds.length,
      summary: `${summarizePurgeResult(result)}; categoría eliminada`,
      categoryDeleted: true,
    };
  }

  async #fallbackCategoryId(
    odooSessionId: string,
    categoryId: number,
    parentId: number
  ): Promise<number> {
    if (parentId > 0 && parentId !== categoryId) return parentId;
    const allId = await this.#resolveXmlId(
      odooSessionId,
      "product.product_category_all"
    );
    if (allId > 0 && allId !== categoryId) return allId;
    const roots = await this.#searchRead(
      odooSessionId,
      "product.category",
      [["parent_id", "=", false]],
      ["id", "name"],
      10,
      0,
      "id"
    );
    for (const row of roots) {
      const id = Number(row.id) || 0;
      if (id > 0 && id !== categoryId) return id;
    }
    throw new BffError(
      "validation_error",
      400,
      "No hay una categoría de destino para reasignar los productos archivados."
    );
  }

  async #ensureCategoryId(
    odooSessionId: string,
    name: string
  ): Promise<number> {
    const trimmed = name.trim().slice(0, 128);
    const existing = await this.#searchRead(
      odooSessionId,
      "product.category",
      [["name", "=ilike", trimmed]],
      ["id", "name"],
      5,
      0,
      "id"
    );
    const exact = existing.find(
      (row) => String(row.name || "").trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (exact) return Number(exact.id);
    return Number(
      await this.#callKw(odooSessionId, "product.category", "create", [
        { name: trimmed },
      ])
    );
  }

  async #ensureSupplierPartnerId(
    odooSessionId: string,
    name: string
  ): Promise<number> {
    const trimmed = name.trim().slice(0, 128);
    const existing = await this.#searchRead(
      odooSessionId,
      "res.partner",
      [
        ["name", "=ilike", trimmed],
        ["supplier_rank", ">", 0],
      ],
      ["id", "name", "supplier_rank"],
      5,
      0,
      "id"
    );
    const exact = existing.find(
      (row) => String(row.name || "").trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (exact) return Number(exact.id);
    const anyPartner = await this.#searchRead(
      odooSessionId,
      "res.partner",
      [["name", "=ilike", trimmed]],
      ["id", "name", "supplier_rank"],
      5,
      0,
      "id"
    );
    const partnerExact = anyPartner.find(
      (row) => String(row.name || "").trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (partnerExact) {
      const id = Number(partnerExact.id);
      if (Number(partnerExact.supplier_rank || 0) <= 0) {
        await this.#callKw(odooSessionId, "res.partner", "write", [
          [id],
          { supplier_rank: 1 },
        ]);
      }
      return id;
    }
    return Number(
      await this.#callKw(odooSessionId, "res.partner", "create", [
        { name: trimmed, supplier_rank: 1, company_type: "company" },
      ])
    );
  }

  async #upsertSupplierInfo(
    odooSessionId: string,
    productTmplId: number,
    partnerId: number,
    price: number | null | undefined
  ): Promise<void> {
    const existing = await this.#searchRead(
      odooSessionId,
      "product.supplierinfo",
      [
        ["product_tmpl_id", "=", productTmplId],
        ["partner_id", "=", partnerId],
      ],
      ["id"],
      1,
      0,
      "id"
    );
    const vals: Record<string, number> = {};
    if (price != null && Number.isFinite(price)) {
      vals.price = price;
    }
    if (existing[0]?.id) {
      if (Object.keys(vals).length) {
        await this.#callKw(odooSessionId, "product.supplierinfo", "write", [
          [Number(existing[0].id)],
          vals,
        ]);
      }
      return;
    }
    await this.#callKw(odooSessionId, "product.supplierinfo", "create", [
      {
        product_tmpl_id: productTmplId,
        partner_id: partnerId,
        min_qty: 1,
        ...vals,
      },
    ]);
  }

  async previewVendorBillPdf(
    odooSessionId: string,
    input: { filename: string; content: string }
  ): Promise<VendorBillPdfPreview> {
    const filename = String(input.filename || "").trim().toLowerCase();
    if (!filename.endsWith(".pdf")) {
      throw new BffError("validation_error", 400, "Usá un archivo PDF.");
    }
    const rawB64 = stripBase64Payload(String(input.content || ""));
    if (!rawB64) {
      throw new BffError("validation_error", 400, "Usá un archivo PDF.");
    }
    let raw: Buffer;
    try {
      raw = Buffer.from(rawB64, "base64");
    } catch {
      throw new BffError("validation_error", 400, "Usá un archivo PDF.");
    }
    if (!isPdfMagic(raw)) {
      throw new BffError("validation_error", 400, "Usá un archivo PDF.");
    }
    if (raw.length > MAX_BILL_ATTACHMENT_BYTES) {
      throw new BffError("validation_error", 400, BILL_ATTACHMENT_SIZE_MSG);
    }

    const text = await extractPdfText(raw);
    const { lines: rawLines, partnerHint } = parseVendorBillText(text);
    const catalog = await this.#loadProductVariantCatalog(odooSessionId);
    const indexes = buildProductIndexes(catalog);
    const classified = classifyBillLines(rawLines, indexes);
    const counts = countBillLineStatuses(classified);
    return {
      lines: classified.map((row) => ({
        status: row.status,
        reason: row.reason,
        productId: row.productId,
        candidates: row.candidates,
        code: row.code,
        name: row.name,
        qty: row.qty,
        price: row.price,
      })),
      counts,
      partnerHint,
    };
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

  async #loadProductVariantCatalog(odooSessionId: string) {
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
        "product.product",
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

  async #createInvoice(
    odooSessionId: string,
    listKey: string,
    values: Record<string, unknown>
  ): Promise<{ id: number; detailPath: string }> {
    const invoiceDef = getInvoiceCreateDef(listKey);
    if (!invoiceDef) {
      throw new BffError("not_found", 404, "Alta no permitida");
    }
    const filtered = filterInvoiceCreateValues(listKey, values);
    if (!filtered) {
      throw new BffError("not_found", 404, "Datos de alta inválidos");
    }

    const invoice_line_ids = filtered.lines.map((line) => {
      const vals: Record<string, number> = {
        product_id: line.productId,
        quantity: line.qty,
      };
      if (line.price !== undefined) vals.price_unit = line.price;
      if (line.discount !== undefined) vals.discount = line.discount;
      return [0, 0, vals];
    });

    const createVals: Record<string, unknown> = {
      move_type: invoiceDef.moveType,
      partner_id: filtered.partnerId,
      invoice_line_ids,
    };
    // Odoo 19 exige invoice_date para publicar FP/NC proveedor.
    if (
      invoiceDef.moveType === "in_invoice" ||
      invoiceDef.moveType === "in_refund"
    ) {
      createVals.invoice_date = new Date().toISOString().slice(0, 10);
    }
    if (filtered.billSource) {
      createVals.sg_bill_source = filtered.billSource;
    }

    const id = Number(
      await this.#callKw<number>(odooSessionId, invoiceDef.model, "create", [
        createVals,
      ])
    );

    if (invoiceDef.requireAttachment && filtered.attachment) {
      try {
        await this.#callKw(odooSessionId, "ir.attachment", "create", [
          {
            name: filtered.attachment.filename,
            type: "binary",
            datas: filtered.attachment.content,
            mimetype: filtered.attachment.mimetype,
            res_model: "account.move",
            res_id: id,
          },
        ]);
      } catch (cause) {
        try {
          await this.#callKw(odooSessionId, invoiceDef.model, "unlink", [
            [id],
          ]);
        } catch {
          // Best-effort rollback; surface the original failure below.
        }
        if (cause instanceof BffError) throw cause;
        throw new BffError(
          "upstream_error",
          502,
          "No se pudo adjuntar el comprobante"
        );
      }
    }

    const list = getRecordListDef(listKey);
    const detailPath =
      (list && buildDetailPath(list, id)) || `/lists/${listKey}/${id}`;
    return { id, detailPath };
  }

  async updateInvoiceDraft(
    odooSessionId: string,
    listKey: string,
    id: number,
    values: Record<string, unknown>
  ): Promise<{ ok: true; id: number; detailPath: string }> {
    const invoiceDef = getInvoiceCreateDef(listKey);
    if (!invoiceDef || !canUpdateInvoiceDraft(listKey)) {
      throw new BffError("not_found", 404, "Edición de borrador no permitida");
    }
    if (!Number.isFinite(id) || id <= 0) {
      throw new BffError("not_found", 404, "Registro no encontrado");
    }
    const filtered = filterInvoiceDraftUpdateValues(listKey, values);
    if (!filtered) {
      throw new BffError("validation_error", 400, "Datos de edición inválidos");
    }

    const [move] = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      "account.move",
      "read",
      [[id], ["state", "move_type", "name"]]
    );
    if (!move) {
      throw new BffError("not_found", 404, "Comprobante no encontrado");
    }
    if (String(move.state || "") !== "draft") {
      throw new BffError(
        "validation_error",
        400,
        "Solo se editan comprobantes en borrador"
      );
    }
    if (String(move.move_type || "") !== invoiceDef.moveType) {
      throw new BffError(
        "validation_error",
        400,
        "El tipo de comprobante no coincide con la lista"
      );
    }

    const invoice_line_ids: unknown[] = [[5, 0, 0]];
    for (const line of filtered.lines) {
      const vals: Record<string, number> = {
        product_id: line.productId,
        quantity: line.qty,
      };
      if (line.price !== undefined) vals.price_unit = line.price;
      if (line.discount !== undefined) vals.discount = line.discount;
      invoice_line_ids.push([0, 0, vals]);
    }

    const writeVals: Record<string, unknown> = {
      partner_id: filtered.partnerId,
      invoice_line_ids,
    };
    if (filtered.billSource) {
      writeVals.sg_bill_source = filtered.billSource;
    }

    await this.#callKw(odooSessionId, "account.move", "write", [
      [id],
      writeVals,
    ]);

    const list = getRecordListDef(listKey);
    const detailPath =
      (list && buildDetailPath(list, id)) || `/lists/${listKey}/${id}`;
    return { ok: true, id, detailPath };
  }

  async registerPayment(
    odooSessionId: string,
    listKey: string,
    id: number,
    values: Record<string, unknown> = {}
  ): Promise<{ ok: true; paymentState: string | null; residual: number }> {
    const paymentDef = getPaymentRegisterDef(listKey);
    if (!paymentDef) {
      throw new BffError("not_found", 404, "Pago no permitido");
    }
    if (!Number.isFinite(id) || id <= 0) {
      throw new BffError("not_found", 404, "Registro no encontrado");
    }

    const filtered = filterPaymentRegisterValues(listKey, values);
    if (!filtered) {
      throw new BffError(
        "validation_error",
        400,
        "Medio de pago o monto inválido"
      );
    }

    const [move] = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      "account.move",
      "read",
      [
        [id],
        [
          "state",
          "payment_state",
          "move_type",
          "amount_residual",
          "name",
          "partner_id",
        ],
      ]
    );
    if (!move) {
      throw new BffError("not_found", 404, "Comprobante no encontrado");
    }

    const moveType = move.move_type == null ? "" : String(move.move_type);
    if (!paymentDef.expectedMoveTypes.includes(moveType)) {
      throw new BffError(
        "validation_error",
        400,
        "Este comprobante no admite este tipo de pago"
      );
    }

    const state = move.state == null ? null : String(move.state);
    const paymentState =
      move.payment_state == null ? null : String(move.payment_state);
    if (!isPaymentRegisterableState(state, paymentState)) {
      throw new BffError(
        "validation_error",
        400,
        "Solo se pueden registrar pagos en facturas publicadas con saldo"
      );
    }

    const residual = Number(move.amount_residual);
    if (!Number.isFinite(residual) || residual <= 0) {
      throw new BffError(
        "validation_error",
        400,
        "Esta factura no tiene saldo pendiente"
      );
    }

    if (filtered.amount !== undefined && filtered.amount > residual + 0.0001) {
      throw new BffError(
        "validation_error",
        400,
        `El monto no puede superar el saldo (${residual})`
      );
    }

    const journalId = await this.#resolvePaymentJournalId(
      odooSessionId,
      filtered.paymentMethod
    );
    if (!journalId) {
      throw new BffError(
        "validation_error",
        400,
        `No hay un diario contable para ${paymentMethodLabel(filtered.paymentMethod)}. Configurá caja/banco en Odoo.`
      );
    }

    const wizardVals: Record<string, unknown> = {
      journal_id: journalId,
    };
    if (filtered.amount !== undefined) {
      wizardVals.amount = filtered.amount;
    }

    const ctx = {
      active_model: "account.move",
      active_ids: [id],
      active_id: id,
    };

    try {
      const wizardId = await this.#callKw<number>(
        odooSessionId,
        "account.payment.register",
        "create",
        [wizardVals],
        { context: ctx }
      );
      await this.#callKw(
        odooSessionId,
        "account.payment.register",
        "action_create_payments",
        [[wizardId]],
        { context: ctx }
      );
    } catch (cause) {
      if (cause instanceof BffError && cause.code === "unauthorized") {
        throw cause;
      }
      if (cause instanceof BffError && cause.code === "validation_error") {
        throw cause;
      }
      throw new BffError(
        "action_failed",
        502,
        "No se pudo registrar el pago"
      );
    }

    const [after] = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      "account.move",
      "read",
      [[id], ["payment_state", "amount_residual"]]
    );
    return {
      ok: true,
      paymentState:
        after?.payment_state == null ? null : String(after.payment_state),
      residual: Number(after?.amount_residual) || 0,
    };
  }

  async #enrichRowsWithPartnerInvoiceDest(
    odooSessionId: string,
    rows: Record<string, unknown>[]
  ): Promise<void> {
    const partnerIds = new Set<number>();
    for (const row of rows) {
      const pid = this.#partnerIdFromM2o(row.partner_id);
      if (pid > 0) partnerIds.add(pid);
    }
    if (!partnerIds.size) {
      for (const row of rows) row.sg_invoice_dest = "cf";
      return;
    }

    const partners = await this.#searchRead(
      odooSessionId,
      "res.partner",
      [["id", "in", [...partnerIds]]],
      ["id", "sg_invoice_dest"],
      partnerIds.size,
      0,
      "id asc"
    );
    const destById = new Map<number, string>();
    for (const partner of partners) {
      const id = Number(partner.id);
      if (!Number.isFinite(id)) continue;
      destById.set(
        id,
        partner.sg_invoice_dest == null
          ? "cf"
          : String(partner.sg_invoice_dest)
      );
    }
    for (const row of rows) {
      const pid = this.#partnerIdFromM2o(row.partner_id);
      row.sg_invoice_dest = destById.get(pid) || "cf";
    }
  }

  async #enrichCategoryProductCounts(
    odooSessionId: string,
    rows: Record<string, unknown>[]
  ): Promise<void> {
    for (const row of rows) row.product_count = 0;
    const ids = rows
      .map((row) => Number(row.id))
      .filter((id) => Number.isFinite(id) && id > 0);
    if (!ids.length) return;

    const groups = await this.#callKw<
      Array<{ categ_id?: unknown; categ_id_count?: number; __count?: number }>
    >(odooSessionId, "product.template", "read_group", [
      [
        ["active", "=", true],
        ["categ_id", "in", ids],
      ],
      ["categ_id"],
      ["categ_id"],
    ]);

    const countById = new Map<number, number>();
    for (const group of groups || []) {
      const categ = group.categ_id;
      let categId = 0;
      if (Array.isArray(categ) && categ.length) {
        categId = Number(categ[0]) || 0;
      } else {
        categId = Number(categ) || 0;
      }
      const count = Number(group.categ_id_count ?? group.__count ?? 0) || 0;
      if (categId > 0) countById.set(categId, count);
    }
    for (const row of rows) {
      const id = Number(row.id) || 0;
      row.product_count = countById.get(id) || 0;
    }
  }

  async #enrichPosOrdersWithPaymentMethod(
    odooSessionId: string,
    rows: Record<string, unknown>[]
  ): Promise<void> {
    const orderIds = [
      ...new Set(
        rows
          .map((row) => Number(row.id) || 0)
          .filter((id) => id > 0)
      ),
    ];
    for (const row of rows) {
      row.payment_method = null;
    }
    if (!orderIds.length) return;

    const payments = await this.#searchRead(
      odooSessionId,
      "pos.payment",
      [["pos_order_id", "in", orderIds]],
      ["pos_order_id", "payment_method_id"],
      Math.max(orderIds.length * 8, 40),
      0,
      "id asc"
    );
    const namesByOrder = new Map<number, string[]>();
    for (const pay of payments) {
      const order = Array.isArray(pay.pos_order_id) ? pay.pos_order_id : [];
      const orderId = Number(order[0]) || 0;
      if (!(orderId > 0)) continue;
      const pm = Array.isArray(pay.payment_method_id)
        ? pay.payment_method_id
        : [];
      const name = pm[1] != null ? String(pm[1]) : "";
      if (!name) continue;
      const list = namesByOrder.get(orderId) || [];
      list.push(name);
      namesByOrder.set(orderId, list);
    }
    for (const row of rows) {
      const id = Number(row.id) || 0;
      const label = formatPosOrderPaymentLabel(namesByOrder.get(id) || []);
      row.payment_method = label || null;
    }
  }

  async #assertPartnerOkToPublishInvoice(
    odooSessionId: string,
    move: Record<string, unknown> | undefined
  ): Promise<void> {
    const partnerId = this.#partnerIdFromM2o(move?.partner_id);
    if (partnerId <= 0) {
      throw new BffError(
        "validation_error",
        400,
        "La factura no tiene cliente"
      );
    }
    const [partner] = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      "res.partner",
      "read",
      [[partnerId], ["sg_invoice_dest", "vat", "street", "city"]]
    );
    const fiscalError = publishInvoiceDestError(partner);
    if (fiscalError) {
      throw new BffError("validation_error", 400, fiscalError);
    }
  }

  #partnerIdFromM2o(value: unknown): number {
    if (Array.isArray(value) && value.length) {
      const id = Number(value[0]);
      return Number.isFinite(id) && id > 0 ? id : 0;
    }
    const id = Number(value);
    return Number.isFinite(id) && id > 0 ? id : 0;
  }

  async #createWorkOrder(
    odooSessionId: string,
    listKey: string,
    values: Record<string, unknown>
  ): Promise<{ id: number; detailPath: string }> {
    if (!canCreateWorkOrder(listKey)) {
      throw new BffError("not_found", 404, "Alta no permitida");
    }
    const filtered = filterWorkOrderCreateValues(values);
    if (!filtered) {
      throw new BffError(
        "validation_error",
        400,
        "Indicá el número de serie del artefacto"
      );
    }

    let attachment: { filename: string; mimetype: string; content: string } | undefined;
    if (filtered.attachment) {
      const normalized = normalizeBillAttachment(filtered.attachment);
      attachment = {
        filename: normalized.filename,
        mimetype: normalized.mimetype,
        content: normalized.content,
      };
    }

    const payload: Record<string, unknown> = { ...filtered };
    delete payload.attachment;

    const id = Number(
      await this.#callKw<number>(
        odooSessionId,
        "sg.work.order",
        "create_from_shell",
        [payload]
      )
    );
    if (!Number.isFinite(id) || id <= 0) {
      throw new BffError("backend_error", 502, "No se pudo crear la OT");
    }

    if (attachment) {
      try {
        await this.#callKw(odooSessionId, "ir.attachment", "create", [
          {
            name: attachment.filename,
            type: "binary",
            datas: attachment.content,
            mimetype: attachment.mimetype,
            res_model: "sg.work.order",
            res_id: id,
          },
        ]);
      } catch (cause) {
        try {
          await this.#callKw(odooSessionId, "sg.work.order", "unlink", [[id]]);
        } catch {
          // Best-effort rollback
        }
        if (cause instanceof BffError) throw cause;
        throw new BffError("backend_error", 502, "No se pudo guardar la foto");
      }
    }

    const list = getRecordListDef(listKey);
    const detailPath =
      (list && buildDetailPath(list, id)) || `/lists/${listKey}/${id}`;
    return { id, detailPath };
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

  async deleteRecord(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<DeleteRecordResult> {
    if (!canHardDelete(listKey)) {
      throw new BffError("not_found", 404, "Eliminación no permitida");
    }
    if (!Number.isFinite(id) || id <= 0) {
      throw new BffError("not_found", 404, "Registro no encontrado");
    }
    const list = getRecordListDef(listKey);
    if (!list) {
      throw new BffError("not_found", 404, "Eliminación no permitida");
    }

    // Inventory products: hybrid (unlink → archive). Workshop OT: hard unlink.
    if (listKey === "inventory/products") {
      const result = await hybridPurgeIds([id], {
        unlink: async (productId) => {
          await this.#callKw(odooSessionId, list.model, "unlink", [
            [productId],
          ]);
        },
        archive: async (productId) => {
          await this.#callKw(odooSessionId, list.model, "write", [
            [productId],
            { active: false },
          ]);
        },
      });
      if (result.errors.length > 0) {
        throw new BffError(
          "odoo_unavailable",
          503,
          result.errors[0]?.message || "No se pudo eliminar el producto"
        );
      }
      return { outcome: result.archived > 0 ? "archived" : "deleted" };
    }

    await this.#callKw(odooSessionId, list.model, "unlink", [[id]]);
    return { outcome: "deleted" };
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

    const readFields =
      actionDef.model === "account.move"
        ? ["state", "name", "partner_id", "move_type"]
        : ["state", "name"];
    const [row] = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      actionDef.model,
      "read",
      [[id], readFields]
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

    if (
      actionDef.model === "account.move" &&
      actionDef.method === "action_post"
    ) {
      const moveType = row?.move_type == null ? null : String(row.move_type);
      if (moveType === "out_invoice" || moveType === "out_refund") {
        await this.#assertPartnerOkToPublishInvoice(odooSessionId, row);
      }
      if (moveType === "in_invoice" || moveType === "in_refund") {
        const [full] = await this.#callKw<Record<string, unknown>[]>(
          odooSessionId,
          "account.move",
          "read",
          [[id], ["invoice_date"]]
        );
        if (!full?.invoice_date) {
          await this.#callKw(odooSessionId, "account.move", "write", [
            [id],
            { invoice_date: new Date().toISOString().slice(0, 10) },
          ]);
        }
      }
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

  async resetInvoiceDraft(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<{ ok: true; state: string | null }> {
    if (!canResetInvoiceDraft(listKey)) {
      throw new BffError("not_found", 404, "Reset no permitido");
    }
    const move = await this.#getLifecycleMove(
      odooSessionId,
      listKey,
      id,
      "Solo se puede volver a borrador si está publicado y sin cobros/pagos"
    );

    await this.#callKw(odooSessionId, "account.move", "button_draft", [[id]]);
    if (move.sg_fw_loaded) {
      await this.#callKw(odooSessionId, "account.move", "write", [
        [id],
        {
          sg_fw_loaded: false,
          sg_fw_number: false,
          sg_fw_loaded_at: false,
        },
      ]);
    }
    return this.#readInvoiceLifecycleState(odooSessionId, id);
  }

  async cancelInvoice(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<{ ok: true; state: string | null }> {
    if (!canCancelInvoice(listKey)) {
      throw new BffError("not_found", 404, "Anulación no permitida");
    }
    await this.#getLifecycleMove(
      odooSessionId,
      listKey,
      id,
      "Solo se puede anular si está publicado y sin cobros/pagos"
    );
    await this.#callKw(odooSessionId, "account.move", "button_cancel", [[id]]);
    return this.#readInvoiceLifecycleState(odooSessionId, id);
  }

  async #getLifecycleMove(
    odooSessionId: string,
    listKey: string,
    id: number,
    notReadyMessage: string
  ): Promise<Record<string, unknown>> {
    if (!Number.isFinite(id) || id <= 0) {
      throw new BffError("not_found", 404, "Comprobante no encontrado");
    }
    const expectedType = getInvoiceLifecycleMoveType(listKey);
    const [move] = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      "account.move",
      "read",
      [[id], ["state", "move_type", "payment_state", "sg_fw_loaded", "name"]]
    );
    if (!move) {
      throw new BffError("not_found", 404, "Comprobante no encontrado");
    }
    if (String(move.move_type || "") !== expectedType) {
      throw new BffError(
        "validation_error",
        400,
        "Tipo de comprobante no coincide con la lista"
      );
    }
    if (!isInvoiceLifecycleReady(move.state as string, move.payment_state as string)) {
      throw new BffError(
        "validation_error",
        400,
        notReadyMessage
      );
    }
    return move;
  }

  async #readInvoiceLifecycleState(
    odooSessionId: string,
    id: number
  ): Promise<{ ok: true; state: string | null }> {
    const [after] = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      "account.move",
      "read",
      [[id], ["state"]]
    );
    return {
      ok: true,
      state: after?.state == null ? null : String(after.state),
    };
  }

  async createInvoiceFromOrder(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<{ ok: true; id: number; detailPath: string }> {
    if (!canCreateInvoiceFromOrder(listKey)) {
      throw new BffError("not_found", 404, "Facturación no permitida");
    }
    if (!Number.isFinite(id) || id <= 0) {
      throw new BffError("not_found", 404, "Registro no encontrado");
    }

    const [order] = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      "sale.order",
      "read",
      [[id], ["name", "invoice_status", "invoice_ids", "partner_id", "state"]]
    );
    if (!order) {
      throw new BffError("not_found", 404, "Pedido no encontrado");
    }
    if (!isOrderReadyToInvoice(order.invoice_status as string)) {
      throw new BffError(
        "validation_error",
        400,
        "Este pedido no está listo para facturar"
      );
    }

    const beforeIds = this.#idsFromM2m(order.invoice_ids);

    try {
      await this.#callKw(
        odooSessionId,
        "sale.order",
        "_create_invoices",
        [[id]],
        { final: true }
      );
    } catch (cause) {
      if (cause instanceof BffError && cause.code === "unauthorized") {
        throw cause;
      }
      // Fallback: wizard estándar de Odoo
      try {
        const wizardId = await this.#callKw<number>(
          odooSessionId,
          "sale.advance.payment.inv",
          "create",
          [{ advance_payment_method: "delivered" }],
          {
            context: {
              active_model: "sale.order",
              active_ids: [id],
              active_id: id,
            },
          }
        );
        await this.#callKw(
          odooSessionId,
          "sale.advance.payment.inv",
          "create_invoices",
          [[wizardId]],
          {
            context: {
              active_model: "sale.order",
              active_ids: [id],
              active_id: id,
            },
          }
        );
      } catch (wizardCause) {
        if (
          wizardCause instanceof BffError &&
          wizardCause.code === "unauthorized"
        ) {
          throw wizardCause;
        }
        throw new BffError(
          "action_failed",
          502,
          "No se pudo crear la factura desde el pedido"
        );
      }
    }

    const [after] = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      "sale.order",
      "read",
      [[id], ["invoice_ids"]]
    );
    const afterIds = this.#idsFromM2m(after?.invoice_ids);
    const created = afterIds.filter((invoiceId) => !beforeIds.includes(invoiceId));
    const invoiceId =
      created.length > 0
        ? Math.max(...created)
        : afterIds.length > 0
          ? Math.max(...afterIds)
          : 0;
    if (!invoiceId) {
      throw new BffError(
        "action_failed",
        502,
        "Odoo no devolvió una factura de cliente"
      );
    }

    const list = getRecordListDef("accounting/customer-invoices");
    const detailPath =
      (list && buildDetailPath(list, invoiceId)) ||
      `/lists/accounting/customer-invoices/${invoiceId}`;
    return { ok: true, id: invoiceId, detailPath };
  }

  async createInvoiceFromPos(
    odooSessionId: string,
    listKey: string,
    id: number,
    options: { partnerId?: number } = {}
  ): Promise<{ ok: true; id: number; detailPath: string }> {
    if (!canCreateInvoiceFromPos(listKey)) {
      throw new BffError("not_found", 404, "Facturación no permitida");
    }
    if (!Number.isFinite(id) || id <= 0) {
      throw new BffError("not_found", 404, "Registro no encontrado");
    }

    let order: Record<string, unknown> | undefined;
    try {
      const [row] = await this.#callKw<Record<string, unknown>[]>(
        odooSessionId,
        "pos.order",
        "read",
        [
          [id],
          ["name", "partner_id", "state", "amount_total", "account_move", "date_order"],
        ]
      );
      order = row;
    } catch (cause) {
      if (cause instanceof BffError && cause.code === "unauthorized") {
        throw cause;
      }
      const [row] = await this.#callKw<Record<string, unknown>[]>(
        odooSessionId,
        "pos.order",
        "read",
        [[id], ["name", "partner_id", "state", "amount_total", "date_order"]]
      );
      order = row;
    }

    if (!order) {
      throw new BffError("not_found", 404, "Venta de caja no encontrada");
    }
    if (!isPosOrderReadyToInvoice(order.state as string)) {
      throw new BffError(
        "validation_error",
        400,
        "Solo se puede facturar una venta de caja cobrada"
      );
    }

    const existingMove = this.#partnerIdFromM2o(order.account_move);
    // account_move is m2o; reuse partnerIdFromM2o helper for [id, name] tuples
    if (existingMove > 0) {
      const list = getRecordListDef("accounting/customer-invoices");
      const detailPath =
        (list && buildDetailPath(list, existingMove)) ||
        `/lists/accounting/customer-invoices/${existingMove}`;
      return { ok: true, id: existingMove, detailPath };
    }

    let partnerId = this.#partnerIdFromM2o(order.partner_id);
    const requestedPartner = Number(options.partnerId);
    if (
      partnerId <= 0 &&
      Number.isFinite(requestedPartner) &&
      requestedPartner > 0
    ) {
      const partners = await this.#searchRead(
        odooSessionId,
        "res.partner",
        [["id", "=", requestedPartner]],
        ["name"],
        1,
        0,
        "id asc"
      );
      if (!partners[0]?.id) {
        throw new BffError("not_found", 404, "Cliente no encontrado");
      }
      await this.#callKw(odooSessionId, "pos.order", "write", [
        [id],
        { partner_id: requestedPartner },
      ]);
      partnerId = requestedPartner;
    }
    if (partnerId <= 0) {
      throw new BffError(
        "validation_error",
        400,
        "Elegí un cliente para facturar esta venta de caja"
      );
    }

    const lines = await this.#searchRead(
      odooSessionId,
      "pos.order.line",
      [["order_id", "=", id]],
      ["product_id", "qty", "price_unit", "discount"],
      200,
      0,
      "id asc"
    );
    const invoice_line_ids: unknown[] = [];
    for (const line of lines) {
      const productId = this.#partnerIdFromM2o(line.product_id);
      const qty = Number(line.qty);
      if (productId <= 0 || !Number.isFinite(qty) || qty <= 0) continue;
      const vals: Record<string, number> = {
        product_id: productId,
        quantity: qty,
      };
      const price = Number(line.price_unit);
      if (Number.isFinite(price)) vals.price_unit = price;
      const discount = Number(line.discount);
      if (Number.isFinite(discount) && discount > 0) vals.discount = discount;
      invoice_line_ids.push([0, 0, vals]);
    }
    if (!invoice_line_ids.length) {
      throw new BffError(
        "validation_error",
        400,
        "La venta de caja no tiene líneas facturables"
      );
    }

    const ticketName = order.name == null ? "" : String(order.name);
    const invoiceId = await this.#callKw<number>(
      odooSessionId,
      "account.move",
      "create",
      [
        {
          move_type: "out_invoice",
          partner_id: partnerId,
          invoice_origin: ticketName || undefined,
          ref: ticketName || undefined,
          invoice_line_ids,
        },
      ]
    );

    try {
      await this.#callKw(odooSessionId, "pos.order", "write", [
        [id],
        { account_move: Number(invoiceId) },
      ]);
    } catch {
      // Campo account_move puede no existir / no ser writable en todas las builds.
    }

    const list = getRecordListDef("accounting/customer-invoices");
    const detailPath =
      (list && buildDetailPath(list, Number(invoiceId))) ||
      `/lists/accounting/customer-invoices/${invoiceId}`;
    return { ok: true, id: Number(invoiceId), detailPath };
  }

  async markFwLoaded(
    odooSessionId: string,
    listKey: string,
    id: number,
    values: Record<string, unknown> = {}
  ): Promise<{ ok: true; sg_fw_loaded: true; sg_fw_number: string | null }> {
    if (!canMarkFwLoaded(listKey)) {
      throw new BffError("not_found", 404, "Marcado Factura Web no permitido");
    }
    if (!Number.isFinite(id) || id <= 0) {
      throw new BffError("not_found", 404, "Registro no encontrado");
    }
    const filtered = filterMarkFwLoadedValues(listKey, values);
    if (!filtered) {
      throw new BffError("validation_error", 400, "Datos de marcado inválidos");
    }

    const [move] = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      "account.move",
      "read",
      [[id], ["state", "move_type", "sg_fw_loaded", "name"]]
    );
    if (!move) {
      throw new BffError("not_found", 404, "Factura no encontrada");
    }
    if (String(move.move_type || "") !== "out_invoice") {
      throw new BffError(
        "validation_error",
        400,
        "Solo se marcan facturas de cliente"
      );
    }
    if (!isFwMarkableState(move.state as string, move.sg_fw_loaded)) {
      throw new BffError(
        "validation_error",
        400,
        "La factura ya está marcada o no está publicada"
      );
    }

    const writeVals: Record<string, unknown> = {
      sg_fw_loaded: true,
      sg_fw_loaded_at: new Date().toISOString().slice(0, 19).replace("T", " "),
      sg_fw_number: filtered.fwNumber,
    };

    await this.#callKw(odooSessionId, "account.move", "write", [
      [id],
      writeVals,
    ]);

    return {
      ok: true,
      sg_fw_loaded: true,
      sg_fw_number: filtered.fwNumber || null,
    };
  }

  async markFwLoadedBulk(
    odooSessionId: string,
    listKey: string,
    items: unknown
  ): Promise<{
    ok: true;
    marked: number;
    skipped: number;
    markedIds: number[];
  }> {
    if (!canMarkFwLoadedBulk(listKey)) {
      throw new BffError("not_found", 404, "Marcado Factura Web no permitido");
    }
    const filteredItems = filterMarkFwBulkItems(items);
    if (!filteredItems) {
      throw new BffError(
        "validation_error",
        400,
        "Seleccioná entre 1 y 100 facturas con N° Factura Web"
      );
    }
    const ids = filteredItems.map((item) => item.id);
    const numberById = new Map(
      filteredItems.map((item) => [item.id, item.fwNumber])
    );

    const moves = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      "account.move",
      "read",
      [ids, ["state", "move_type", "sg_fw_loaded", "name"]]
    );
    const byId = new Map(
      (moves || []).map((move) => [Number(move.id), move] as const)
    );
    const markedIds: number[] = [];
    for (const id of ids) {
      const move = byId.get(id);
      if (!move) continue;
      if (String(move.move_type || "") !== "out_invoice") continue;
      if (!isFwMarkableState(move.state as string, move.sg_fw_loaded)) continue;
      markedIds.push(id);
    }

    for (const id of markedIds) {
      await this.#callKw(odooSessionId, "account.move", "write", [
        [id],
        {
          sg_fw_loaded: true,
          sg_fw_loaded_at: new Date()
            .toISOString()
            .slice(0, 19)
            .replace("T", " "),
          sg_fw_number: numberById.get(id),
        },
      ]);
    }

    return {
      ok: true,
      marked: markedIds.length,
      skipped: ids.length - markedIds.length,
      markedIds,
    };
  }

  async exportFwPendingCsv(
    odooSessionId: string
  ): Promise<{ filename: string; csv: string; count: number }> {
    const rows = await this.#searchRead(
      odooSessionId,
      "account.move",
      [
        ["move_type", "=", "out_invoice"],
        ["state", "=", "posted"],
        ["sg_fw_loaded", "=", false],
      ],
      [
        "name",
        "partner_id",
        "invoice_date",
        "amount_total",
        "ref",
        "sg_fw_number",
      ],
      500,
      0,
      "invoice_date desc, id desc"
    );

    await this.#enrichRowsWithPartnerInvoiceDest(odooSessionId, rows);

    const partnerIds = new Set<number>();
    for (const row of rows) {
      const pid = this.#partnerIdFromM2o(row.partner_id);
      if (pid > 0) partnerIds.add(pid);
    }
    const vatById = new Map<number, string>();
    const nameById = new Map<number, string>();
    if (partnerIds.size) {
      const partners = await this.#searchRead(
        odooSessionId,
        "res.partner",
        [["id", "in", [...partnerIds]]],
        ["id", "name", "vat"],
        partnerIds.size,
        0,
        "id asc"
      );
      for (const partner of partners) {
        const pid = Number(partner.id);
        if (!Number.isFinite(pid)) continue;
        vatById.set(pid, partner.vat == null ? "" : String(partner.vat));
        nameById.set(pid, partner.name == null ? "" : String(partner.name));
      }
    }

    const exportRows = rows.map((row) => {
      const pid = this.#partnerIdFromM2o(row.partner_id);
      const dest = row.sg_invoice_dest;
      return {
        invoice_date: row.invoice_date,
        name: row.name,
        partner_name: nameById.get(pid) || this.#cellValue(row.partner_id),
        vat: vatById.get(pid) || "",
        sg_invoice_dest: dest == null ? "cf" : String(dest),
        sg_doc_type_short: suggestedDocTypeShort(dest),
        amount_total: row.amount_total,
        sg_fw_number: row.sg_fw_number,
        ref: row.ref,
      };
    });

    const today = new Date();
    const ymd = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`;
    return {
      filename: `factura-web-pendientes-${ymd}.csv`,
      csv: buildFwPendingCsv(exportRows),
      count: exportRows.length,
    };
  }

  #idsFromM2m(value: unknown): number[] {
    if (!Array.isArray(value)) return [];
    const out: number[] = [];
    for (const item of value) {
      const id = Number(item);
      if (Number.isFinite(id) && id > 0) out.push(id);
    }
    return out;
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
        "No se pudo reservar stock para validar el movimiento"
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
        "La validación no completó el movimiento (puede requerir asistente en Odoo)"
      );
    }
    return { ok: true, state: afterState };
  }

  static readonly #CASH_SESSION_FIELDS = [
    "name",
    "state",
    "shift",
    "opened_at",
    "opened_by",
    "opening_balance",
    "note",
    "closed_at",
    "closed_by",
    "closing_counted",
    "closing_expected",
    "difference",
    "difference_note",
    "bank_deposit",
    "leave_float",
  ];

  async getOpenCashSession(
    odooSessionId: string
  ): Promise<CashSessionInfo | null> {
    const rows = await this.#searchRead(
      odooSessionId,
      "sg.cash.session",
      [["state", "=", "open"]],
      OdooAdapter.#CASH_SESSION_FIELDS,
      1,
      0,
      "opened_at desc, id desc"
    );
    if (!rows[0]) return null;
    return this.#mapCashSession(rows[0]);
  }

  async requireOpenCashSession(
    odooSessionId: string
  ): Promise<CashSessionInfo> {
    const session = await this.getOpenCashSession(odooSessionId);
    if (!session) {
      throw new BffError(
        "validation_error",
        409,
        "Abrí la caja antes de usar el mostrador"
      );
    }
    return session;
  }

  async getCashHistory(
    odooSessionId: string,
    limit = 20
  ): Promise<CashSessionInfo[]> {
    const rows = await this.#searchRead(
      odooSessionId,
      "sg.cash.session",
      [["state", "=", "closed"]],
      OdooAdapter.#CASH_SESSION_FIELDS,
      Math.min(Math.max(Number(limit) || 20, 1), 50),
      0,
      "closed_at desc, id desc"
    );
    return rows.map((row) => this.#mapCashSession(row));
  }

  async getCashSessionDetail(
    odooSessionId: string,
    sessionId: number
  ): Promise<CashSessionDetailPayload> {
    const id = Number(sessionId);
    if (!Number.isFinite(id) || id <= 0) {
      throw new BffError("not_found", 404, "Caja no encontrada");
    }
    const rows = await this.#searchRead(
      odooSessionId,
      "sg.cash.session",
      [["id", "=", id]],
      OdooAdapter.#CASH_SESSION_FIELDS,
      1,
      0,
      "id desc"
    );
    if (!rows[0]) {
      throw new BffError("not_found", 404, "Caja no encontrada");
    }
    const session = this.#mapCashSession(rows[0]);
    const feed = await this.#buildCashFeed(odooSessionId, session);
    const summary = summarizeCash(session.openingBalance, feed);
    return { session, summary, feed };
  }

  async getCashHub(odooSessionId: string): Promise<CashHubPayload> {
    const [session, history, capabilities] = await Promise.all([
      this.getOpenCashSession(odooSessionId),
      this.getCashHistory(odooSessionId, 10),
      this.#getCashCapabilities(odooSessionId),
    ]);
    if (!session) {
      return {
        session: null,
        summary: null,
        feed: [],
        history,
        alerts: [],
        capabilities,
        suggestedBankWithdraw: 0,
      };
    }
    const feed = await this.#buildCashFeed(odooSessionId, session);
    const summary = summarizeCash(session.openingBalance, feed);
    const alerts = buildCashAlerts({
      openedAt: session.openedAt,
      expectedCash: summary.expectedCash,
      cashThreshold: 100_000,
      openHoursThreshold: 12,
      feed,
    });
    return {
      session,
      summary,
      feed,
      history,
      alerts,
      capabilities,
      suggestedBankWithdraw: suggestedBankWithdraw(
        summary.expectedCash,
        session.openingBalance
      ),
    };
  }

  async openCashSession(
    odooSessionId: string,
    input: { openingBalance: number; note?: string; shift?: string }
  ): Promise<CashOpenResult> {
    const openingBalance = Number(input.openingBalance);
    if (!Number.isFinite(openingBalance) || openingBalance < 0) {
      throw new BffError(
        "validation_error",
        400,
        "El monto inicial no puede ser negativo"
      );
    }
    const shift = resolveCashShift(input.shift);
    if (!shift) {
      throw new BffError(
        "validation_error",
        400,
        "Elegí el turno (mañana, tarde o noche)"
      );
    }
    const existing = await this.getOpenCashSession(odooSessionId);
    if (existing) {
      throw new BffError(
        "validation_error",
        409,
        "Ya hay una caja abierta. Cerrala antes de abrir otra."
      );
    }

    const note = (input.note || "").trim();
    try {
      const created = await this.#callKw<number | number[]>(
        odooSessionId,
        "sg.cash.session",
        "action_open_session",
        [openingBalance, note || false, shift]
      );
      const sessionId = Array.isArray(created)
        ? Number(created[0])
        : Number(created);
      const rows = await this.#searchRead(
        odooSessionId,
        "sg.cash.session",
        [["id", "=", sessionId]],
        OdooAdapter.#CASH_SESSION_FIELDS,
        1,
        0,
        "id desc"
      );
      if (!rows[0]) {
        throw new BffError(
          "action_failed",
          503,
          "No se pudo abrir la caja"
        );
      }
      return { session: this.#mapCashSession(rows[0]) };
    } catch (cause) {
      if (cause instanceof BffError) throw cause;
      throw new BffError(
        "action_failed",
        503,
        "No se pudo abrir la caja"
      );
    }
  }

  async addCashMovement(
    odooSessionId: string,
    input: {
      kind: "in" | "out";
      amount: number;
      motiveCode: string;
      note?: string;
      medium?: "cash" | "transfer" | "card" | "other";
      workOrderId?: number;
    }
  ): Promise<CashMoveResult> {
    const session = await this.requireOpenCashSession(odooSessionId);
    const kind = input.kind === "out" ? "out" : "in";
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BffError(
        "validation_error",
        400,
        "El monto debe ser mayor a cero"
      );
    }
    if (kind === "out" && input.motiveCode === "retiro_dueno") {
      const capabilities = await this.#getCashCapabilities(odooSessionId);
      if (!capabilities.canOwnerWithdraw) {
        throw new BffError(
          "forbidden",
          403,
          "Solo un responsable de caja puede registrar retiro del dueño"
        );
      }
    }
    let reason = "";
    try {
      reason = buildCashMovementReason(kind, input.motiveCode, input.note);
    } catch (cause) {
      throw new BffError(
        "validation_error",
        400,
        cause instanceof Error ? cause.message : "El motivo no es válido"
      );
    }

    const medium =
      input.medium === "transfer" ||
      input.medium === "card" ||
      input.medium === "other"
        ? input.medium
        : "cash";
    const workOrderId = Number(input.workOrderId);
    const vals: Record<string, unknown> = {
      session_id: session.id,
      kind,
      amount,
      reason,
      medium,
    };
    if (Number.isFinite(workOrderId) && workOrderId > 0) {
      vals.work_order_id = workOrderId;
    }

    try {
      const id = await this.#callKw<number>(
        odooSessionId,
        "sg.cash.movement",
        "create",
        [vals]
      );
      const fresh = await this.getOpenCashSession(odooSessionId);
      return {
        id: Number(id),
        session: fresh || session,
      };
    } catch (cause) {
      if (cause instanceof BffError) throw cause;
      throw new BffError(
        "action_failed",
        503,
        "No se pudo registrar el movimiento"
      );
    }
  }

    async collectWorkOrderCash(
    odooSessionId: string,
    listKey: string,
    id: number,
    input: { amount: number; paymentMethod: string }
  ): Promise<CashMoveResult> {
    if (!canCollectWorkOrderCash(listKey)) {
      throw new BffError("not_found", 404, "Cobro no permitido");
    }
    const workOrderId = Number(id);
    if (!Number.isFinite(workOrderId) || workOrderId <= 0) {
      throw new BffError("validation_error", 400, "OT inválida");
    }
    const medium = normalizeWorkOrderCashMedium(input.paymentMethod);
    if (!medium) {
      throw new BffError("validation_error", 400, "Elegí un medio de pago");
    }
    const amount = Number(input.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BffError(
        "validation_error",
        400,
        "El monto debe ser mayor a cero"
      );
    }

    // Pre-check open session so the error is clear before Odoo.
    await this.requireOpenCashSession(odooSessionId);

    try {
      const moveId = await this.#callKw<number>(
        odooSessionId,
        "sg.work.order",
        "action_collect_cash",
        [[workOrderId], amount, medium, false]
      );
      const session = await this.getOpenCashSession(odooSessionId);
      if (!session) {
        throw new BffError(
          "action_failed",
          503,
          "No se pudo leer la caja abierta tras el cobro"
        );
      }
      return { id: Number(moveId), session };
    } catch (cause) {
      if (cause instanceof BffError) {
        const msg = cause.message || "";
        if (
          /saldo pendiente|ya tiene el cobro|monto debe ser mayor/i.test(msg)
        ) {
          throw new BffError(
            "validation_error",
            409,
            msg.replace(/^Odoo devolvió un error JSON-RPC:\s*/i, "")
          );
        }
        if (/caja abierta/i.test(msg)) {
          throw new BffError(
            "validation_error",
            400,
            "No hay una caja abierta. Abrí la caja antes de cobrar."
          );
        }
        throw cause;
      }
      throw new BffError(
        "action_failed",
        503,
        "No se pudo registrar el cobro de la OT"
      );
    }
  }

  async closeCashSession(
    odooSessionId: string,
    input: {
      countedAmount: number;
      bankDeposit?: number;
      leaveFloat?: number;
      differenceNote?: string;
    }
  ): Promise<CashCloseResult> {
    const session = await this.requireOpenCashSession(odooSessionId);
    const countedAmount = Number(input.countedAmount);
    const bankDeposit = Number(input.bankDeposit ?? 0);
    const leaveFloat = Number(
      input.leaveFloat ?? countedAmount - bankDeposit
    );
    const feed = await this.#buildCashFeed(odooSessionId, session);
    const summary = summarizeCash(session.openingBalance, feed);
    const validation = validateCashClose({
      countedAmount,
      expectedCash: summary.expectedCash,
      bankDeposit,
      leaveFloat,
      differenceNote: input.differenceNote,
    });
    if (!validation.ok) {
      throw new BffError("validation_error", 400, validation.error);
    }

    try {
      await this.#callKw(
        odooSessionId,
        "sg.cash.session",
        "action_close_session",
        [
          [session.id],
          countedAmount,
          summary.expectedCash,
          String(input.differenceNote || "").trim() || false,
          bankDeposit,
          leaveFloat,
        ]
      );
      const rows = await this.#searchRead(
        odooSessionId,
        "sg.cash.session",
        [["id", "=", session.id]],
        OdooAdapter.#CASH_SESSION_FIELDS,
        1,
        0,
        "id desc"
      );
      if (!rows[0]) {
        throw new BffError(
          "action_failed",
          503,
          "No se pudo cerrar la caja"
        );
      }
      return { session: this.#mapCashSession(rows[0]) };
    } catch (cause) {
      if (cause instanceof BffError) throw cause;
      throw new BffError(
        "action_failed",
        503,
        "No se pudo cerrar la caja"
      );
    }
  }

  async #getCashCapabilities(
    odooSessionId: string
  ): Promise<{ canOwnerWithdraw: boolean }> {
    let uid = 0;
    try {
      const response = await this.#post(
        "/web/session/get_session_info",
        { jsonrpc: "2.0", params: {} },
        odooSessionId
      );
      const payload = (await response.json()) as JsonRpcResponse<{
        uid?: number | false;
      }>;
      uid = Number(payload.result?.uid) || 0;
    } catch {
      return { canOwnerWithdraw: false };
    }
    if (!uid) return { canOwnerWithdraw: false };

    const groups: string[] = [];
    for (const xmlId of [
      "account.group_account_manager",
      "base.group_system",
    ]) {
      try {
        const has = await this.#callKw<boolean>(
          odooSessionId,
          "res.users",
          "has_group",
          [[uid], xmlId]
        );
        if (has) groups.push(xmlId);
      } catch {
        // ignore missing group lookups
      }
    }
    return { canOwnerWithdraw: canOwnerWithdraw(groups) };
  }

  #mapCashSession(row: Record<string, unknown>): CashSessionInfo {
    const openedBy = Array.isArray(row.opened_by) ? row.opened_by : [];
    const closedBy = Array.isArray(row.closed_by) ? row.closed_by : [];
    const shiftRaw = row.shift ? String(row.shift) : "";
    const shift = resolveCashShift(shiftRaw);
    return {
      id: Number(row.id),
      state: row.state === "closed" ? "closed" : "open",
      shift: (shift as CashShift | null) || null,
      openedAt: this.#odooDateToIso(row.opened_at),
      openedByName: openedBy[1] != null ? String(openedBy[1]) : null,
      openingBalance: Number(row.opening_balance) || 0,
      note: row.note ? String(row.note) : null,
      closedAt: row.closed_at ? this.#odooDateToIso(row.closed_at) : null,
      closedByName: closedBy[1] != null ? String(closedBy[1]) : null,
      closingCounted:
        row.closing_counted == null || row.closing_counted === false
          ? null
          : Number(row.closing_counted),
      closingExpected:
        row.closing_expected == null || row.closing_expected === false
          ? null
          : Number(row.closing_expected),
      difference:
        row.difference == null || row.difference === false
          ? null
          : Number(row.difference),
      differenceNote: row.difference_note
        ? String(row.difference_note)
        : null,
      bankDeposit:
        row.bank_deposit == null || row.bank_deposit === false
          ? null
          : Number(row.bank_deposit),
      leaveFloat:
        row.leave_float == null || row.leave_float === false
          ? null
          : Number(row.leave_float),
    };
  }

  #odooDateToIso(value: unknown): string {
    if (value instanceof Date) return value.toISOString();
    const raw = String(value || "").trim();
    if (!raw) return new Date(0).toISOString();
    if (raw.includes("T")) {
      const parsed = new Date(raw);
      return Number.isNaN(parsed.getTime()) ? raw : parsed.toISOString();
    }
    const parsed = new Date(raw.replace(" ", "T") + "Z");
    return Number.isNaN(parsed.getTime())
      ? raw
      : parsed.toISOString();
  }

  #odooDateForDomain(isoOrOdoo: string): string {
    const iso = this.#odooDateToIso(isoOrOdoo);
    return iso.replace("T", " ").replace(/\.\d{3}Z$/, "").replace(/Z$/, "");
  }

  async #buildCashFeed(
    odooSessionId: string,
    session: CashSessionInfo
  ): Promise<CashFeedItemDto[]> {
    const from = this.#odooDateForDomain(session.openedAt);
    const to = this.#odooDateForDomain(
      session.closedAt || new Date().toISOString()
    );
    const items: CashFeedItem[] = [];

    const manuals = await this.#searchRead(
      odooSessionId,
      "sg.cash.movement",
      [["session_id", "=", session.id]],
      ["kind", "amount", "reason", "create_date", "medium", "work_order_id"],
      200,
      0,
      "create_date desc, id desc"
    );
    for (const row of manuals) {
      const kind = row.kind === "out" ? "manual_out" : "manual_in";
      const mediumRaw = String(row.medium || "cash").toLowerCase();
      const medium =
        mediumRaw === "transfer" ||
        mediumRaw === "card" ||
        mediumRaw === "other"
          ? mediumRaw
          : "cash";
      const wo = Array.isArray(row.work_order_id) ? row.work_order_id : null;
      const workOrderId = wo ? Number(wo[0]) || 0 : Number(row.work_order_id) || 0;
      const woName = wo && wo[1] != null ? String(wo[1]) : "";
      const href = workOrderCashFeedHref(workOrderId);
      const reasonText = String(
        row.reason || (kind === "manual_out" ? "Egreso" : "Ingreso")
      );
      let label = reasonText;
      if (href) {
        const fromReason =
          reasonText.includes(" · ")
            ? reasonText.split(" · ").slice(1).join(" · ")
            : "";
        label = workOrderCashFeedLabel(woName || fromReason || "OT");
      }
      items.push({
        id: `manual-${row.id}`,
        at: this.#odooDateToIso(row.create_date),
        kind,
        medium,
        amount: Math.abs(Number(row.amount) || 0),
        label,
        reference: woName || null,
        href,
      });
    }

    const posPayments = await this.#searchRead(
      odooSessionId,
      "pos.payment",
      [
        ["payment_date", ">=", from],
        ["payment_date", "<=", to],
      ],
      ["amount", "payment_date", "payment_method_id", "pos_order_id"],
      200,
      0,
      "payment_date desc, id desc"
    );
    const methodIds = [
      ...new Set(
        posPayments
          .map((row) => {
            const pm = Array.isArray(row.payment_method_id)
              ? Number(row.payment_method_id[0])
              : Number(row.payment_method_id);
            return pm;
          })
          .filter((id) => id > 0)
      ),
    ];
    const methodById = new Map<number, { name: string; isCash: boolean }>();
    if (methodIds.length) {
      const methods = await this.#searchRead(
        odooSessionId,
        "pos.payment.method",
        [["id", "in", methodIds]],
        ["name", "is_cash_count"],
        methodIds.length,
        0,
        "id asc"
      );
      for (const method of methods) {
        methodById.set(Number(method.id), {
          name: String(method.name || "Pago"),
          isCash: method.is_cash_count === true,
        });
      }
    }
    for (const row of posPayments) {
      const pm = Array.isArray(row.payment_method_id)
        ? row.payment_method_id
        : [];
      const methodId = Number(pm[0]) || 0;
      const method = methodById.get(methodId);
      const methodName = method?.name || (pm[1] != null ? String(pm[1]) : "Pago");
      const order = Array.isArray(row.pos_order_id) ? row.pos_order_id : [];
      const orderId = Number(order[0]) || 0;
      const orderName = order[1] != null ? String(order[1]) : "Venta POS";
      items.push({
        id: `pos-${row.id}`,
        at: this.#odooDateToIso(row.payment_date),
        kind: "pos_sale",
        medium: classifyPosPaymentMedium(Boolean(method?.isCash), methodName),
        amount: Math.abs(Number(row.amount) || 0),
        label: `Mostrador · ${localizePaymentMethodName(methodName)}`,
        reference: orderName,
        href: orderId > 0 ? `/lists/sales/ventas-caja/${orderId}` : null,
      });
    }

    // create_date (datetime), not accounting `date` (day): day-only leaks
    // earlier cobros into a later caja abierta el mismo día.
    const payments = await this.#searchRead(
      odooSessionId,
      "account.payment",
      [
        ["state", "=", "paid"],
        ["create_date", ">=", from],
        ["create_date", "<=", to],
      ],
      [
        "amount",
        "date",
        "payment_type",
        "journal_id",
        "partner_id",
        "name",
        "create_date",
      ],
      200,
      0,
      "create_date desc, id desc"
    );
    const sessionFromMs = Date.parse(this.#odooDateToIso(session.openedAt));
    const sessionToMs = Date.parse(
      this.#odooDateToIso(session.closedAt || new Date().toISOString())
    );
    for (const row of payments) {
      const at = this.#odooDateToIso(row.create_date || row.date);
      const atMs = Date.parse(at);
      if (
        Number.isFinite(sessionFromMs) &&
        Number.isFinite(atMs) &&
        (atMs < sessionFromMs ||
          (Number.isFinite(sessionToMs) && atMs > sessionToMs))
      ) {
        continue;
      }
      const journal = Array.isArray(row.journal_id) ? row.journal_id : [];
      const journalName = journal[1] != null ? String(journal[1]) : "";
      const partner = Array.isArray(row.partner_id) ? row.partner_id : [];
      const partnerName = partner[1] != null ? String(partner[1]) : "";
      const inbound = String(row.payment_type || "") === "inbound";
      items.push({
        id: `pay-${row.id}`,
        at,
        kind: inbound ? "payment_in" : "payment_out",
        medium: classifyJournalMedium(
          // journal type not in row; classify by name (cash/caja/banco/tarjeta)
          /caja|efectivo|cash/i.test(journalName) ? "cash" : "bank",
          journalName
        ),
        amount: Math.abs(Number(row.amount) || 0),
        label: inbound
          ? `Cobro${partnerName ? ` · ${partnerName}` : ""}`
          : `Pago${partnerName ? ` · ${partnerName}` : ""}`,
        reference: row.name ? String(row.name) : null,
        href: Number(row.id) > 0 ? `/lists/accounting/payments/${row.id}` : null,
      });
    }

    return mergeCashFeed(items) as CashFeedItemDto[];
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
      "product_tmpl_id",
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
          product_tmpl_id: this.#partnerIdFromM2o(row.product_tmpl_id),
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
      await this.requireOpenCashSession(odooSessionId);
      return await this.#checkoutPosOrder(
        odooSessionId,
        clean,
        options.paymentMethodId,
        options.partnerId
      );
    } catch (cause) {
      if (cause instanceof BffError && cause.code === "unauthorized") throw cause;
      if (cause instanceof BffError && cause.code === "validation_error") {
        throw cause;
      }
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
    let paidTotal = roundCents(
      Number(createdOrder?.amount_total) || amountTotal
    );
    let paidTax = roundCents(
      Number(createdOrder?.amount_tax) || amountTax
    );

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

    // Con varias líneas Odoo puede recalcular IVA al escribir el pago
    // (p.ej. 2363.21 → 2363.22) y action_pos_order_paid falla por 1 centavo.
    const [afterPay] = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      "pos.order",
      "read",
      [[orderId], ["amount_total", "amount_tax", "amount_paid"]]
    );
    const recomputedTotal = roundCents(
      Number(afterPay?.amount_total) || paidTotal
    );
    const currentPaid = roundCents(
      Number(afterPay?.amount_paid) || paidTotal
    );
    if (Math.abs(recomputedTotal - currentPaid) > 0.005) {
      const payments = await this.#searchRead(
        odooSessionId,
        "pos.payment",
        [["pos_order_id", "=", orderId]],
        ["amount"],
        5,
        0,
        "id desc"
      );
      const paymentId = Number(payments[0]?.id);
      if (paymentId > 0) {
        await this.#callKw(odooSessionId, "pos.payment", "write", [
          [paymentId],
          { amount: recomputedTotal },
        ]);
      }
      await this.#callKw(odooSessionId, "pos.order", "write", [
        [orderId],
        {
          amount_paid: recomputedTotal,
          amount_return: 0,
        },
      ]);
      paidTotal = recomputedTotal;
      paidTax = roundCents(Number(afterPay?.amount_tax) || paidTax);
    }

    const paidUntaxed = roundCents(paidTotal - paidTax);

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
          // Thumb for lines that reference a product variant (POS, SO, PO, FC, stock).
          if (lineDef.fields.includes("product_id")) {
            const productId = this.#partnerIdFromM2o(row.product_id);
            if (productId > 0) {
              out.product_image =
                mediaPath("product.product", productId, "image_128") || null;
              out.product_variant_id = productId;
            }
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

  async #resolvePaymentJournalId(
    odooSessionId: string,
    method: PaymentMethodCode
  ): Promise<number | null> {
    const journals = await this.#searchRead(
      odooSessionId,
      "account.journal",
      [["type", "in", ["cash", "bank"]]],
      ["id", "name", "type"],
      50,
      0,
      "sequence asc, id asc"
    );
    const normalized = journals
      .map((row) => ({
        id: Number(row.id),
        name: row.name == null ? "" : String(row.name),
        type: row.type == null ? "" : String(row.type),
      }))
      .filter((row) => Number.isFinite(row.id) && row.id > 0);
    return pickJournalId(method, normalized);
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

  async fetchInvoicePdf(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<{ body: ArrayBuffer; contentType: string; filename: string }> {
    if (!canFetchInvoicePdf(listKey) || !Number.isFinite(id) || id <= 0) {
      throw new BffError("not_found", 404, "PDF no permitido");
    }

    let title: string | null = null;
    try {
      const [row] = await this.#callKw<Record<string, unknown>[]>(
        odooSessionId,
        "account.move",
        "read",
        [[id], ["name", "display_name"]]
      );
      if (!row) {
        throw new BffError("not_found", 404, "Comprobante no encontrado");
      }
      title = String(row.display_name || row.name || "") || null;
    } catch (cause) {
      if (cause instanceof BffError) throw cause;
      this.#mapFetchFailure(cause);
    }

    try {
      const response = await this.#fetch(
        `${this.#baseUrl}/report/pdf/${INVOICE_PDF_REPORT}/${id}`,
        {
          headers: { cookie: `session_id=${odooSessionId}` },
          signal: this.#abortSignal(),
        }
      );
      if (!response.ok) {
        // Odoo returns 422 when wkhtmltopdf is missing (get_wkhtmltopdf_state=install).
        if (response.status === 422) {
          throw new BffError(
            "action_failed",
            503,
            "Odoo no puede generar PDF: falta wkhtmltopdf en el servidor"
          );
        }
        throw new BffError(
          "action_failed",
          503,
          "No se pudo generar el PDF del comprobante"
        );
      }
      const contentType =
        response.headers.get("content-type") || "application/pdf";
      const body = await response.arrayBuffer();
      // Odoo may return an HTML login/error page with 200 — reject non-PDF.
      const head = new Uint8Array(body.slice(0, 5));
      const isPdf =
        head.length >= 5 &&
        head[0] === 0x25 &&
        head[1] === 0x50 &&
        head[2] === 0x44 &&
        head[3] === 0x46 &&
        head[4] === 0x2d; // %PDF-
      if (!isPdf) {
        throw new BffError(
          "action_failed",
          503,
          "Odoo no devolvió un PDF válido"
        );
      }
      return {
        body,
        contentType: contentType.includes("pdf")
          ? contentType
          : "application/pdf",
        filename: invoicePdfFilename(title, id),
      };
    } catch (cause) {
      this.#mapFetchFailure(cause);
    }
  }

  async fetchPurchaseOrderPdf(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<{ body: ArrayBuffer; contentType: string; filename: string }> {
    if (!canFetchPurchaseOrderPdf(listKey) || !Number.isFinite(id) || id <= 0) {
      throw new BffError("not_found", 404, "PDF no permitido");
    }

    let title: string | null = null;
    try {
      const [row] = await this.#callKw<Record<string, unknown>[]>(
        odooSessionId,
        "purchase.order",
        "read",
        [[id], ["name", "display_name"]]
      );
      if (!row) {
        throw new BffError("not_found", 404, "Orden de compra no encontrada");
      }
      title = String(row.display_name || row.name || "") || null;
    } catch (cause) {
      if (cause instanceof BffError) throw cause;
      this.#mapFetchFailure(cause);
    }

    try {
      const response = await this.#fetch(
        `${this.#baseUrl}/report/pdf/${PURCHASE_ORDER_PDF_REPORT}/${id}`,
        {
          headers: { cookie: `session_id=${odooSessionId}` },
          signal: this.#abortSignal(),
        }
      );
      if (!response.ok) {
        if (response.status === 422) {
          throw new BffError(
            "action_failed",
            503,
            "Odoo no puede generar PDF: falta wkhtmltopdf en el servidor"
          );
        }
        throw new BffError(
          "action_failed",
          503,
          "No se pudo generar el PDF de la orden de compra"
        );
      }
      const contentType =
        response.headers.get("content-type") || "application/pdf";
      const body = await response.arrayBuffer();
      const head = new Uint8Array(body.slice(0, 5));
      const isPdf =
        head.length >= 5 &&
        head[0] === 0x25 &&
        head[1] === 0x50 &&
        head[2] === 0x44 &&
        head[3] === 0x46 &&
        head[4] === 0x2d;
      if (!isPdf) {
        throw new BffError(
          "action_failed",
          503,
          "Odoo no devolvió un PDF válido"
        );
      }
      return {
        body,
        contentType: contentType.includes("pdf")
          ? contentType
          : "application/pdf",
        filename: purchaseOrderPdfFilename(title, id),
      };
    } catch (cause) {
      this.#mapFetchFailure(cause);
    }
  }

  async getPurchaseOrderShareMeta(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<PurchaseOrderShareMeta> {
    if (!canFetchPurchaseOrderPdf(listKey) || !Number.isFinite(id) || id <= 0) {
      throw new BffError("not_found", 404, "Orden no encontrada");
    }

    const [order] = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      "purchase.order",
      "read",
      [[id], ["name", "partner_id"]]
    );
    if (!order) {
      throw new BffError("not_found", 404, "Orden de compra no encontrada");
    }

    const partnerId = this.#partnerIdFromM2o(order.partner_id);
    const orderName = String(order.name || `OC-${id}`);
    let partnerName = this.#cellValue(order.partner_id);
    partnerName =
      typeof partnerName === "string" && partnerName
        ? partnerName
        : "Proveedor";

    let email: string | null = null;
    let phone: string | null = null;
    if (partnerId > 0) {
      const [partner] = await this.#callKw<Record<string, unknown>[]>(
        odooSessionId,
        "res.partner",
        "read",
        [[partnerId], ["name", "email", "phone"]]
      );
      if (partner) {
        partnerName = String(partner.name || partnerName);
        const rawEmail = partner.email;
        email =
          typeof rawEmail === "string" && rawEmail.trim()
            ? rawEmail.trim()
            : null;
        const rawPhone = typeof partner.phone === "string" ? partner.phone : "";
        phone = normalizeWhatsappPhone(rawPhone);
      }
    }

    const message = purchaseOrderWhatsappMessage(orderName, partnerName);
    return {
      orderName,
      partnerName,
      email,
      phone,
      whatsappUrl: purchaseOrderWhatsappUrl(phone, message),
      pdfPath: purchaseOrderPdfPath(listKey, id),
      missingContactHint: missingVendorContactHint({ phone, email }),
    };
  }

  async getPurchaseOrderReceipts(
    odooSessionId: string,
    orderId: number
  ): Promise<PurchaseOrderReceiptsPayload> {
    if (!Number.isFinite(orderId) || orderId <= 0) {
      throw new BffError("not_found", 404, "Orden de compra no encontrada");
    }

    const [order] = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      "purchase.order",
      "read",
      [[orderId], ["name", "receipt_status", "picking_ids"]]
    );
    if (!order) {
      throw new BffError("not_found", 404, "Orden de compra no encontrada");
    }

    const orderName = String(order.name || `OC-${orderId}`);
    const receiptStatusRaw = order.receipt_status;
    const receiptStatus =
      typeof receiptStatusRaw === "string" && receiptStatusRaw
        ? receiptStatusRaw
        : null;
    const pickingIds = this.#idsFromM2m(order.picking_ids);
    if (pickingIds.length === 0) {
      return {
        orderId,
        orderName,
        receiptStatus,
        receiptStatusLabel: receiptStatusLabel(receiptStatus),
        pickings: [],
      };
    }

    const rows = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      "stock.picking",
      "read",
      [
        pickingIds,
        [
          "name",
          "partner_id",
          "origin",
          "state",
          "scheduled_date",
          "picking_type_code",
        ],
      ]
    );

    const pickings = rows
      .map((row) => {
        const id = Number(row.id);
        if (!Number.isFinite(id) || id <= 0) return null;
        const partner = this.#cellValue(row.partner_id);
        const origin = this.#cellValue(row.origin);
        const scheduled = this.#cellValue(row.scheduled_date);
        return mapPurchaseOrderReceiptRow({
          id,
          name: String(row.name || `WH/${id}`),
          partnerName:
            typeof partner === "string" && partner ? partner : "Proveedor",
          origin: typeof origin === "string" ? origin : null,
          state: String(row.state || ""),
          scheduledDate: typeof scheduled === "string" ? scheduled : null,
        });
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .sort((a, b) => {
        // Pending validations first, then by id desc
        if (a.canValidate !== b.canValidate) return a.canValidate ? -1 : 1;
        return b.id - a.id;
      });

    return {
      orderId,
      orderName,
      receiptStatus,
      receiptStatusLabel: receiptStatusLabel(receiptStatus),
      pickings,
    };
  }

  async sendPurchaseOrderEmail(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<{ ok: true; email: string; orderName: string }> {
    if (!canSendPurchaseOrderEmail(listKey) || !Number.isFinite(id) || id <= 0) {
      throw new BffError("not_found", 404, "Envío no permitido");
    }

    const [order] = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      "purchase.order",
      "read",
      [[id], ["name", "state", "partner_id"]]
    );
    if (!order) {
      throw new BffError("not_found", 404, "Orden de compra no encontrada");
    }

    const partnerId = this.#partnerIdFromM2o(order.partner_id);
    if (partnerId <= 0) {
      throw new BffError(
        "validation_error",
        400,
        "Cargá el mail del proveedor"
      );
    }

    const [partner] = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      "res.partner",
      "read",
      [[partnerId], ["email", "name"]]
    );
    const email =
      typeof partner?.email === "string" && partner.email.trim()
        ? partner.email.trim()
        : null;
    if (!email) {
      throw new BffError(
        "validation_error",
        400,
        "Cargá el mail del proveedor"
      );
    }

    const templateId = await this.#resolveXmlId(
      odooSessionId,
      PURCHASE_ORDER_EMAIL_TEMPLATE
    );
    if (!Number.isFinite(templateId) || templateId <= 0) {
      throw new BffError(
        "action_failed",
        503,
        "No se encontró la plantilla de correo de compra"
      );
    }

    await this.#callKw(odooSessionId, "mail.template", "send_mail", [
      templateId,
      id,
    ], { force_send: true });

    return {
      ok: true,
      email,
      orderName: String(order.name || `OC-${id}`),
    };
  }

  async fetchSaleOrderPdf(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<{ body: ArrayBuffer; contentType: string; filename: string }> {
    if (!canFetchSaleOrderPdf(listKey) || !Number.isFinite(id) || id <= 0) {
      throw new BffError("not_found", 404, "PDF no permitido");
    }

    let title: string | null = null;
    try {
      const [row] = await this.#callKw<Record<string, unknown>[]>(
        odooSessionId,
        "sale.order",
        "read",
        [[id], ["name", "display_name"]]
      );
      if (!row) {
        throw new BffError("not_found", 404, "Pedido no encontrado");
      }
      title = String(row.display_name || row.name || "") || null;
    } catch (cause) {
      if (cause instanceof BffError) throw cause;
      this.#mapFetchFailure(cause);
    }

    try {
      const response = await this.#fetch(
        `${this.#baseUrl}/report/pdf/${SALE_ORDER_PDF_REPORT}/${id}`,
        {
          headers: { cookie: `session_id=${odooSessionId}` },
          signal: this.#abortSignal(),
        }
      );
      if (!response.ok) {
        if (response.status === 422) {
          throw new BffError(
            "action_failed",
            503,
            "Odoo no puede generar PDF: falta wkhtmltopdf en el servidor"
          );
        }
        throw new BffError(
          "action_failed",
          503,
          "No se pudo generar el PDF del pedido"
        );
      }
      const contentType =
        response.headers.get("content-type") || "application/pdf";
      const body = await response.arrayBuffer();
      const head = new Uint8Array(body.slice(0, 5));
      const isPdf =
        head.length >= 5 &&
        head[0] === 0x25 &&
        head[1] === 0x50 &&
        head[2] === 0x44 &&
        head[3] === 0x46 &&
        head[4] === 0x2d;
      if (!isPdf) {
        throw new BffError(
          "action_failed",
          503,
          "Odoo no devolvió un PDF válido"
        );
      }
      return {
        body,
        contentType: contentType.includes("pdf")
          ? contentType
          : "application/pdf",
        filename: saleOrderPdfFilename(title, id),
      };
    } catch (cause) {
      this.#mapFetchFailure(cause);
    }
  }

  async getSaleOrderShareMeta(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<SaleOrderShareMeta> {
    if (!canFetchSaleOrderPdf(listKey) || !Number.isFinite(id) || id <= 0) {
      throw new BffError("not_found", 404, "Pedido no encontrado");
    }

    const [order] = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      "sale.order",
      "read",
      [[id], ["name", "partner_id"]]
    );
    if (!order) {
      throw new BffError("not_found", 404, "Pedido no encontrado");
    }

    const partnerId = this.#partnerIdFromM2o(order.partner_id);
    const orderName = String(order.name || `S-${id}`);
    let partnerName = this.#cellValue(order.partner_id);
    partnerName =
      typeof partnerName === "string" && partnerName ? partnerName : "Cliente";

    let email: string | null = null;
    let phone: string | null = null;
    if (partnerId > 0) {
      const [partner] = await this.#callKw<Record<string, unknown>[]>(
        odooSessionId,
        "res.partner",
        "read",
        [[partnerId], ["name", "email", "phone"]]
      );
      if (partner) {
        partnerName = String(partner.name || partnerName);
        const rawEmail = partner.email;
        email =
          typeof rawEmail === "string" && rawEmail.trim()
            ? rawEmail.trim()
            : null;
        const rawPhone = typeof partner.phone === "string" ? partner.phone : "";
        phone = normalizeSaleWhatsappPhone(rawPhone);
      }
    }

    const message = saleOrderWhatsappMessage(orderName, partnerName, listKey);
    return {
      orderName,
      partnerName,
      email,
      phone,
      whatsappUrl: saleOrderWhatsappUrl(phone, message),
      pdfPath: saleOrderPdfPath(listKey, id),
      missingContactHint: missingCustomerContactHint({ phone, email }),
      documentLabel: saleOrderDocumentLabel(listKey),
    };
  }

  async sendSaleOrderEmail(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<{
    ok: true;
    email: string;
    orderName: string;
    markedSent: boolean;
  }> {
    if (!canSendSaleOrderEmail(listKey) || !Number.isFinite(id) || id <= 0) {
      throw new BffError("not_found", 404, "Envío no permitido");
    }

    const [order] = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      "sale.order",
      "read",
      [[id], ["name", "state", "partner_id"]]
    );
    if (!order) {
      throw new BffError("not_found", 404, "Pedido no encontrado");
    }

    const partnerId = this.#partnerIdFromM2o(order.partner_id);
    if (partnerId <= 0) {
      throw new BffError(
        "validation_error",
        400,
        "Cargá el mail del cliente"
      );
    }

    const [partner] = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      "res.partner",
      "read",
      [[partnerId], ["email", "name"]]
    );
    const email =
      typeof partner?.email === "string" && partner.email.trim()
        ? partner.email.trim()
        : null;
    if (!email) {
      throw new BffError(
        "validation_error",
        400,
        "Cargá el mail del cliente"
      );
    }

    const templateId = await this.#resolveXmlId(
      odooSessionId,
      SALE_ORDER_EMAIL_TEMPLATE
    );
    if (!Number.isFinite(templateId) || templateId <= 0) {
      throw new BffError(
        "action_failed",
        503,
        "No se encontró la plantilla de correo de venta"
      );
    }

    await this.#callKw(
      odooSessionId,
      "mail.template",
      "send_mail",
      [templateId, id],
      { force_send: true }
    );

    let markedSent = false;
    if (shouldMarkQuotationSentAfterEmail(order.state as string)) {
      await this.#callKw(
        odooSessionId,
        "sale.order",
        "action_quotation_sent",
        [[id]]
      );
      markedSent = true;
    }

    return {
      ok: true,
      email,
      orderName: String(order.name || `S-${id}`),
      markedSent,
    };
  }

  async fetchWorkshopOrderPdf(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<{ body: ArrayBuffer; contentType: string; filename: string }> {
    if (
      !canFetchWorkshopOrderPdf(listKey) ||
      !Number.isFinite(id) ||
      id <= 0
    ) {
      throw new BffError("not_found", 404, "PDF no permitido");
    }

    let title: string | null = null;
    try {
      const [row] = await this.#callKw<Record<string, unknown>[]>(
        odooSessionId,
        "sg.work.order",
        "read",
        [[id], ["name", "display_name"]]
      );
      if (!row) {
        throw new BffError("not_found", 404, "OT no encontrada");
      }
      title = String(row.display_name || row.name || "") || null;
    } catch (cause) {
      if (cause instanceof BffError) throw cause;
      this.#mapFetchFailure(cause);
    }

    try {
      const response = await this.#fetch(
        `${this.#baseUrl}/report/pdf/${WORKSHOP_ORDER_PDF_REPORT}/${id}`,
        {
          headers: { cookie: `session_id=${odooSessionId}` },
          signal: this.#abortSignal(),
        }
      );
      if (!response.ok) {
        if (response.status === 422) {
          throw new BffError(
            "action_failed",
            503,
            "Odoo no puede generar PDF: falta wkhtmltopdf en el servidor"
          );
        }
        throw new BffError(
          "action_failed",
          503,
          "No se pudo generar el PDF de la OT"
        );
      }
      const contentType =
        response.headers.get("content-type") || "application/pdf";
      const body = await response.arrayBuffer();
      const head = new Uint8Array(body.slice(0, 5));
      const isPdf =
        head.length >= 5 &&
        head[0] === 0x25 &&
        head[1] === 0x50 &&
        head[2] === 0x44 &&
        head[3] === 0x46 &&
        head[4] === 0x2d;
      if (!isPdf) {
        throw new BffError(
          "action_failed",
          503,
          "Odoo no devolvió un PDF válido"
        );
      }
      return {
        body,
        contentType: contentType.includes("pdf")
          ? contentType
          : "application/pdf",
        filename: workshopOrderPdfFilename(title, id),
      };
    } catch (cause) {
      this.#mapFetchFailure(cause);
    }
  }

  async getWorkshopOrderShareMeta(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<WorkshopOrderShareMeta> {
    if (
      !canFetchWorkshopOrderPdf(listKey) ||
      !Number.isFinite(id) ||
      id <= 0
    ) {
      throw new BffError("not_found", 404, "OT no encontrada");
    }

    const [order] = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      "sg.work.order",
      "read",
      [[id], ["name", "partner_id", "owner_name", "owner_phone"]]
    );
    if (!order) {
      throw new BffError("not_found", 404, "OT no encontrada");
    }

    const partnerId = this.#partnerIdFromM2o(order.partner_id);
    let partnerName = this.#cellValue(order.partner_id);
    partnerName =
      typeof partnerName === "string" && partnerName ? partnerName : null;
    let partnerEmail: string | null = null;
    let partnerPhone: string | null = null;
    if (partnerId > 0) {
      const [partner] = await this.#callKw<Record<string, unknown>[]>(
        odooSessionId,
        "res.partner",
        "read",
        [[partnerId], ["name", "email", "phone"]]
      );
      if (partner) {
        partnerName =
          typeof partner.name === "string" ? partner.name : partnerName;
        partnerEmail =
          typeof partner.email === "string" ? partner.email : null;
        partnerPhone =
          typeof partner.phone === "string" ? partner.phone : null;
      }
    }

    const orderName = String(order.name || `OT-${id}`);
    const contacts = resolveWorkshopShareContacts({
      partnerName,
      partnerEmail,
      partnerPhone,
      partnerMobile: null,
      ownerName:
        typeof order.owner_name === "string" ? order.owner_name : null,
      ownerPhone:
        typeof order.owner_phone === "string" ? order.owner_phone : null,
    });
    const message = workshopOrderWhatsappMessage(
      orderName,
      contacts.displayName
    );
    return {
      orderName,
      ...contacts,
      whatsappUrl: workshopOrderWhatsappUrl(contacts.phone, message),
      pdfPath: workshopOrderPdfPath(listKey, id),
      missingContactHint: missingWorkshopContactHint(contacts),
    };
  }

  async sendWorkshopOrderEmail(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<{ ok: true; email: string; orderName: string }> {
    if (
      !canSendWorkshopOrderEmail(listKey) ||
      !Number.isFinite(id) ||
      id <= 0
    ) {
      throw new BffError("not_found", 404, "Envío no permitido");
    }

    const [order] = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      "sg.work.order",
      "read",
      [[id], ["name", "partner_id"]]
    );
    if (!order) {
      throw new BffError("not_found", 404, "OT no encontrada");
    }

    const partnerId = this.#partnerIdFromM2o(order.partner_id);
    if (partnerId <= 0) {
      throw new BffError(
        "validation_error",
        400,
        "Cargá el mail del cliente"
      );
    }
    const [partner] = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      "res.partner",
      "read",
      [[partnerId], ["email", "name"]]
    );
    const email =
      typeof partner?.email === "string" && partner.email.trim()
        ? partner.email.trim()
        : null;
    if (!email) {
      throw new BffError(
        "validation_error",
        400,
        "Cargá el mail del cliente"
      );
    }

    const templateId = await this.#resolveXmlId(
      odooSessionId,
      WORKSHOP_ORDER_EMAIL_TEMPLATE
    );
    if (!Number.isFinite(templateId) || templateId <= 0) {
      throw new BffError(
        "action_failed",
        503,
        "No se encontró la plantilla de correo de OT"
      );
    }
    await this.#callKw(
      odooSessionId,
      "mail.template",
      "send_mail",
      [templateId, id],
      { force_send: true }
    );

    return {
      ok: true,
      email,
      orderName: String(order.name || `OT-${id}`),
    };
  }

  async fetchAttachment(
    odooSessionId: string,
    attachmentId: number
  ): Promise<{
    body: ArrayBuffer;
    contentType: string;
    filename: string;
  }> {
    if (!Number.isFinite(attachmentId) || attachmentId <= 0) {
      throw new BffError("not_found", 404, "Adjunto no encontrado");
    }

    const [attachment] = await this.#callKw<Record<string, unknown>[]>(
      odooSessionId,
      "ir.attachment",
      "read",
      [[attachmentId], ["name", "mimetype", "res_model", "res_id"]]
    );
    if (!attachment) {
      throw new BffError("not_found", 404, "Adjunto no encontrado");
    }
    const resModel = String(attachment.res_model || "");
    const resId = Number(attachment.res_id);
    if (!Number.isFinite(resId) || resId <= 0) {
      throw new BffError("not_found", 404, "Adjunto no encontrado");
    }

    if (resModel === "account.move") {
      const [move] = await this.#callKw<Record<string, unknown>[]>(
        odooSessionId,
        "account.move",
        "read",
        [[resId], ["move_type"]]
      );
      if (!move || String(move.move_type) !== "in_invoice") {
        throw new BffError("not_found", 404, "Adjunto no encontrado");
      }
    } else if (resModel !== "sg.work.order") {
      throw new BffError("not_found", 404, "Adjunto no encontrado");
    }

    try {
      const response = await this.#fetch(
        `${this.#baseUrl}/web/content/${attachmentId}?download=true`,
        {
          headers: { cookie: `session_id=${odooSessionId}` },
          signal: this.#abortSignal(),
        }
      );
      if (!response.ok) {
        throw new BffError("not_found", 404, "Adjunto no encontrado");
      }
      return {
        body: await response.arrayBuffer(),
        contentType:
          response.headers.get("content-type") ||
          String(attachment.mimetype || "application/octet-stream"),
        filename: String(attachment.name || "comprobante"),
      };
    } catch (cause) {
      this.#mapFetchFailure(cause);
    }
  }

  async #loadRecordAttachments(
    odooSessionId: string,
    resModel: string,
    resId: number
  ): Promise<
    { id: number; name: string; mimetype: string; url: string }[]
  > {
    try {
      const rows = await this.#searchRead(
        odooSessionId,
        "ir.attachment",
        [
          ["res_model", "=", resModel],
          ["res_id", "=", resId],
        ],
        ["id", "name", "mimetype"],
        20,
        0,
        "id desc"
      );
      return rows
        .map((row) => {
          const id = Number(row.id);
          if (!Number.isFinite(id) || id <= 0) return null;
          return {
            id,
            name: String(row.name || "adjunto"),
            mimetype: String(row.mimetype || "application/octet-stream"),
            url: `/api/attachments/${id}`,
          };
        })
        .filter(
          (
            row
          ): row is {
            id: number;
            name: string;
            mimetype: string;
            url: string;
          } => Boolean(row)
        );
    } catch (cause) {
      if (cause instanceof BffError && cause.code === "unauthorized") {
        throw cause;
      }
      return [];
    }
  }

  async #loadMoveAttachments(
    odooSessionId: string,
    moveId: number
  ): Promise<
    { id: number; name: string; mimetype: string; url: string }[]
  > {
    return this.#loadRecordAttachments(odooSessionId, "account.move", moveId);
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

  /**
   * Odoo 19 no expone `xmlid_to_res_id` por call_kw; resolvemos vía ir.model.data.
   */
  async #resolveXmlId(
    odooSessionId: string,
    xmlid: string
  ): Promise<number> {
    const raw = String(xmlid || "").trim();
    const dot = raw.indexOf(".");
    if (dot <= 0 || dot === raw.length - 1) return 0;
    const module = raw.slice(0, dot);
    const name = raw.slice(dot + 1);
    const rows = await this.#searchRead(
      odooSessionId,
      "ir.model.data",
      [
        ["module", "=", module],
        ["name", "=", name],
      ],
      ["res_id"],
      1,
      0,
      "id asc"
    );
    return Number(rows[0]?.res_id) || 0;
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

    // Odoo 19 void methods (button_draft, button_cancel, …) omit `result`.
    if (!("result" in payload) || payload.result === undefined) {
      return null as T;
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

    if (error && typeof error === "object") {
      const data = (error as { data?: { message?: unknown } }).data;
      const userMessage =
        data && typeof data.message === "string" ? data.message.trim() : "";
      if (userMessage) return userMessage;
      const top =
        typeof (error as { message?: unknown }).message === "string"
          ? String((error as { message: string }).message).trim()
          : "";
      if (top) return top;
    }

    try {
      return JSON.stringify(error) ?? "";
    } catch {
      return "";
    }
  }
}

function stripBase64Payload(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "";
  const dataMatch = trimmed.match(/^data:[^;]+;base64,([a-z0-9+/=\s]+)$/i);
  const raw = dataMatch ? dataMatch[1] : trimmed;
  return raw.replace(/\s+/g, "");
}
