import type {
  HubPayload,
  LauncherPayload,
  PosCatalogPayload,
  PosCheckoutLine,
  PosCheckoutOptions,
  PosCheckoutResult,
  PriceListImportApplyLine,
  PriceListImportApplyResult,
  PriceListImportPreview,
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
  createInvoiceFromOrder(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<{ ok: true; id: number; detailPath: string }>;
  getPosCatalog(
    odooSessionId: string,
    query?: { q?: string; limit?: number }
  ): Promise<PosCatalogPayload>;
  checkoutPosCart(
    odooSessionId: string,
    lines: PosCheckoutLine[],
    options?: PosCheckoutOptions
  ): Promise<PosCheckoutResult>;
  fetchMedia(
    odooSessionId: string,
    model: string,
    id: number,
    field: string
  ): Promise<{ body: ArrayBuffer; contentType: string }>;
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
}
