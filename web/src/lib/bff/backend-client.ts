import type { HubPayload, LauncherPayload, SessionInfo } from "./types.ts";

export interface BackendClient {
  login(
    login: string,
    password: string
  ): Promise<{ sessionId: string; session: SessionInfo }>;
  logout(odooSessionId: string): Promise<void>;
  getLauncher(odooSessionId: string): Promise<LauncherPayload>;
  getHub(
    odooSessionId: string,
    app: string,
    section?: string
  ): Promise<HubPayload>;
}
