#!/usr/bin/env node
/**
 * Asegura Odoo nativo Servigas en :8070 (puerto distinto a Astro :4321).
 * Uso: node scripts/ensure-odoo-dev.mjs
 */
import { spawn, spawnSync } from "node:child_process";
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
const workspaceRoot = path.resolve(repoRoot, "..", "odoo-workspace");
const odooDir = path.join(workspaceRoot, "odoo-19");
const odooBin = path.join(odooDir, "odoo-bin");
const odooConfig = path.join(workspaceRoot, "config", "servigas.conf");
const applyPatchesScript = path.join(
  workspaceRoot,
  "scripts",
  "apply-odoo-patches.ps1"
);
const windowsPdfDoc = path.join(workspaceRoot, "docs", "WINDOWS-PDF.md");

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

/** @returns {string | null} directory containing wkhtmltopdf, if resolvable */
function resolveWkhtmltopdfBinDir() {
  const which = process.platform === "win32" ? "where.exe" : "which";
  const probe = spawnSync(which, ["wkhtmltopdf"], { encoding: "utf8" });
  const fromPath = String(probe.stdout || "")
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  if (fromPath && existsSync(fromPath)) {
    return path.dirname(fromPath);
  }

  if (process.platform === "win32") {
    const candidates = [
      path.join(
        process.env["ProgramFiles"] || "C:\\Program Files",
        "wkhtmltopdf",
        "bin"
      ),
      path.join(
        process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)",
        "wkhtmltopdf",
        "bin"
      ),
    ];
    for (const dir of candidates) {
      if (existsSync(path.join(dir, "wkhtmltopdf.exe"))) return dir;
    }
  }
  return null;
}

function envWithWkhtmltopdfPath() {
  const binDir = resolveWkhtmltopdfBinDir();
  if (!binDir) return { env: process.env, binDir: null };
  const sep = path.delimiter;
  const current = String(process.env.PATH || "");
  const parts = current.split(sep).filter(Boolean);
  if (parts.some((p) => path.resolve(p) === path.resolve(binDir))) {
    return { env: process.env, binDir };
  }
  return {
    env: { ...process.env, PATH: `${binDir}${sep}${current}` },
    binDir,
  };
}

function startOdoo() {
  if (!existsSync(odooBin)) {
    throw new Error(`No se encontró odoo-bin en ${odooBin}`);
  }
  if (!existsSync(odooConfig)) {
    throw new Error(`No se encontró config en ${odooConfig}`);
  }

  const { env, binDir } = envWithWkhtmltopdfPath();
  if (binDir) {
    console.log(`PDF: wkhtmltopdf en PATH → ${binDir}`);
  }

  const child = spawn(
    "python",
    ["odoo-bin", "-c", odooConfig, `--http-port=${ODOO_PORT}`],
    {
      cwd: odooDir,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      env,
    }
  );
  child.unref();
  return child.pid;
}

/** Warn-only: PDF reports need wkhtmltopdf + odoo-workspace patches on Windows. */
function warnPdfPrereqs() {
  const guide = existsSync(windowsPdfDoc)
    ? windowsPdfDoc
    : "odoo-workspace/docs/WINDOWS-PDF.md";
  const binDir = resolveWkhtmltopdfBinDir();

  if (!binDir) {
    console.warn(
      [
        "aviso PDF: no se encontró wkhtmltopdf en PATH.",
        "  Los reportes/facturas PDF fallarán hasta instalarlo:",
        "  winget install --id wkhtmltopdf.wkhtmltox -e",
        `  Guía: ${guide}`,
      ].join("\n")
    );
    return;
  }

  const which = process.platform === "win32" ? "where.exe" : "which";
  const probe = spawnSync(which, ["wkhtmltopdf"], {
    encoding: "utf8",
    env: envWithWkhtmltopdfPath().env,
  });
  const found =
    probe.status === 0 &&
    String(probe.stdout || "")
      .trim()
      .split(/\r?\n/)
      .some(Boolean);

  if (!found) {
    console.warn(
      [
        `aviso PDF: wkhtmltopdf está en ${binDir} pero no responde.`,
        `  Guía: ${guide}`,
      ].join("\n")
    );
    return;
  }

  if (process.platform !== "win32" || !existsSync(odooDir)) return;

  const patchGlob = path.join(
    workspaceRoot,
    "patches",
    "odoo-19",
    "001-wkhtmltopdf-hide-console-windows.patch"
  );
  if (!existsSync(patchGlob)) return;

  // Reverse --check succeeds only when the patch is already applied.
  const reverse = spawnSync(
    "git",
    ["apply", "--check", "--reverse", "--", patchGlob],
    { cwd: odooDir, encoding: "utf8" }
  );
  if (reverse.status === 0) return;

  console.warn(
    [
      "aviso PDF: falta el parche Windows (consola negra de wkhtmltopdf) en odoo-19.",
      existsSync(applyPatchesScript)
        ? `  powershell -File "${applyPatchesScript}"`
        : "  Corré apply-odoo-patches.ps1 desde odoo-workspace/",
      `  Guía: ${guide}`,
    ].join("\n")
  );
}

warnPdfPrereqs();

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
