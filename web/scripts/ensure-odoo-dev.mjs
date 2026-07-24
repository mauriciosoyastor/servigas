#!/usr/bin/env node
/**
 * Asegura Odoo nativo Servigas en :8070 (puerto distinto a Astro :4321).
 * Uso: node scripts/ensure-odoo-dev.mjs
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ODOO_PORT = 8070;
const ODOO_HOST = "127.0.0.1";
const READY_TIMEOUT_MS = 120_000;
const POLL_MS = 1_000;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(webRoot, "..");
const odooDir = path.resolve(repoRoot, "..", "odoo-workspace", "odoo-19");
const odooBin = path.join(odooDir, "odoo-bin");
const odooConfig = path.resolve(repoRoot, "..", "odoo-workspace", "config", "servigas.conf");

function portOpen(host, port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.setTimeout(800, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitUntilReady() {
  const started = Date.now();
  while (Date.now() - started < READY_TIMEOUT_MS) {
    if (await portOpen(ODOO_HOST, ODOO_PORT)) return true;
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  return false;
}

function startOdoo() {
  if (!existsSync(odooBin)) {
    throw new Error(`No se encontró odoo-bin en ${odooBin}`);
  }
  if (!existsSync(odooConfig)) {
    throw new Error(`No se encontró config en ${odooConfig}`);
  }

  const child = spawn(
    "python",
    ["odoo-bin", "-c", odooConfig, `--http-port=${ODOO_PORT}`],
    {
      cwd: odooDir,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }
  );
  child.unref();
  return child.pid;
}

const alreadyUp = await portOpen(ODOO_HOST, ODOO_PORT);
if (alreadyUp) {
  console.log(`Odoo ya está en http://${ODOO_HOST}:${ODOO_PORT}`);
  process.exit(0);
}

console.log(`Odoo no responde en :${ODOO_PORT}. Arrancando…`);
const pid = startOdoo();
console.log(`Odoo spawn pid=${pid}`);

const ready = await waitUntilReady();
if (!ready) {
  console.error(
    `Timeout: Odoo no abrió el puerto ${ODOO_PORT} en ${READY_TIMEOUT_MS / 1000}s`
  );
  process.exit(1);
}

console.log(`Odoo listo en http://${ODOO_HOST}:${ODOO_PORT}`);
process.exit(0);
