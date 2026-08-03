import type {
  CashCloseResult,
  CashHubPayload,
  CashMoveResult,
  CashOpenResult,
  CashSessionDetailPayload,
  CashSessionInfo,
  HubPayload,
  LauncherPayload,
  PosCatalogPayload,
  PosCheckoutLine,
  PosCheckoutOptions,
  PosCheckoutResult,
  PriceListImportApplyLine,
  PriceListImportApplyResult,
  PriceListImportPreview,
  ProductPurgeByCategoryResult,
  VendorBillPdfPreview,
  RecordDetailPayload,
  RecordListPayload,
  RecordNote,
  SessionInfo,
} from "./types.ts";
import type { RecordListQuery } from "../shell/record-lists.ts";
import type { PriceListMapping } from "../shell/price-list-import.ts";

export interface BackendClient {
  login(
    login: string,
    password: string
  ): Promise<{ sessionId: string; session: SessionInfo }>;
  logout(odooSessionId: string): Promise<void>;
  validateSession(odooSessionId: string): Promise<void>;
  changePassword(
    odooSessionId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void>;
  updateLogin(
    odooSessionId: string,
    uid: number,
    login: string
  ): Promise<{ login: string }>;
  getLauncher(odooSessionId: string): Promise<LauncherPayload>;
  getHub(
    odooSessionId: string,
    app: string,
    section?: string
  ): Promise<HubPayload>;
  getRecordList(
    odooSessionId: string,
    listKey: string,
    query?: RecordListQuery
  ): Promise<RecordListPayload>;
  getRecordDetail(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<RecordDetailPayload>;
  updateRecord(
    odooSessionId: string,
    listKey: string,
    id: number,
    values: Record<string, unknown>
  ): Promise<void>;
  createRecord(
    odooSessionId: string,
    listKey: string,
    values: Record<string, unknown>
  ): Promise<{ id: number; detailPath: string }>;
  archiveRecord(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<void>;
  deleteRecord(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<void>;
  listRecordNotes(
    odooSessionId: string,
    listKey: string,
    recordId: number,
    viewerUid: number
  ): Promise<RecordNote[]>;
  createRecordNote(
    odooSessionId: string,
    listKey: string,
    recordId: number,
    body: string,
    viewerUid: number
  ): Promise<RecordNote>;
  updateRecordNote(
    odooSessionId: string,
    noteId: number,
    body: string,
    viewerUid: number
  ): Promise<RecordNote>;
  deleteRecordNote(
    odooSessionId: string,
    noteId: number,
    viewerUid: number
  ): Promise<void>;
  confirmRecord(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<{ ok: true; state: string | null }>;
  resetInvoiceDraft(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<{ ok: true; state: string | null }>;
  cancelInvoice(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<{ ok: true; state: string | null }>;
  createInvoiceFromOrder(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<{ ok: true; id: number; detailPath: string }>;
  createInvoiceFromPos(
    odooSessionId: string,
    listKey: string,
    id: number,
    options?: { partnerId?: number }
  ): Promise<{ ok: true; id: number; detailPath: string }>;
  registerPayment(
    odooSessionId: string,
    listKey: string,
    id: number,
    values?: Record<string, unknown>
  ): Promise<{ ok: true; paymentState: string | null; residual: number }>;
  markFwLoaded(
    odooSessionId: string,
    listKey: string,
    id: number,
    values?: Record<string, unknown>
  ): Promise<{ ok: true; sg_fw_loaded: true; sg_fw_number: string | null }>;
  updateInvoiceDraft(
    odooSessionId: string,
    listKey: string,
    id: number,
    values: Record<string, unknown>
  ): Promise<{ ok: true; id: number; detailPath: string }>;
  markFwLoadedBulk(
    odooSessionId: string,
    listKey: string,
    items: unknown
  ): Promise<{
    ok: true;
    marked: number;
    skipped: number;
    markedIds: number[];
  }>;
  exportFwPendingCsv(odooSessionId: string): Promise<{
    filename: string;
    csv: string;
    count: number;
  }>;
  getPosCatalog(
    odooSessionId: string,
    query?: { q?: string; limit?: number }
  ): Promise<PosCatalogPayload>;
  checkoutPosCart(
    odooSessionId: string,
    lines: PosCheckoutLine[],
    options?: PosCheckoutOptions
  ): Promise<PosCheckoutResult>;
  getCashHub(odooSessionId: string): Promise<CashHubPayload>;
  getCashHistory(
    odooSessionId: string,
    limit?: number
  ): Promise<CashSessionInfo[]>;
  getCashSessionDetail(
    odooSessionId: string,
    sessionId: number
  ): Promise<CashSessionDetailPayload>;
  getOpenCashSession(
    odooSessionId: string
  ): Promise<CashSessionInfo | null>;
  requireOpenCashSession(
    odooSessionId: string
  ): Promise<CashSessionInfo>;
  openCashSession(
    odooSessionId: string,
    input: { openingBalance: number; note?: string; shift?: string }
  ): Promise<CashOpenResult>;
  addCashMovement(
    odooSessionId: string,
    input: {
      kind: "in" | "out";
      amount: number;
      motiveCode: string;
      note?: string;
    }
  ): Promise<CashMoveResult>;
  closeCashSession(
    odooSessionId: string,
    input: {
      countedAmount: number;
      bankDeposit?: number;
      leaveFloat?: number;
      differenceNote?: string;
    }
  ): Promise<CashCloseResult>;
  fetchMedia(
    odooSessionId: string,
    model: string,
    id: number,
    field: string
  ): Promise<{ body: ArrayBuffer; contentType: string }>;
  fetchInvoicePdf(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<{ body: ArrayBuffer; contentType: string; filename: string }>;
  fetchPurchaseOrderPdf(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<{ body: ArrayBuffer; contentType: string; filename: string }>;
  getPurchaseOrderShareMeta(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<import("../shell/purchase-order-share.ts").PurchaseOrderShareMeta>;
  getPurchaseOrderReceipts(
    odooSessionId: string,
    orderId: number
  ): Promise<
    import("../shell/purchase-order-receipts.ts").PurchaseOrderReceiptsPayload
  >;
  fetchSaleOrderPdf(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<{ body: ArrayBuffer; contentType: string; filename: string }>;
  getSaleOrderShareMeta(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<import("../shell/sale-order-share.ts").SaleOrderShareMeta>;
  sendSaleOrderEmail(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<{
    ok: true;
    email: string;
    orderName: string;
    markedSent: boolean;
  }>;
  sendPurchaseOrderEmail(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<{ ok: true; email: string; orderName: string }>;
  fetchAttachment(
    odooSessionId: string,
    attachmentId: number
  ): Promise<{
    body: ArrayBuffer;
    contentType: string;
    filename: string;
  }>;
  previewPriceListImport(
    odooSessionId: string,
    input: {
      filename: string;
      content: string;
      mapping?: PriceListMapping;
    }
  ): Promise<PriceListImportPreview>;
  applyPriceListImport(
    odooSessionId: string,
    lines: PriceListImportApplyLine[]
  ): Promise<PriceListImportApplyResult>;
  countProductsInCategory(
    odooSessionId: string,
    categoryId: number
  ): Promise<number>;
  purgeProductsByCategory(
    odooSessionId: string,
    input: { categoryId: number; confirmName: string }
  ): Promise<ProductPurgeByCategoryResult>;
  previewVendorBillPdf(
    odooSessionId: string,
    input: { filename: string; content: string }
  ): Promise<VendorBillPdfPreview>;
}
