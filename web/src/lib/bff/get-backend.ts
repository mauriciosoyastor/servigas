import { OdooAdapter } from "./odoo-adapter.ts";
import type { BackendClient } from "./backend-client.ts";

let cached: BackendClient | undefined;

export function getBackend(): BackendClient {
  if (!cached) {
    const baseUrl = import.meta.env.ODOO_URL;
    const db = import.meta.env.ODOO_DB;
    if (!baseUrl || !db) {
      throw new Error("Missing ODOO_URL or ODOO_DB");
    }
    cached = new OdooAdapter({ baseUrl, db });
  }
  return cached;
}
