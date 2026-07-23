import { loadEnv } from "vite";
import { OdooAdapter } from "./odoo-adapter.ts";
import type { BackendClient } from "./backend-client.ts";

let cached: BackendClient | undefined;

function env(name: "ODOO_URL" | "ODOO_DB"): string | undefined {
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
    cached = new OdooAdapter({ baseUrl, db });
  }
  return cached;
}
