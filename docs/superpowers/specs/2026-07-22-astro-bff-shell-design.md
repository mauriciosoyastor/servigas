# Design: Shell Astro + BFF (Servigas) y molde reutilizable

**Fecha:** 2026-07-22  
**Estado:** approved  
**Repo:** servigas  
**Skills de dominio:** `servigas-owl-frontend`, luego skill personal de molde BFF

## Problema

El shell operativo Servigas (Launcher, Rail, Hubs, Liquid Glass) vive hoy en OWL dentro de Odoo. Queremos un frontend Astro que consuma los mismos contratos de dominio vía un BFF, y dejar el patrón listo para reutilizar en próximos proyectos — sin reescribir formularios Odoo ni el Mostrador en este ciclo.

## Objetivos

1. **Fase A — Spike Servigas:** login en Astro; BFF con sesión Odoo server-side; Launcher + Rail + al menos un Hub con payloads reales; UI con paridad visual razonable Liquid Glass.
2. **Fase B — Molde:** extraer playbook (skill personal Cursor) + piezas genéricas del starter en `web/`, con el adaptador Odoo como ejemplo Servigas.

## No objetivos (este diseño)

- Embed / deep-link a listas y formularios Odoo
- Recorrido (onboarding) en Astro
- Reescribir el Mostrador (POS) en Astro
- Paridad de los 4 hubs obligatoria en el spike (hub real del spike: **inventory**; el resto del rail puede linkear stubs o “Próximamente”)
- Pixel-perfect / motion completo
- Repo template separado desde el día 1
- REST versionado público en Odoo

## Decisiones cerradas en brainstorming

| Tema | Decisión |
|------|----------|
| Alcance del spec | Ambos (spike + molde), orden A → B |
| Done del spike | Login + launcher + rail + un hub con datos reales |
| Auth | Login en BFF; cookie propia; sesión Odoo solo server-side |
| Clicks no-hub | “Próximamente” (sin abrir Odoo) |
| UI | Paridad visual razonable Liquid Glass (`--sg-*`, brand Servigas) |
| Molde | Skill personal Cursor + starter en `web/`; extracción a template más adelante |
| Arquitectura | `BackendClient` + `OdooAdapter` (no RPC crudo en handlers; no BFF proceso aparte) |

## Arquitectura

```text
Browser (Astro UI)
    │  cookie httpOnly del BFF (no cookie Odoo en el browser)
    ▼
Astro server (BFF)
    │  BackendClient: login / logout / getSession / getLauncher / getHub
    ▼
OdooAdapter ── JSON-RPC / session Odoo ──► Odoo 19 (servigas_dev)
```

- El browser solo habla con Astro (`/api/*` y páginas).
- Los handlers Astro dependen del puerto `BackendClient`, no de Odoo.
- Contratos de payload alineados a `.cursor/skills/servigas-owl-frontend/inventory/rpc-contracts.md` (campos Tile/Card/Action sin redefinir).

## Componentes

### BFF (server)

| Módulo | Responsabilidad |
|--------|-----------------|
| `BackendClient` | Puerto: `login`, `logout`, `getSession`, `getLauncher`, `getHub(app, section?)` |
| `OdooAdapter` | Implementación vía JSON-RPC + sesión Odoo (`get_launcher_payload`, `get_hub_payload`) |
| `sessionStore` | Cookie BFF ↔ sesión Odoo en memoria/store server |
| API routes | `/api/auth/*`, `/api/launcher`, `/api/hub/:app` |

### UI (Astro)

| Pieza | Responsabilidad |
|-------|-----------------|
| `LoginPage` | Form usuario/clave |
| `ShellLayout` | Canvas + rail |
| `RailNav` | Home + apps; active por pathname |
| `LauncherPage` | Grid de tiles |
| `HubPage` | Cards/groups de un app (`/hubs/:app`) |
| `TileCard` + empty/loading/error/próximamente | Presentación |

### Dominio

- Shapes y semántica de `rpc-contracts.md` / ADRs shell aplicables.
- Portar helpers puros del inventario OWL **solo** si el spike los necesita.

### Ubicación código

- Spike y starter: `web/` en este repo (Astro ya scaffolded).
- Fase B: skill personal (p. ej. playbook BFF/shell); genérico extraído de `web/`; `OdooAdapter` permanece como ejemplo Servigas.

## Flujos

### Login

1. `POST /api/auth/login` `{ login, password }`
2. `OdooAdapter.login` → sesión Odoo
3. Cookie httpOnly BFF + entrada en `sessionStore`
4. Redirect a `/`

### Launcher

1. `GET /api/launcher` (con cookie BFF)
2. `get_launcher_payload` → `{ tiles }`
3. Click tile `target_type === "hub"` → `/hubs/{app}`
4. Otro target → UI “Próximamente”

### Hub

1. `GET /api/hub/:app?section=summary`
2. `get_hub_payload(app, section)` → cards/groups
3. Click card → “Próximamente” en este spike

### Rail

- Links a `/` y hubs conocidos; active = pathname; sin bus OWL.

### Logout

- `POST /api/auth/logout` → invalida store + cookie → `/login`

## Errores

| Caso | Comportamiento |
|------|----------------|
| Sin sesión / inválida | API `401`; UI → `/login` |
| Login incorrecto | `401` mensaje genérico |
| Odoo caído / timeout | `503` + mensaje amigable |
| App/hub desconocido | `404` |
| Payload vacío/parcial | Empty state; shell no crashea |
| Respuestas Odoo | Nunca exponer stack/crudo al browser |

## Testing

- Unit: adaptador / mapeo de errores (fetch mock).
- Unit: resolución tile hub → path.
- Fixtures JSON alineados a `rpc-contracts.md` (launcher + un hub).
- Verificación manual o e2e mínimo: login → tiles → rail → hub.
- Fuera de scope: embed Odoo, recorrido, POS.

## Criterios de éxito

### Fase A (spike)

- [ ] Usuario operativo puede loguearse desde Astro contra Odoo real de dev.
- [ ] Home muestra tiles reales del launcher.
- [ ] Rail navega a home y al hub implementado.
- [ ] Hub muestra cards/KPI reales de `get_hub_payload`.
- [ ] Clicks no-hub muestran “Próximamente”.
- [ ] UI reconoce Liquid Glass Servigas (tokens/brand) a nivel razonable.
- [ ] Tests unitarios del adaptador/rutas críticas pasan.

### Fase B (molde)

- [ ] Skill personal documenta el playbook (BFF + `BackendClient` + spike checklist).
- [ ] Piezas genéricas identificadas/extraídas del starter; Odoo como adaptador de ejemplo.
- [ ] Un agente puede arrancar un proyecto nuevo siguiendo la skill sin leer todo Servigas.

## Orden de entrega sugerido

1. Puerto `BackendClient` + `OdooAdapter.login` + session cookie.
2. `/api/launcher` + `LauncherPage`.
3. `ShellLayout` + `RailNav`.
4. `/api/hub/:app` + `HubPage` para **inventory**.
5. Pulido visual Liquid Glass razonable.
6. Tests + checklist de éxito Fase A.
7. Fase B: skill personal + extracción genérica.

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Auth/sesión Odoo frágil (CSRF, cookies, DB) | Spike de login primero; config explícita URL/DB Odoo en env |
| Drift de contratos vs OWL | Fixtures + skill `servigas-owl-frontend`; no inventar campos |
| Scope creep (4 hubs, embed, recorrido) | No objetivos explícitos arriba |
| Abstracción prematura del molde | Fase B solo después de spike estable |

## Referencias

- `CONTEXT.md` — vocabulario Launcher / Hub / Rail / Mostrador
- `.cursor/skills/servigas-owl-frontend/` — inventario y `rpc-contracts.md`
- `docs/design/liquid-glass-odoo.md`, `docs/design/servigas-brand.md`
- ADRs 0001–0004 (shell/POS entry) según apliquen al spike
- `web/` — host Astro existente
