import type { BackendClient } from "./backend-client.ts";
import { BffError } from "./errors.ts";
import type { HubPayload, LauncherPayload, SessionInfo } from "./types.ts";

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
};

export class OdooAdapter implements BackendClient {
  readonly #baseUrl: string;
  readonly #db: string;
  readonly #fetch: typeof fetch;

  constructor({ baseUrl, db, fetchImpl = fetch }: OdooAdapterOptions) {
    this.#baseUrl = baseUrl.replace(/\/+$/, "");
    this.#db = db;
    this.#fetch = fetchImpl;
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
      });
    } catch {
      // Logout is best-effort; the local BFF session is destroyed separately.
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

  async #callKw<T>(
    sessionId: string,
    model: string,
    method: string,
    args: unknown[]
  ): Promise<T> {
    const response = await this.#post(
      "/web/dataset/call_kw",
      {
        jsonrpc: "2.0",
        params: { model, method, args, kwargs: {} },
      },
      sessionId
    );
    const payload = (await response.json()) as JsonRpcResponse<T>;
    return payload.result as T;
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
      });
    } catch {
      throw new BffError(
        "odoo_unavailable",
        503,
        "No se pudo conectar con el servidor"
      );
    }
  }

  #readSessionId(setCookie: string | null): string {
    return setCookie?.match(/(?:^|[;,]\s*)session_id=([^;,\s]+)/)?.[1] ?? "";
  }
}
