# Design: Lista de Productos nativa en Astro (BFF → UI)

**Fecha:** 2026-07-22  
**Estado:** approved (diseño verbal); pendiente review del archivo  
**Repo:** servigas  
**Precede:** `2026-07-22-astro-bff-shell-design.md` (Fase A spike)  
**Supersede parcial:** clicks de hub hacia proxy/iframe (opción B) — fuera de alcance

## Problema

El shell Astro ya muestra login, launcher y hub Inventario con datos reales vía BFF. Al abrir una card (p. ej. Productos) aún no hay una pantalla operativa **pintada en Astro**. La opción B (iframe + `/odoo-proxy`) no cumple el objetivo: queremos que el frontend Astro solicite datos y renderice toda la UI.

## Objetivos

1. Click **Productos** en hub Inventario → página Astro con lista real de `product.template`.
2. Datos solo por BFF (`BackendClient` → `OdooAdapter` → JSON-RPC); el browser nunca habla con Odoo.
3. UI con paridad Liquid Glass / listas densas OWL (mismo criterio que login y home): tokens `--sg-*`, shell + tabla densa estilo `servigas_list.scss`.
4. Dejar el patrón listo para otras cards (Sin stock, Transferencias) sin implementarlas en este slice.

## No objetivos

- Proxy `/odoo-proxy`, página `/work`, iframe de Odoo (opción B)
- Formulario de alta/edición de producto
- Kanban, filtros avanzados, búsqueda server-side, paginación infinita
- Paridad de las 4 apps del rail
- Mostrador / POS / Recorrido en Astro
- REST público en Odoo

## Decisiones

| Tema | Decisión |
|------|----------|
| Primer slice | Lista **Productos** (`product.template`, card resumen Inventario) |
| UI | Copiar OWL: `ShellLayout` + cabecera hub + tabla densa (no glass por fila) |
| Datos | Extender `BackendClient` con listado de registros; adapter vía `search_read` / `web_search_read` |
| Navegación hub | `resolveTileNavigation` / click card → ruta Astro de lista (no “Próximamente”, no `/work`) |
| Opción B | No seguir; código proxy/work puede quedar huérfano o retirarse en el plan de implementación |
| Alcance filas | Primeras N filas (límite fijo, p. ej. 50); contador total si Odoo lo expone sin costo extra |

## Arquitectura

```text
Browser (Astro UI — lista Productos)
    │  cookie httpOnly sg_bff_sid
    ▼
Astro BFF
    │  BackendClient.listRecords(...)  (o nombre equivalente)
    ▼
OdooAdapter ── JSON-RPC call_kw ──► Odoo 19
```

Misma frontera que el spike: handlers y páginas dependen del puerto, no de Odoo crudo.

## Contratos

### Input (desde la card del hub)

La card ya trae `action` con al menos:

- `type`: `ir.actions.act_window`
- `res_model`: `product.template`
- `domain` / `context` (si existen)
- `view_mode` (ignorado para render; Astro siempre lista)

La navegación Astro puede pasar un **slug estable** (`products`) o `cardId` + app; el BFF resuelve modelo/dominio de forma segura (allowlist), no acepta modelo arbitrario desde el querystring del browser.

**Decisión explícita:** ruta fija allowlisted:

- Página: `/lists/inventory/products`
- API: `GET /api/lists/inventory/products`
- El adapter aplica el dominio de la card Productos (activo / plantillas) alineado al hub; no `?model=` libre.

### Output (lista)

```ts
type RecordListPayload = {
  title: string;
  model: string;
  total: number; // count o length si count no está disponible
  columns: { key: string; label: string }[];
  rows: Record<string, string | number | boolean | null>[];
};
```

Campos mínimos por fila (Productos):

| key | Origen Odoo (orientativo) | UI |
|-----|---------------------------|-----|
| `id` | `id` | no visible / key |
| `name` | `name` | Nombre |
| `default_code` | `default_code` | Referencia (accent) |
| `qty_available` | si el modelo lo permite; si no, omitir columna | Stock |
| `active` | `active` | Activo |

Si un campo no está disponible en `product.template` en este entorno, se omite la columna (no romper la página).

## Componentes

### BFF

| Pieza | Cambio |
|-------|--------|
| `BackendClient` | Nuevo método de listado allowlisted |
| `OdooAdapter` | `search_read` / count con sesión Odoo |
| `GET /api/lists/inventory/products` | Auth BFF + payload tipado |
| Errores | Mismos códigos: `401` → login; `503` → mensaje genérico |

### UI Astro

| Pieza | Responsabilidad |
|-------|-----------------|
| `pages/lists/inventory/products.astro` | SSR: sesión + fetch lista + render |
| `RecordTable` (o equivalente) | Tabla densa Liquid Glass lista |
| Cabecera | Título “Productos”, hint, total, “← Volver” al hub |
| Hub click | Navegar a `/lists/inventory/products` para esa card |

Estilos: portar reglas relevantes de `servigas_list.scss` a CSS del starter (`--sg-*`, sticky thead, hover flame, sin glass por fila).

## Flujos

1. Usuario autenticado en hub Inventario.
2. Click card Productos → `/lists/inventory/products`.
3. Página SSR llama BFF/adapter → filas.
4. Render tabla; vacío / error con el mismo tono que launcher.

## Errores

| Caso | Comportamiento |
|------|----------------|
| Sin sesión / Odoo unauthorized | Invalidar BFF → `/login` |
| Odoo caído | Mensaje genérico en página (sin detalle upstream) |
| Lista vacía | Estado vacío claro (“No hay productos”) |
| Card distinta (Variantes, etc.) | Sigue “Próximamente” en este slice |

## Testing

- Unit: adapter mapea filas/columnas; allowlist rechaza rutas desconocidas.
- Contract UI: página usa `ShellLayout`, tabla, navegación desde hub.
- Smoke manual: login → Inventario → Productos → filas reales sin iframe.

## Done

- Lista Productos visible 100% en Astro con look OWL.
- Ningún iframe Odoo en el camino feliz.
- Tests del slice en verde + smoke contra `servigas_dev`.
