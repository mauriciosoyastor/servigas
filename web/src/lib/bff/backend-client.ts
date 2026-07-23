import type {
  HubPayload,
  LauncherPayload,
  PosCatalogPayload,
  PosCheckoutLine,
  PosCheckoutOptions,
  PosCheckoutResult,
  RecordDetailPayload,
  RecordListPayload,
  SessionInfo,
} from "./types.ts";
import type { RecordListQuery } from "../shell/record-lists.ts";

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
  confirmRecord(
    odooSessionId: string,
    listKey: string,
    id: number
  ): Promise<{ ok: true; state: string | null }>;
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
}
