# Ajustes: perfil + cambiar contraseña — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** En `/settings`, mostrar perfil (nombre + login, solo lectura) y un formulario de cambio de contraseña vía BFF Astro; al éxito, cerrar sesión y redirigir a `/login?changed=1`.

**Architecture:** El browser solo habla con Astro. `POST /api/auth/change-password` usa la cookie BFF, llama `BackendClient.changePassword` → Odoo `res.users.change_password` (JSON-RPC), y luego destruye sesión Odoo + BFF. El adapter **no** reutiliza el mapeo genérico de `#callKw` que convierte “Access Denied” en `unauthorized` (eso invalidaría la sesión ante clave actual incorrecta).

**Tech Stack:** Astro 7 SSR, BFF Node, Odoo JSON-RPC, Node test runner (`npm test` en `web/`).

**Spec:** `docs/superpowers/specs/2026-07-24-astro-settings-change-password-design.md`

## Global Constraints

- Browser nunca habla con `:8070` / `:8069`.
- Perfil: solo lectura desde sesión BFF (`session.name`, `session.login`).
- Body API: `{ currentPassword, newPassword }` (confirmación solo en cliente).
- Post-éxito: logout Odoo + destroy BFF + clear cookie → client redirect `/login?changed=1`.
- Clave actual incorrecta → error visible; **sesión BFF sigue viva** (`validation_error` o `bad_credentials`, nunca `unauthorized` por clave mala).
- Copy segura: no filtrar JSON-RPC / tracebacks al cliente.
- Conservar card Integraciones en `/settings`.
- Tests: `npm test` desde `web/`.
- Commits chicos por task.

## File map

| Archivo | Rol |
|---------|-----|
| `web/src/lib/bff/backend-client.ts` | Agregar `changePassword` a la interfaz |
| `web/src/lib/bff/odoo-adapter.ts` | Implementar `changePassword` con mapeo de errores propio |
| `web/src/pages/api/auth/change-password.ts` | Handler POST |
| `web/src/pages/settings.astro` | Perfil + form + script |
| `web/src/pages/login.astro` | Banner si `?changed=1` |
| `web/tests/odoo-adapter.test.mjs` | Tests adapter |
| `web/tests/api-routes.test.mjs` | Tests API |
| `web/tests/shell-ui.test.mjs` | Contratos UI settings/login |

---

### Task 1: `BackendClient.changePassword` + `OdooAdapter`

**Files:**
- Modify: `web/src/lib/bff/backend-client.ts`
- Modify: `web/src/lib/bff/odoo-adapter.ts` (después de `logout` / cerca de auth)
- Test: `web/tests/odoo-adapter.test.mjs`

**Interfaces:**
- Consumes: `#post`, `#describeRpcError`, `BffError`
- Produces:

```ts
// BackendClient
changePassword(
  odooSessionId: string,
  currentPassword: string,
  newPassword: string
): Promise<void>;
```

- [ ] **Step 1: Write failing tests**

Append to `web/tests/odoo-adapter.test.mjs`:

```js
describe("OdooAdapter.changePassword", () => {
  it("calls res.users.change_password with current and new password", async () => {
    const fetchImpl = mock.fn(async () =>
      Response.json({ result: true }, { status: 200 })
    );
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });

    await adapter.changePassword("sid-1", "old-secret", "new-secret");

    const [url, init] = fetchImpl.mock.calls[0].arguments;
    assert.equal(String(url), "http://odoo.test/web/dataset/call_kw");
    assert.match(String(init.headers.cookie), /session_id=sid-1/);
    assert.deepEqual(JSON.parse(String(init.body)), {
      jsonrpc: "2.0",
      params: {
        model: "res.users",
        method: "change_password",
        args: ["old-secret", "new-secret"],
        kwargs: {},
      },
    });
  });

  it("maps wrong current password to validation_error without treating it as unauthorized", async () => {
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl: async () =>
        Response.json({
          error: {
            data: { message: "Incorrect current password", name: "Access Denied" },
          },
        }),
    });

    await assert.rejects(
      () => adapter.changePassword("sid-1", "bad", "new-secret"),
      (err) =>
        err instanceof BffError &&
        err.code === "validation_error" &&
        err.status === 400 &&
        /actual/i.test(err.message)
    );
  });

  it("maps empty passwords to validation_error before calling Odoo", async () => {
    const fetchImpl = mock.fn(async () => Response.json({ result: true }));
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });

    await assert.rejects(
      () => adapter.changePassword("sid-1", "", "x"),
      (err) => err instanceof BffError && err.code === "validation_error"
    );
    await assert.rejects(
      () => adapter.changePassword("sid-1", "x", ""),
      (err) => err instanceof BffError && err.code === "validation_error"
    );
    assert.equal(fetchImpl.mock.calls.length, 0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && node --experimental-strip-types --import ./scripts/test-env.mjs --test tests/odoo-adapter.test.mjs`

Expected: FAIL — `changePassword` is not a function / missing method.

- [ ] **Step 3: Add interface method**

In `web/src/lib/bff/backend-client.ts`, after `validateSession`:

```ts
  changePassword(
    odooSessionId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void>;
```

- [ ] **Step 4: Implement `OdooAdapter.changePassword`**

Add after `logout` in `web/src/lib/bff/odoo-adapter.ts`:

```ts
  async changePassword(
    odooSessionId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const current = String(currentPassword || "");
    const next = String(newPassword || "");
    if (!current || !next) {
      throw new BffError(
        "validation_error",
        400,
        "Completá la contraseña actual y la nueva"
      );
    }
    if (current === next) {
      throw new BffError(
        "validation_error",
        400,
        "La nueva contraseña debe ser distinta a la actual"
      );
    }

    // Dedicated call: do NOT use #callKw — its Access Denied → unauthorized
    // mapping would wipe the BFF session on a wrong current password.
    let response: Response;
    try {
      response = await this.#post(
        "/web/dataset/call_kw",
        {
          jsonrpc: "2.0",
          params: {
            model: "res.users",
            method: "change_password",
            args: [current, next],
            kwargs: {},
          },
        },
        odooSessionId
      );
    } catch (cause) {
      this.#mapFetchFailure(cause);
    }

    const payload = (await response.json()) as JsonRpcResponse<unknown>;
    if (payload.error !== undefined) {
      const errorText = this.#describeRpcError(payload.error);
      if (
        /(incorrect|wrong|invalid|actual|current|password|contraseñ)/i.test(
          errorText
        )
      ) {
        throw new BffError(
          "validation_error",
          400,
          "La contraseña actual no es correcta"
        );
      }
      if (/(session|authenticat|unauthoriz)/i.test(errorText)) {
        throw new BffError(
          "unauthorized",
          401,
          "La sesión de Odoo no es válida"
        );
      }
      throw new BffError(
        "odoo_unavailable",
        503,
        `Odoo devolvió un error JSON-RPC${errorText ? `: ${errorText}` : ""}`
      );
    }
  }
```

If the live Odoo version rejects `change_password` args shape, adjust **only** the adapter args (keep the public `changePassword` signature). Prefer verifying once against `servigas_dev` with a throwaway password in smoke.

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd web && node --experimental-strip-types --import ./scripts/test-env.mjs --test tests/odoo-adapter.test.mjs`

Expected: PASS for `OdooAdapter.changePassword`.

- [ ] **Step 6: Commit**

```bash
git add web/src/lib/bff/backend-client.ts web/src/lib/bff/odoo-adapter.ts web/tests/odoo-adapter.test.mjs
git commit -m "feat(web): changePassword en OdooAdapter vía BFF"
```

---

### Task 2: API `POST /api/auth/change-password`

**Files:**
- Create: `web/src/pages/api/auth/change-password.ts`
- Test: `web/tests/api-routes.test.mjs`

**Interfaces:**
- Consumes: `getBackend().changePassword`, `requireOdooSession`, `sessionStore.destroy`, `clearBffCookie`, `getBackend().logout`
- Produces: HTTP `{ ok: true }` on success; safe error JSON otherwise

- [ ] **Step 1: Write failing API tests**

Add imports at top of `web/tests/api-routes.test.mjs`:

```js
import { POST as postChangePassword } from "../src/pages/api/auth/change-password.ts";
```

Append tests:

```js
describe("POST /api/auth/change-password", () => {
  it("returns 401 without BFF session", async () => {
    const response = await postChangePassword({
      cookies: new FakeCookies(),
      request: new Request("http://localhost/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: "a",
          newPassword: "b",
        }),
      }),
    });
    assert.equal(response.status, 401);
  });

  it("validates required passwords", async () => {
    const cookies = new FakeCookies();
    const bffSid = sessionStore.create("odoo", {
      uid: 1,
      name: "A",
      login: "a",
    });
    cookies.values.set(BFF_COOKIE, bffSid);
    try {
      const response = await postChangePassword({
        cookies,
        request: new Request("http://localhost/api/auth/change-password", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ currentPassword: "", newPassword: "" }),
        }),
      });
      assert.equal(response.status, 400);
      const body = await response.json();
      assert.equal(body.error.code, "validation_error");
      assert.equal(sessionStore.get(bffSid)?.odooSessionId, "odoo");
    } finally {
      sessionStore.destroy(bffSid);
    }
  });

  it("changes password then destroys BFF session and clears cookie", async () => {
    const cookies = new FakeCookies();
    const bffSid = sessionStore.create("odoo-sid", {
      uid: 2,
      name: "Admin",
      login: "admin",
    });
    cookies.values.set(BFF_COOKIE, bffSid);
    const calls = [];
    __setBackendForTests({
      changePassword: async (...args) => {
        calls.push(["changePassword", ...args]);
      },
      logout: async (...args) => {
        calls.push(["logout", ...args]);
      },
    });
    try {
      const response = await postChangePassword({
        cookies,
        request: new Request("http://localhost/api/auth/change-password", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            currentPassword: "old",
            newPassword: "new",
          }),
        }),
      });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { ok: true });
      assert.deepEqual(calls, [
        ["changePassword", "odoo-sid", "old", "new"],
        ["logout", "odoo-sid"],
      ]);
      assert.equal(sessionStore.get(bffSid), undefined);
      assert.ok(cookies.deleteCalls.some((c) => c.name === BFF_COOKIE));
    } finally {
      __setBackendForTests(undefined);
    }
  });

  it("keeps BFF session when current password is wrong", async () => {
    const cookies = new FakeCookies();
    const bffSid = sessionStore.create("odoo-sid", {
      uid: 2,
      name: "Admin",
      login: "admin",
    });
    cookies.values.set(BFF_COOKIE, bffSid);
    __setBackendForTests({
      changePassword: async () => {
        throw new BffError(
          "validation_error",
          400,
          "La contraseña actual no es correcta"
        );
      },
    });
    try {
      const response = await postChangePassword({
        cookies,
        request: new Request("http://localhost/api/auth/change-password", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            currentPassword: "bad",
            newPassword: "new",
          }),
        }),
      });
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), {
        error: {
          code: "validation_error",
          message: "La contraseña actual no es correcta",
        },
      });
      assert.equal(sessionStore.get(bffSid)?.odooSessionId, "odoo-sid");
    } finally {
      __setBackendForTests(undefined);
      sessionStore.destroy(bffSid);
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd web && node --experimental-strip-types --import ./scripts/test-env.mjs --test tests/api-routes.test.mjs`

Expected: FAIL — cannot import `change-password.ts`.

- [ ] **Step 3: Create the route**

Create `web/src/pages/api/auth/change-password.ts`:

```ts
import type { APIRoute } from "astro";
import { BffError } from "../../../lib/bff/errors.ts";
import { getBackend } from "../../../lib/bff/get-backend.ts";
import {
  bffErrorResponse,
  clearBffCookie,
  json,
  requireOdooSession,
} from "../../../lib/bff/http.ts";
import { sessionStore } from "../../../lib/bff/session-store.ts";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { bffSid, odooSessionId } = requireOdooSession(cookies);

    let body: { currentPassword?: unknown; newPassword?: unknown };
    try {
      body = (await request.json()) as {
        currentPassword?: unknown;
        newPassword?: unknown;
      };
    } catch {
      throw new BffError("validation_error", 400, "JSON inválido");
    }

    const currentPassword = String(body.currentPassword || "");
    const newPassword = String(body.newPassword || "");
    if (!currentPassword || !newPassword) {
      throw new BffError(
        "validation_error",
        400,
        "Completá la contraseña actual y la nueva"
      );
    }
    if (currentPassword === newPassword) {
      throw new BffError(
        "validation_error",
        400,
        "La nueva contraseña debe ser distinta a la actual"
      );
    }

    const backend = getBackend();
    await backend.changePassword(
      odooSessionId,
      currentPassword,
      newPassword
    );
    await backend.logout(odooSessionId);
    sessionStore.destroy(bffSid);
    clearBffCookie(cookies);
    return json({ ok: true });
  } catch (err) {
    return bffErrorResponse(err, cookies);
  }
};
```

- [ ] **Step 4: Run API tests**

Run: `cd web && node --experimental-strip-types --import ./scripts/test-env.mjs --test tests/api-routes.test.mjs`

Expected: PASS for the new describe block.

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/api/auth/change-password.ts web/tests/api-routes.test.mjs
git commit -m "feat(web): API change-password con logout post-éxito"
```

---

### Task 3: UI `/settings` — perfil + formulario

**Files:**
- Modify: `web/src/pages/settings.astro`
- Test: `web/tests/shell-ui.test.mjs`

**Interfaces:**
- Consumes: `requireOdooSession` → `session.name`, `session.login`; `POST /api/auth/change-password`
- Produces: UI glass con tres secciones; redirect a `/login?changed=1` on success

- [ ] **Step 1: Update failing UI contract tests**

In `web/tests/shell-ui.test.mjs`, replace the settings assertions in `renders Apps and Settings landings` with:

```js
  it("renders Apps and Settings landings", async () => {
    const apps = await source("pages/apps.astro");
    const settings = await source("pages/settings.astro");
    assert.match(apps, /Aplicaciones/);
    assert.match(apps, /href=\"\/\"/);
    assert.match(settings, /Ajustes/);
    assert.match(settings, /Tu cuenta/);
    assert.match(settings, /Cambiar contraseña/);
    assert.match(settings, /\/api\/auth\/change-password/);
    assert.match(settings, /login\?changed=1/);
    assert.match(settings, /\/lists\/integrations/);
    assert.doesNotMatch(settings, /todavía no está disponible/);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd web && node --experimental-strip-types --import ./scripts/test-env.mjs --test tests/shell-ui.test.mjs`

Expected: FAIL — settings still has stub copy / missing form strings.

- [ ] **Step 3: Rewrite `settings.astro`**

Replace the page content (keep `ShellLayout` auth gate). Use `session.name` and `session.login` from `requireOdooSession`:

```astro
---
import ShellLayout from '../layouts/ShellLayout.astro';
import { invalidateBffSession, requireOdooSession } from '../lib/bff/http.ts';

let userName = '';
let userLogin = '';
try {
	const { session } = requireOdooSession(Astro.cookies);
	userName = session.name || session.login;
	userLogin = session.login || '';
} catch {
	invalidateBffSession(Astro.cookies);
	return Astro.redirect('/login');
}
---

<ShellLayout title="Ajustes | Servigas" active="home" userName={userName}>
	<main class="sg-landing">
		<header>
			<p>Inicio</p>
			<h1>Ajustes</h1>
			<p class="sg-landing-lead">
				Gestioná tu cuenta. Otras configuraciones de empresa siguen en Integraciones.
			</p>
		</header>

		<section class="sg-landing-card sg-glass" aria-labelledby="settings-account-title">
			<strong id="settings-account-title">Tu cuenta</strong>
			<dl class="sg-settings-dl">
				<div>
					<dt>Nombre</dt>
					<dd>{userName}</dd>
				</div>
				<div>
					<dt>Usuario</dt>
					<dd>{userLogin}</dd>
				</div>
			</dl>
		</section>

		<section class="sg-landing-card sg-glass" aria-labelledby="settings-password-title">
			<strong id="settings-password-title">Cambiar contraseña</strong>
			<p>Después de guardar vas a tener que ingresar de nuevo con la clave nueva.</p>
			<form data-change-password-form class="sg-settings-form">
				<label>
					<span>Contraseña actual</span>
					<input
						class="sg-focus-ring"
						name="currentPassword"
						type="password"
						autocomplete="current-password"
						required
					/>
				</label>
				<label>
					<span>Nueva contraseña</span>
					<input
						class="sg-focus-ring"
						name="newPassword"
						type="password"
						autocomplete="new-password"
						required
					/>
				</label>
				<label>
					<span>Confirmar nueva contraseña</span>
					<input
						class="sg-focus-ring"
						name="confirmPassword"
						type="password"
						autocomplete="new-password"
						required
					/>
				</label>
				<p class="sg-settings-error" data-change-password-error role="alert" hidden></p>
				<button class="sg-landing-cta sg-focus-ring" type="submit">
					Guardar contraseña
				</button>
			</form>
		</section>

		<section class="sg-landing-card sg-glass">
			<strong>Integraciones</strong>
			<p>Factura Web y portales de proveedores.</p>
			<a class="sg-landing-cta sg-focus-ring" href="/lists/integrations">Ver integraciones →</a>
		</section>

		<p class="sg-landing-back">
			<a href="/">← Volver al inicio</a>
		</p>
	</main>
</ShellLayout>

<script>
	const form = document.querySelector<HTMLFormElement>('[data-change-password-form]');
	const error = document.querySelector<HTMLElement>('[data-change-password-error]');
	const submit = form?.querySelector<HTMLButtonElement>('button[type="submit"]');

	form?.addEventListener('submit', async (event) => {
		event.preventDefault();
		if (!submit || !error) return;

		error.hidden = true;
		const data = new FormData(form);
		const currentPassword = String(data.get('currentPassword') || '');
		const newPassword = String(data.get('newPassword') || '');
		const confirmPassword = String(data.get('confirmPassword') || '');

		if (!currentPassword || !newPassword) {
			error.textContent = 'Completá la contraseña actual y la nueva';
			error.hidden = false;
			return;
		}
		if (newPassword !== confirmPassword) {
			error.textContent = 'La confirmación no coincide con la nueva contraseña';
			error.hidden = false;
			return;
		}
		if (currentPassword === newPassword) {
			error.textContent = 'La nueva contraseña debe ser distinta a la actual';
			error.hidden = false;
			return;
		}

		submit.disabled = true;
		try {
			const response = await fetch('/api/auth/change-password', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ currentPassword, newPassword }),
			});
			const payload = await response.json();
			if (!response.ok) {
				throw new Error(payload?.error?.message || 'No se pudo cambiar la contraseña');
			}
			window.location.assign('/login?changed=1');
		} catch (cause) {
			error.textContent =
				cause instanceof Error ? cause.message : 'No se pudo cambiar la contraseña';
			error.hidden = false;
		} finally {
			submit.disabled = false;
		}
	});
</script>
```

Reuse existing `.sg-landing*` styles; add minimal styles for `.sg-settings-dl`, `.sg-settings-form`, inputs and `.sg-settings-error` matching login/list glass tokens (`--sg-glass-border`, `--sg-text-muted-dark`).

- [ ] **Step 4: Run UI tests**

Run: `cd web && node --experimental-strip-types --import ./scripts/test-env.mjs --test tests/shell-ui.test.mjs`

Expected: PASS for settings landing test.

- [ ] **Step 5: Commit**

```bash
git add web/src/pages/settings.astro web/tests/shell-ui.test.mjs
git commit -m "feat(web): perfil y cambio de contraseña en Ajustes"
```

---

### Task 4: Banner en `/login?changed=1`

**Files:**
- Modify: `web/src/pages/login.astro`
- Test: `web/tests/shell-ui.test.mjs`

**Interfaces:**
- Consumes: `Astro.url.searchParams.get("changed")`
- Produces: mensaje visible “Contraseña actualizada. Ingresá con la nueva.”

- [ ] **Step 1: Extend login UI test**

In the existing login test (`posts login credentials...`), add:

```js
    assert.match(login, /changed/);
    assert.match(login, /Contraseña actualizada/);
```

- [ ] **Step 2: Run to verify fail**

Run: `cd web && node --experimental-strip-types --import ./scripts/test-env.mjs --test tests/shell-ui.test.mjs`

Expected: FAIL — login lacks banner copy.

- [ ] **Step 3: Add banner to `login.astro`**

In frontmatter:

```ts
const passwordChanged = Astro.url.searchParams.get('changed') === '1';
```

Inside the login panel, above the form:

```astro
{passwordChanged && (
  <p class="sg-login-success" role="status">
    Contraseña actualizada. Ingresá con la nueva.
  </p>
)}
```

Style `.sg-login-success` with muted success tone using existing CSS variables (no new palette).

- [ ] **Step 4: Run full test suite**

Run: `cd web && npm test`

Expected: all green.

- [ ] **Step 5: Manual smoke (stack up)**

1. `npm run odoo:ensure` + Astro on `:4321` (si no están).
2. Login → Inicio → tile Ajustes → `/settings`.
3. Verificar nombre/login.
4. Cambiar clave con actual correcta → redirect login con banner → login con clave nueva.
5. DevTools Network: solo `:4321`, nunca `:8070`.

- [ ] **Step 6: Commit**

```bash
git add web/src/pages/login.astro web/tests/shell-ui.test.mjs
git commit -m "feat(web): aviso post-cambio de contraseña en login"
```

- [ ] **Step 7: Mark spec approved**

In `docs/superpowers/specs/2026-07-24-astro-settings-change-password-design.md`, set:

```md
**Estado:** approved
```

```bash
git add docs/superpowers/specs/2026-07-24-astro-settings-change-password-design.md
git commit -m "docs: aprobar spec Ajustes change-password"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Bloque Tu cuenta read-only | Task 3 |
| Form cambiar contraseña | Task 3 |
| Conservar Integraciones | Task 3 |
| Lead copy nueva | Task 3 |
| `POST /api/auth/change-password` | Task 2 |
| Adapter Odoo server-side | Task 1 |
| Logout post-éxito + `/login?changed=1` | Tasks 2–4 |
| Sesión viva si clave actual mala | Tasks 1–2 |
| No browser → `:8070` | Tasks 1–3 (architecture) |
| Tests adapter/API/UI | Tasks 1–4 |

## Placeholder / consistency self-review

- Sin TBD / “similar to Task N”.
- Firma estable: `changePassword(odooSessionId, currentPassword, newPassword): Promise<void>`.
- Body HTTP: `currentPassword` / `newPassword` en API, UI y tests.
- Error clave mala: `validation_error` + mensaje passthrough (no `unauthorized`).
