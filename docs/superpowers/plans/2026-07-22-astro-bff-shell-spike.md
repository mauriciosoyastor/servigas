# Astro BFF Shell Spike (Servigas) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar en `web/` un shell Astro con BFF (login, launcher, rail, hub inventory) que lea payloads reales de Odoo vía `BackendClient` + `OdooAdapter`, con paridad visual Liquid Glass razonable.

**Architecture:** Browser → Astro server (cookie BFF) → `BackendClient` → `OdooAdapter` (JSON-RPC Odoo). UI solo navega hubs Astro; clicks no-hub = “Próximamente”. Fase B (skill molde) es el Task final tras el spike estable.

**Tech Stack:** Astro 7 (`output: 'server'` + `@astrojs/node`), TypeScript, Tailwind 4 ya en `web/`, `node:test` para unit tests, Odoo 19 JSON-RPC (`/web/session/authenticate`, `/web/dataset/call_kw`).

**Spec:** `docs/superpowers/specs/2026-07-22-astro-bff-shell-design.md`  
**Contratos:** `.cursor/skills/servigas-owl-frontend/inventory/rpc-contracts.md`

## Global Constraints

- Hub real del spike: `inventory` solamente
- Clicks no-hub / cards: UI “Próximamente” (no embed Odoo)
- Cookie BFF httpOnly; sesión Odoo solo server-side
- Prefijo CSS `--sg-*` / `.sg-*`; tipografía Montserrat; no clases `.crm-*`
- No inventar campos fuera de `rpc-contracts.md`
- Env: `ODOO_URL`, `ODOO_DB` (no commitear secretos)
- Commits frecuentes por task; TDD en lógica pura y adaptador

## File structure (lock-in)

```text
web/
  .env.example
  package.json                 # + @astrojs/node, scripts test
  astro.config.mjs             # output server + node adapter
  src/
    env.d.ts
    styles/tokens.css          # --sg-* mínimos
    styles/shell.css
    lib/bff/types.ts
    lib/bff/errors.ts
    lib/bff/backend-client.ts  # interface
    lib/bff/session-store.ts
    lib/bff/odoo-adapter.ts
    lib/bff/get-backend.ts     # factory singleton
    lib/shell/tile-nav.ts      # tile → path | coming_soon
    lib/shell/hub-apps.ts      # allowlist apps
    pages/api/auth/login.ts
    pages/api/auth/logout.ts
    pages/api/auth/session.ts
    pages/api/launcher.ts
    pages/api/hub/[app].ts
    pages/login.astro
    pages/index.astro
    pages/hubs/[app].astro
    layouts/ShellLayout.astro
    components/RailNav.astro
    components/TileCard.astro
    components/ComingSoonNote.astro
  tests/tile-nav.test.mjs
  tests/hub-apps.test.mjs
  tests/odoo-adapter.test.mjs
```

---

### Task 1: SSR Astro + env + tipos de contrato

**Files:**
- Modify: `web/astro.config.mjs`
- Modify: `web/package.json`
- Create: `web/.env.example`
- Create: `web/src/env.d.ts`
- Create: `web/src/lib/bff/types.ts`
- Create: `web/src/lib/bff/errors.ts`

**Interfaces:**
- Produces: types `LauncherTile`, `HubCard`, `LauncherPayload`, `HubPayload`, `SessionInfo`
- Produces: `BffError` with `status` + `code` (`unauthorized` | `bad_credentials` | `odoo_unavailable` | `not_found`)

- [ ] **Step 1: Install Node adapter**

```bash
cd web
npm install @astrojs/node
```

- [ ] **Step 2: Enable server output**

Replace `web/astro.config.mjs` with:

```js
// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  vite: { plugins: [tailwindcss()] },
});
```

- [ ] **Step 3: Create `web/.env.example`**

```env
ODOO_URL=http://127.0.0.1:8069
ODOO_DB=servigas_dev
BFF_SESSION_SECRET=change-me-in-local-env
```

- [ ] **Step 4: Create `web/src/lib/bff/types.ts`**

```ts
export type AccentKey =
  | "flame-yellow"
  | "flame-orange"
  | "flame-deep"
  | "flame-rust"
  | "bg-mid"
  | "bg-charcoal"
  | "bg-deep";

export type LauncherTile = {
  id: number;
  label: string;
  hint: string;
  icon: string;
  enter_label: string;
  target_type: "hub" | "action";
  client_tag: string;
  accent_key: AccentKey | string;
  value: string;
  action: Record<string, unknown> | false;
};

export type HubCard = {
  id: number;
  label: string;
  hint: string;
  icon: string;
  variant: "default" | "warning" | string;
  accent_key: AccentKey | string;
  enter_label: string;
  value: string;
  action: Record<string, unknown>;
};

export type HubGroup = {
  code: string;
  name: string;
  icon: string;
  cards: HubCard[];
};

export type HubSection = { code: string; name: string; icon: string };

export type LauncherPayload = { tiles: LauncherTile[] };

export type HubPayload = {
  app: string;
  section: string;
  sections: HubSection[];
  groups: HubGroup[];
  cards: HubCard[];
};

export type SessionInfo = { uid: number; name: string; login: string };
```

- [ ] **Step 5: Create `web/src/lib/bff/errors.ts`**

```ts
export type BffErrorCode =
  | "unauthorized"
  | "bad_credentials"
  | "odoo_unavailable"
  | "not_found";

export class BffError extends Error {
  constructor(
    readonly code: BffErrorCode,
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "BffError";
  }
}
```

- [ ] **Step 6: Add `web/src/env.d.ts`**

```ts
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly ODOO_URL: string;
  readonly ODOO_DB: string;
  readonly BFF_SESSION_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 7: Commit**

```bash
git add web/astro.config.mjs web/package.json web/package-lock.json web/.env.example web/src/env.d.ts web/src/lib/bff/types.ts web/src/lib/bff/errors.ts
git commit -m "feat(web): enable Astro SSR and BFF contract types"
```

---

### Task 2: `tile-nav` + `hub-apps` (TDD)

**Files:**
- Create: `web/src/lib/shell/hub-apps.ts`
- Create: `web/src/lib/shell/tile-nav.ts`
- Create: `web/tests/hub-apps.test.mjs`
- Create: `web/tests/tile-nav.test.mjs`
- Modify: `web/package.json` (script `"test": "node --test tests/**/*.test.mjs"`)

**Interfaces:**
- Produces: `HUB_APPS = ["inventory","sales","purchase","accounting"]`
- Produces: `isHubApp(app: string): boolean`
- Produces: `clientTagToApp(tag: string): string | null` — map `servigas_inventory_hub` → `inventory`, etc.
- Produces: `resolveTileNavigation(tile): { kind: "hub"; path: string } | { kind: "coming_soon" }`

- [ ] **Step 1: Write failing tests `web/tests/hub-apps.test.mjs`**

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isHubApp, clientTagToApp } from "../src/lib/shell/hub-apps.ts";

describe("hub-apps", () => {
  it("accepts inventory", () => {
    assert.equal(isHubApp("inventory"), true);
  });
  it("rejects unknown", () => {
    assert.equal(isHubApp("pos"), false);
  });
  it("maps inventory client tag", () => {
    assert.equal(clientTagToApp("servigas_inventory_hub"), "inventory");
  });
});
```

- [ ] **Step 2: Write failing tests `web/tests/tile-nav.test.mjs`**

```js
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveTileNavigation } from "../src/lib/shell/tile-nav.ts";

describe("resolveTileNavigation", () => {
  it("routes hub tiles to /hubs/:app", () => {
    const nav = resolveTileNavigation({
      target_type: "hub",
      client_tag: "servigas_inventory_hub",
    });
    assert.deepEqual(nav, { kind: "hub", path: "/hubs/inventory" });
  });
  it("marks non-hub as coming_soon", () => {
    const nav = resolveTileNavigation({
      target_type: "action",
      client_tag: "",
    });
    assert.deepEqual(nav, { kind: "coming_soon" });
  });
});
```

- [ ] **Step 3: Run tests — expect FAIL**

```bash
cd web
npm pkg set scripts.test="node --experimental-strip-types --test tests/**/*.test.mjs"
npm test
```

Expected: FAIL (modules missing) or equivalent.

- [ ] **Step 4: Implement `hub-apps.ts`**

```ts
const TAG_TO_APP: Record<string, string> = {
  servigas_inventory_hub: "inventory",
  servigas_sales_hub: "sales",
  servigas_purchase_hub: "purchase",
  servigas_accounting_hub: "accounting",
};

export const HUB_APPS = ["inventory", "sales", "purchase", "accounting"] as const;
export type HubApp = (typeof HUB_APPS)[number];

export function isHubApp(app: string): app is HubApp {
  return (HUB_APPS as readonly string[]).includes(app);
}

export function clientTagToApp(tag: string): HubApp | null {
  return (TAG_TO_APP[tag] as HubApp | undefined) ?? null;
}
```

- [ ] **Step 5: Implement `tile-nav.ts`**

```ts
import { clientTagToApp } from "./hub-apps.ts";

export type TileNavInput = {
  target_type: "hub" | "action" | string;
  client_tag: string;
};

export type TileNavResult =
  | { kind: "hub"; path: string }
  | { kind: "coming_soon" };

export function resolveTileNavigation(tile: TileNavInput): TileNavResult {
  if (tile.target_type !== "hub") return { kind: "coming_soon" };
  const app = clientTagToApp(tile.client_tag);
  if (!app) return { kind: "coming_soon" };
  return { kind: "hub", path: `/hubs/${app}` };
}
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
cd web && npm test
```

- [ ] **Step 7: Commit**

```bash
git add web/src/lib/shell web/tests web/package.json
git commit -m "feat(web): add tile navigation helpers with tests"
```

---

### Task 3: `sessionStore` + puerto `BackendClient` + `OdooAdapter` (TDD)

**Files:**
- Create: `web/src/lib/bff/backend-client.ts`
- Create: `web/src/lib/bff/session-store.ts`
- Create: `web/src/lib/bff/odoo-adapter.ts`
- Create: `web/src/lib/bff/get-backend.ts`
- Create: `web/tests/odoo-adapter.test.mjs`

**Interfaces:**
- Produces:

```ts
export interface BackendClient {
  login(login: string, password: string): Promise<{ sessionId: string; session: SessionInfo }>;
  logout(odooSessionId: string): Promise<void>;
  getLauncher(odooSessionId: string): Promise<LauncherPayload>;
  getHub(odooSessionId: string, app: string, section?: string): Promise<HubPayload>;
}
```

- `MemorySessionStore`: `create(odooSessionId, session) → bffSid`, `get(bffSid)`, `destroy(bffSid)`
- Cookie name: `sg_bff_sid`
- `OdooAdapter` constructor `(opts: { baseUrl, db, fetchImpl? })`

- [ ] **Step 1: Write failing adapter tests** (mock `fetch`)

```js
import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { OdooAdapter } from "../src/lib/bff/odoo-adapter.ts";
import { BffError } from "../src/lib/bff/errors.ts";

describe("OdooAdapter.login", () => {
  it("maps auth failure to bad_credentials", async () => {
    const fetchImpl = mock.fn(async () =>
      Response.json({ error: { data: { message: "Access Denied" } } }, { status: 200 })
    );
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });
    await assert.rejects(
      () => adapter.login("bad", "bad"),
      (err) => err instanceof BffError && err.code === "bad_credentials"
    );
  });

  it("returns session on success", async () => {
    const fetchImpl = mock.fn(async () =>
      Response.json({
        result: { uid: 2, name: "Admin", username: "admin" },
      }, {
        status: 200,
        headers: { "set-cookie": "session_id=abc123; Path=/" },
      })
    );
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });
    const out = await adapter.login("admin", "admin");
    assert.equal(out.session.uid, 2);
    assert.ok(out.sessionId);
  });
});

describe("OdooAdapter.getLauncher", () => {
  it("calls sg.app.tile get_launcher_payload", async () => {
    const calls = [];
    const fetchImpl = mock.fn(async (url, init) => {
      calls.push({ url: String(url), body: init?.body });
      return Response.json({ result: { tiles: [] } });
    });
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });
    const payload = await adapter.getLauncher("sess");
    assert.deepEqual(payload, { tiles: [] });
    assert.match(String(calls[0].body), /get_launcher_payload/);
    assert.match(String(calls[0].body), /sg\.app\.tile/);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd web && npm test
```

- [ ] **Step 3: Implement `backend-client.ts`** (solo interface + reexports si hace falta)

```ts
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
```

- [ ] **Step 4: Implement `session-store.ts`**

```ts
import { randomUUID } from "node:crypto";
import type { SessionInfo } from "./types.ts";

type Entry = { odooSessionId: string; session: SessionInfo };

export class MemorySessionStore {
  #map = new Map<string, Entry>();

  create(odooSessionId: string, session: SessionInfo): string {
    const sid = randomUUID();
    this.#map.set(sid, { odooSessionId, session });
    return sid;
  }

  get(bffSid: string): Entry | undefined {
    return this.#map.get(bffSid);
  }

  destroy(bffSid: string): void {
    this.#map.delete(bffSid);
  }
}

export const sessionStore = new MemorySessionStore();
export const BFF_COOKIE = "sg_bff_sid";
```

- [ ] **Step 5: Implement `odoo-adapter.ts`**

Minimal behavior required by tests:

1. `login`: `POST ${baseUrl}/web/session/authenticate` JSON-RPC body `{ jsonrpc:"2.0", params:{ db, login, password } }`; parse `set-cookie` for `session_id`; on missing `result.uid` throw `BffError("bad_credentials", 401, ...)`; on network throw `odoo_unavailable` 503.
2. `getLauncher`: `POST ${baseUrl}/web/dataset/call_kw` with cookie `session_id=...`, body calling model `sg.app.tile`, method `get_launcher_payload`, args `[]`.
3. `getHub`: same with model `sg.hub.card`, method `get_hub_payload`, args `[app, section ?? "summary"]`.
4. `logout`: best-effort `POST /web/session/destroy` (ignore failures).

Use a private `callKw(sessionId, model, method, args)` helper. Map fetch failures → `BffError("odoo_unavailable", 503, "No se pudo conectar con el servidor")`.

- [ ] **Step 6: Implement `get-backend.ts`**

```ts
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
```

- [ ] **Step 7: Run tests — PASS**

```bash
cd web && npm test
```

- [ ] **Step 8: Commit**

```bash
git add web/src/lib/bff web/tests/odoo-adapter.test.mjs
git commit -m "feat(web): add Odoo BFF adapter and session store"
```

---

### Task 4: API routes auth + launcher + hub

**Files:**
- Create: `web/src/pages/api/auth/login.ts`
- Create: `web/src/pages/api/auth/logout.ts`
- Create: `web/src/pages/api/auth/session.ts`
- Create: `web/src/pages/api/launcher.ts`
- Create: `web/src/pages/api/hub/[app].ts`
- Create: `web/src/lib/bff/http.ts` (helpers cookie + error JSON)

**Interfaces:**
- `POST /api/auth/login` body `{ login, password }` → Set-Cookie `sg_bff_sid` + `{ ok: true, session }`
- `POST /api/auth/logout` → clear cookie
- `GET /api/auth/session` → `{ session }` or 401
- `GET /api/launcher` → `LauncherPayload` or 401/503
- `GET /api/hub/:app?section=summary` → `HubPayload`; 404 if `!isHubApp(app)`

- [ ] **Step 1: Helpers `http.ts`**

```ts
import type { APIContext } from "astro";
import { BffError } from "./errors.ts";
import { BFF_COOKIE, sessionStore } from "./session-store.ts";

export function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
}

export function bffErrorResponse(err: unknown) {
  if (err instanceof BffError) {
    return json({ error: { code: err.code, message: err.message } }, { status: err.status });
  }
  return json(
    { error: { code: "odoo_unavailable", message: "No se pudo conectar con el servidor" } },
    { status: 503 }
  );
}

export function requireOdooSession(cookies: APIContext["cookies"]) {
  const sid = cookies.get(BFF_COOKIE)?.value;
  if (!sid) throw new BffError("unauthorized", 401, "Sesión requerida");
  const entry = sessionStore.get(sid);
  if (!entry) throw new BffError("unauthorized", 401, "Sesión inválida");
  return { bffSid: sid, ...entry };
}

export function setBffCookie(cookies: APIContext["cookies"], bffSid: string) {
  cookies.set(BFF_COOKIE, bffSid, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: import.meta.env.PROD,
  });
}

export function clearBffCookie(cookies: APIContext["cookies"]) {
  cookies.delete(BFF_COOKIE, { path: "/" });
}
```

- [ ] **Step 2: `login.ts`**

```ts
import type { APIRoute } from "astro";
import { getBackend } from "../../../lib/bff/get-backend.ts";
import { sessionStore } from "../../../lib/bff/session-store.ts";
import { bffErrorResponse, json, setBffCookie } from "../../../lib/bff/http.ts";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const body = await request.json();
    const login = String(body.login || "");
    const password = String(body.password || "");
    const { sessionId, session } = await getBackend().login(login, password);
    const bffSid = sessionStore.create(sessionId, session);
    setBffCookie(cookies, bffSid);
    return json({ ok: true, session });
  } catch (err) {
    return bffErrorResponse(err);
  }
};
```

- [ ] **Step 3: `logout.ts` / `session.ts` / `launcher.ts` / `hub/[app].ts`**

Mirror the same pattern: `requireOdooSession` → `getBackend()` → `json(payload)`. For hub:

```ts
import { isHubApp } from "../../../../lib/shell/hub-apps.ts";
import { BffError } from "../../../../lib/bff/errors.ts";
// ...
if (!isHubApp(params.app || "")) {
  throw new BffError("not_found", 404, "Hub no encontrado");
}
const section = url.searchParams.get("section") || "summary";
const payload = await getBackend().getHub(odooSessionId, params.app!, section);
```

- [ ] **Step 4: Manual smoke with Odoo up**

```bash
cd web
cp .env.example .env   # ajustar ODOO_URL / ODOO_DB
npm run dev
# POST login with curl, then GET /api/launcher with cookie jar
```

Expected: tiles JSON from real DB when credentials valid.

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/api web/src/lib/bff/http.ts
git commit -m "feat(web): add BFF auth, launcher, and hub API routes"
```

---

### Task 5: Login page + ShellLayout + Rail + Launcher UI

**Files:**
- Create: `web/src/styles/tokens.css`
- Create: `web/src/styles/shell.css`
- Modify: `web/src/styles/global.css` (import tokens/shell)
- Create: `web/src/layouts/ShellLayout.astro`
- Create: `web/src/components/RailNav.astro`
- Create: `web/src/components/TileCard.astro`
- Create: `web/src/components/ComingSoonNote.astro`
- Create: `web/src/pages/login.astro`
- Modify: `web/src/pages/index.astro`
- Modify: `web/src/layouts/BaseLayout.astro` (Montserrat + body classes)

**Interfaces:**
- Unauthenticated visit to `/` redirects to `/login`
- Login form posts to `/api/auth/login` then `location = "/"`
- `index.astro` server-fetches launcher via backend (or internal fetch with cookie)
- Rail links: `/`, `/hubs/inventory`, and stubs for sales/purchase/accounting that render ComingSoon if no page yet — for spike, only inventory hub page exists; other rail targets can hit `/hubs/:app` which shows coming soon empty for non-loaded apps **or** only highlight inventory as enabled. Spec: rail navigates home + implemented hub; other apps may stub.

- [ ] **Step 1: Tokens mínimos** in `tokens.css` (`--sg-flame-*`, `--sg-bg-deep`, surfaces glass). Copy values from `docs/design/servigas-brand.md` / `servigas_tokens` concepts — not CRM classes.

- [ ] **Step 2: `ShellLayout.astro`** wraps slot + `<RailNav active={...} />`.

- [ ] **Step 3: `RailNav.astro`** items:

```ts
const items = [
  { href: "/", label: "Inicio", app: "home" },
  { href: "/hubs/inventory", label: "Inventario", app: "inventory" },
  { href: "/hubs/sales", label: "Ventas", app: "sales" },
  { href: "/hubs/purchase", label: "Compras", app: "purchase" },
  { href: "/hubs/accounting", label: "Contabilidad", app: "accounting" },
];
```

- [ ] **Step 4: `login.astro`** form + client script fetch POST `/api/auth/login`.

- [ ] **Step 5: `index.astro`** — server side:

```ts
import { requireOdooSession } from "../lib/bff/http.ts";
import { getBackend } from "../lib/bff/get-backend.ts";
// if no session → Astro.redirect("/login")
// else tiles = await getBackend().getLauncher(odooSessionId)
```

Render grid of `TileCard`. On click (client): use `resolveTileNavigation`; if hub → `location.href = path`; else show ComingSoonNote.

- [ ] **Step 6: Visual check** — home looks recognizably Servigas Liquid Glass (not default Astro blank).

- [ ] **Step 7: Commit**

```bash
git add web/src
git commit -m "feat(web): add login, shell layout, rail, and launcher UI"
```

---

### Task 6: Hub inventory page + coming soon for cards / other apps

**Files:**
- Create: `web/src/pages/hubs/[app].astro`

**Interfaces:**
- `inventory` + session → render `cards` (summary) with `TileCard`
- Card click → ComingSoonNote
- Other `isHubApp` values: may call API too (bonus) or show “Próximamente” page body without requiring payload — prefer real payload if cheap (same `getHub`). Spec only requires inventory verified.
- Unknown app → 404

- [ ] **Step 1: Implement `[app].astro`** with `isHubApp` guard, `getHub(..., "summary")`, grid of cards.

- [ ] **Step 2: Manual path** login → Inicio → tile Inventario o rail → hub con KPIs reales → click card → “Próximamente”.

- [ ] **Step 3: Commit**

```bash
git add web/src/pages/hubs
git commit -m "feat(web): add inventory hub page with coming-soon card clicks"
```

---

### Task 7: Verificación spike + bitácora

**Files:**
- Modify: `docs/proyecto/bitacora-cambios.md`
- Modify: `CONTEXT.md` (nota breve: shell Astro experimental en `web/`, OWL sigue siendo prod hasta corte)

- [ ] **Step 1: Run unit tests**

```bash
cd web && npm test
```

Expected: all PASS.

- [ ] **Step 2: Manual checklist from spec Fase A**

- [ ] Login contra Odoo dev
- [ ] Tiles reales en home
- [ ] Rail → inventory hub
- [ ] Cards reales
- [ ] No-hub / cards → Próximamente
- [ ] Look Liquid Glass razonable

- [ ] **Step 3: Bitácora + CONTEXT note**

- [ ] **Step 4: Commit**

```bash
git add docs/proyecto/bitacora-cambios.md CONTEXT.md
git commit -m "docs: note Astro BFF shell spike verification"
```

---

### Task 8: Fase B — skill molde reutilizable (post-spike)

**Files:**
- Create: `C:/Users/mauri/.agents/skills/astro-bff-shell/SKILL.md` (o path personal de skills del usuario)
- Create: `C:/Users/mauri/.agents/skills/astro-bff-shell/checklist.md`
- Optionally add short pointer in `servigas` `CONTEXT.md` or README `web/README.md`

**Interfaces:**
- Skill describes: Browser → BFF → `BackendClient` → Adapter; spike checklist; link to Servigas as reference implementation; design system pluggable.

- [ ] **Step 1: Draft SKILL.md** with frontmatter `name: astro-bff-shell`, triggers (nuevo shell Astro+BFF, Odoo u otro backend).

- [ ] **Step 2: checklist.md** — login → home API → one hub → extract adapter.

- [ ] **Step 3: `web/README.md`** — how to run spike; what is generic vs `OdooAdapter`.

- [ ] **Step 4: Commit repo docs only** (skill personal may live outside repo — commit `web/README.md` + CONTEXT pointer).

```bash
git add web/README.md CONTEXT.md
git commit -m "docs(web): document BFF shell starter for reuse"
```

---

## Spec coverage (self-review)

| Spec requirement | Task |
|------------------|------|
| Login BFF + sesión Odoo server-side | 3, 4, 5 |
| `/api/launcher` + home tiles | 4, 5 |
| Rail + hub inventory | 5, 6 |
| Próximamente no-hub/cards | 2, 5, 6 |
| Liquid Glass razonable | 5 |
| Types/contracts rpc | 1, 3 |
| Tests adapter + nav | 2, 3 |
| Errores 401/503/404 | 3, 4 |
| Fase B skill + starter | 8 |
| No embed/recorrido/POS | out of plan (constrained) |

## Placeholder / consistency check

- Cookie name consistent: `sg_bff_sid`
- Methods: `getLauncher` / `getHub` / `login` / `logout`
- Hub app: `inventory`
- Node test runner via `node --experimental-strip-types` (Node ≥22.12 per `web/package.json` engines)
