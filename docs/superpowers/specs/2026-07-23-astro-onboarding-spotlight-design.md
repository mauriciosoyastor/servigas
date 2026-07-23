# Spec — Onboarding spotlight (recorrido mostrador AR)

**Fecha:** 2026-07-23  
**Estado:** approved  
**Rama:** `cursor/astro-onboarding-spotlight-daee`  
**Enfoque:** A — overlay propio (máscara / hueco iluminado) sin librería  
**Voz:** mostrador claro (Argentina, voseo) — misma línea que copy AR

## Problema

Un vendedor nuevo no tiene un recorrido guiado del shell oficial (Astro). ADR 0016 había deferido onboarding; con el go condicional cerrado, el producto pide un tutorial usable en mostrador.

## Decisión

Tour **spotlight** a pantalla completa:

1. Overlay oscuro + **ventana iluminada** sobre el control objetivo.
2. Texto explicativo en jerga argentina.
3. Avance por **Siguiente** (y navegación entre pantallas cuando el paso lo requiere).
4. **Omitir tutorial** (cierra esta sesión; puede volver a aparecer).
5. **No volver a mostrar** (`localStorage`).
6. Recorrido largo en **un solo PR**: inicio → hub → caja POS.

## Efecto visual

- Capa fija full-viewport, `z-index` > toast (`ComingSoonNote` = 40).
- Hueco alineado al `getBoundingClientRect()` del target (+ padding).
- El UI debajo del hueco se ve con iluminación normal; el resto queda oscurecido.
- Globo/tooltip cerca del target: título + cuerpo + “Paso N de M”.
- `prefers-reduced-motion: reduce` → sin animaciones de entrada/spotlight.

## Persistencia (`localStorage`)

| Clave | Significado |
|-------|-------------|
| `sg_tour_done` | `"1"` → no auto-arrancar (terminó o “No volver a mostrar”) |
| `sg_tour_step` | id del paso actual al navegar entre páginas a mitad del tour |
| `sg_tour_skipped_session` | `"1"` → omitido en esta carga de pestaña (opcional `sessionStorage`) |

Comportamiento:

- **No volver a mostrar** → `sg_tour_done=1`, limpia `sg_tour_step`, cierra.
- **Omitir** → cierra sin `done`; usa `sessionStorage` para no reabrir en la misma carga; en otra visita puede volver.
- Tour completo al último paso → setea `sg_tour_done=1`.

## Cuándo arranca

Auto-start si:

- hay sesión shell (página con `ShellLayout`), y
- `sg_tour_done` no está, y
- no hay skip de sesión, y
- existe al menos un target del paso inicial / paso reanudado.

Reanudar: si `sg_tour_step` apunta a un paso de la ruta actual (hub/pos), continuar ahí tras navegación.

## Pasos

| id | Ruta | Selector (`data-tour`) | Título | Cuerpo |
|----|------|--------------------------|--------|--------|
| `home-ops` | `/` | `ops-strip` | Atajos del día | Acá están los atajos del mostrador: caja, cotización y pedido a proveedor. |
| `home-tile` | `/` | `home-tile` (primera tile) | Tus áreas | Desde acá entrás a cada área del negocio (inventario, ventas, compras…). |
| `home-rail` | `/` | `rail-inventory` (o primer rail hub) | Menú lateral | Este menú te lleva a las secciones. Tocá **Siguiente** para mirar Inventario. |
| `hub-card` | `/hubs/inventory` (fallback: primer hub con cards) | `hub-card` (primera card) | Tarjetas del día | Estas tarjetas abren listados y datos que usás en el día a día. |
| `hub-to-pos` | misma hub | `rail-home` o link a `/pos` si hay `data-tour="pos-entry"` en hub; si no, CTA del globo “Ir a la caja” | La caja | Cuando atiendas al cliente, la caja es el mostrador. |
| `pos-ticket` | `/pos` | `pos-ticket` | Armar el ticket | Acá cargás productos al ticket. |
| `pos-cobrar` | `/pos` | `pos-checkout` | Cobrar | Con esto registrás la venta. Listo: ya conocés el recorrido. |

Reglas:

- Si el selector no existe, **saltar** al siguiente paso viable (o al siguiente con navegación).
- Pasos que cambian de ruta: al avanzar, setear `sg_tour_step` y `location.assign` / click programático.
- Copy sin jerga técnica (sin Astro, hub, RFQ, KPI, allowlisted).

## Controles UI

- **Siguiente** (último paso: **Listo**)
- **Omitir tutorial**
- **No volver a mostrar**
- Esc = Omitir
- Clic en el overlay oscuro (fuera del hueco) no avanza (evita cierres accidentales); solo botones / Esc

## Anclaje técnico

**Crear**

- `web/src/components/OnboardingTour.astro` — markup overlay + script
- `web/src/styles/onboarding.css` — mask/spotlight (import desde global o layout)
- `web/src/lib/shell/onboarding-tour.ts` — pasos, storage helpers, resolve next step (testeable)

**Modificar**

- `ShellLayout.astro` — montar `<OnboardingTour />`
- `index.astro` — `data-tour="ops-strip"`
- `TileCard.astro` o index — `data-tour="home-tile"` en primera tile / todas con índice
- `RailNav.astro` — `data-tour` por ítem (`rail-inventory`, `rail-sales`, …, `rail-home`)
- `hubs/[app].astro` — `data-tour="hub-card"` en cards
- `pos.astro` — `data-tour="pos-ticket"`, `data-tour="pos-checkout"`
- Tests shell-ui / unit del módulo tour
- ADR 0016 / CONTEXT: onboarding deja de ser “no-hacemos” para este slice (nota breve)

## Fuera de alcance

- Preferencia por usuario en servidor / BFF
- Tour de listas, fichas, compras profundas, AFIP
- Librería externa (driver.js, etc.)
- Editar labels Odoo de tiles

## Criterios de aceptación

- [x] Overlay oscuro + hueco iluminado sobre target
- [x] Recorrido cruza `/` → hub → `/pos` con reanudación por `sg_tour_step`
- [x] Omitir vs No volver a mostrar se comportan como la tabla de storage
- [x] Copy en español AR de mostrador
- [x] Targets faltantes no rompen el tour (skip)
- [x] `prefers-reduced-motion` respetado
- [x] Suite `web` verde

## Verificación

```bash
cd web && npm test
# Manual: borrar localStorage sg_tour_*, login, recorrer; “No volver a mostrar”; recargar
```

## Self-review

- Sin TBD operativos; pasos y keys definidos.
- Scope = un PR de tour completo; sin server prefs.
- Alineado a voz mostrador AR (#32).
- Actualiza gobernanza ADR/CONTEXT que listaba onboarding como post-go.
