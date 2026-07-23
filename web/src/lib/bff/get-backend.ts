import { loadEnv } from "vite";
import { OdooAdapter } from "./odoo-adapter.ts";
import type { BackendClient } from "./backend-client.ts";

let cached: BackendClient | undefined;

const DEFAULT_RPC_TIMEOUT_MS = 15_000;

function env(
  name: "ODOO_URL" | "ODOO_DB" | "ODOO_RPC_TIMEOUT_MS"
): string | undefined {
  const fromMeta = (import.meta.env as Record<string, string | undefined>)[name];
  if (fromMeta) return fromMeta;
  if (process.env[name]) return process.env[name];
  const loaded = loadEnv(
    import.meta.env.MODE || "development",
    process.cwd(),
    ""
  );
  return loaded[name];
}

export function getRpcTimeoutMs(): number {
  const raw = Number(env("ODOO_RPC_TIMEOUT_MS"));
  if (Number.isFinite(raw) && raw >= 1000) return Math.floor(raw);
  return DEFAULT_RPC_TIMEOUT_MS;
}

export function getBackendEnv(): { baseUrl: string; db: string } {
  const baseUrl = env("ODOO_URL");
  const db = env("ODOO_DB");
  if (!baseUrl || !db) {
    throw new Error("Missing ODOO_URL or ODOO_DB");
  }
  return { baseUrl, db };
}

export function getBackend(): BackendClient {
  if (!cached) {
    const { baseUrl, db } = getBackendEnv();
    cached = new OdooAdapter({
      baseUrl,
      db,
      timeoutMs: getRpcTimeoutMs(),
    });
  }
  return cached;
}

/** Test-only seam to inject a fake backend (no-op outside NODE_ENV=test). */
export function __setBackendForTests(backend: BackendClient | undefined) {
  if (process.env.NODE_ENV !== "test") return;
  cached = backend;
}
