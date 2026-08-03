/**
 * Wipe híbrido del catálogo product.template (unlink → archive).
 *
 * Uso (desde web/):
 *   SMOKE_LOGIN=mauri SMOKE_PASSWORD=admin npm run purge:products
 *   npm run purge:products -- --include-archived
 *   npm run purge:products -- --dry-run
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(__dirname, "..");

function loadEnvFile() {
  const envPath = resolve(webRoot, ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile();

const baseUrl = (process.env.ODOO_URL || "http://127.0.0.1:8070").replace(
  /\/$/,
  ""
);
const db = process.env.ODOO_DB || "servigas_dev";
const login = process.env.SMOKE_LOGIN || process.env.ODOO_LOGIN || "admin";
const password =
  process.env.SMOKE_PASSWORD || process.env.ODOO_PASSWORD || "admin";
const includeArchived = process.argv.includes("--include-archived");
const dryRun = process.argv.includes("--dry-run");

function readSessionId(setCookie) {
  if (!setCookie) return null;
  const parts = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const part of parts) {
    const match = /(?:^|,\s*)session_id=([^;,\s]+)/i.exec(part);
    if (match) return match[1];
  }
  return null;
}

async function authenticate() {
  const res = await fetch(`${baseUrl}/web/session/authenticate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      params: { db, login, password },
    }),
  });
  const payload = await res.json();
  if (!payload?.result?.uid) {
    throw new Error(
      `Login falló: ${JSON.stringify(payload?.error || payload)}`
    );
  }
  const setCookie =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : res.headers.get("set-cookie");
  const sessionId = readSessionId(setCookie);
  if (!sessionId) throw new Error("Odoo no devolvió session_id");
  return sessionId;
}

async function callKw(sessionId, model, method, args, kwargs = {}, retries = 3) {
  let lastErr;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${baseUrl}/web/dataset/call_kw`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `session_id=${sessionId}`,
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          params: { model, method, args, kwargs },
        }),
      });
      const payload = await res.json();
      if (payload.error) {
        const msg =
          payload.error?.data?.message ||
          payload.error?.message ||
          JSON.stringify(payload.error);
        throw new Error(msg);
      }
      return payload.result;
    } catch (err) {
      lastErr = err;
      const message = err instanceof Error ? err.message : String(err);
      if (!/fetch failed|ECONNRESET|socket|network/i.test(message) || attempt === retries) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, 500 * attempt));
    }
  }
  throw lastErr;
}

async function searchIds(sessionId, domain) {
  const ids = [];
  const pageSize = 500;
  let offset = 0;
  while (true) {
    const batch = await callKw(
      sessionId,
      "product.template",
      "search",
      [domain],
      { limit: pageSize, offset, order: "id" }
    );
    ids.push(...batch);
    if (batch.length < pageSize) break;
    offset += pageSize;
  }
  return ids;
}

async function main() {
  console.log(`Odoo ${baseUrl} db=${db} user=${login}`);
  console.log(
    `Modo: ${dryRun ? "dry-run" : "aplicar"} · includeArchived=${includeArchived}`
  );
  const sessionId = await authenticate();
  const domain = includeArchived ? [] : [["active", "=", true]];
  const ids = await searchIds(sessionId, domain);
  console.log(`Productos encontrados: ${ids.length}`);

  let deleted = 0;
  let archived = 0;
  /** @type {Array<{ id: number, message: string }>} */
  const errors = [];

  for (const id of ids) {
    if (dryRun) {
      deleted += 1;
      continue;
    }
    try {
      await callKw(sessionId, "product.template", "unlink", [[id]]);
      deleted += 1;
    } catch (unlinkErr) {
      try {
        await callKw(sessionId, "product.template", "write", [
          [id],
          { active: false },
        ]);
        archived += 1;
      } catch (archiveErr) {
        errors.push({
          id,
          message:
            archiveErr instanceof Error
              ? archiveErr.message
              : String(archiveErr),
        });
      }
    }
  }

  console.log(
    dryRun
      ? `Dry-run: ${ids.length} productos se habrían procesado`
      : `Listo: ${deleted} eliminados, ${archived} archivados, ${errors.length} errores`
  );
  if (errors.length) {
    for (const err of errors.slice(0, 20)) {
      console.log(`  id=${err.id}: ${err.message}`);
    }
    if (errors.length > 20) console.log(`  … y ${errors.length - 20} más`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
