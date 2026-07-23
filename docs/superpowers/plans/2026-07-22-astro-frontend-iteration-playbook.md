# Playbook: iterar el frontend Astro (BFF → UI nativa)

**Fecha:** 2026-07-22  
**Estado:** guía de proceso (meta-plan)  
**Ejemplo ya hecho:** lista Productos (`2026-07-22-astro-native-products-list-*`)

## Qué skill usar (respuesta corta)

| Momento | Skill | Para qué |
|---------|--------|----------|
| Definir *qué* y *por qué* del próximo slice | **`brainstorming`** | Preguntas, enfoques, diseño, spec en `docs/superpowers/specs/` |
| Definir *cómo* implementarlo paso a paso | **`writing-plans`** | Plan con tasks/checkbox; cada task nace en rojo (test) |
| Implementar test-first | **`tdd`** | Red → green por seam; un test / un cambio mínimo |
| Ejecutar el plan | **`subagent-driven-development`** (recomendado) o **`executing-plans`** | Task por task; el implementador aplica `tdd` |
| Contratos OWL / qué portar | **`servigas-owl-frontend`** | Inventario RPC, componentes, checklist rewrite |
| Molde BFF Astro (límites) | **`astro-bff-shell`** | Browser → BFF → BackendClient → Adapter |
| Antes de decir “listo” | **`verification-before-completion`** | Suite + smoke real |
| Backlog en issues (opcional) | **`to-issues`** / **`to-prd`** | Partir el roadmap en issues grabables |

**Para planificar el proceso de cada feature:** **`writing-plans`**.  
**Para *codificar* cada task del plan:** **`tdd`** (obligatorio en este playbook).  
**Para el *qué* antes de codear:** **`brainstorming`**.

Playlist fija por slice:

```text
brainstorming → writing-plans → subagent-driven-development
                                      │
                                      └── cada task: tdd (red → green)
         ↑                    ↑
 servigas-owl-frontend   astro-bff-shell
         ↓
 verification-before-completion
```

## Regla de oro (igual que Productos)

1. **Astro pide** al BFF.  
2. **BFF traduce** con `BackendClient` / `OdooAdapter`.  
3. **Astro pinta** (Liquid Glass / listas densas OWL).  
4. **Nunca** iframe/proxy Odoo en el camino feliz.  
5. **Allowlist** de rutas/listas (sin `?model=` libre).  
6. Slice vertical pequeño: un click → una pantalla → smoke.

## Plantilla de un slice (15–90 min de diseño + N tasks)

### A. Brainstorming (obligatorio antes de code)

- Una pregunta a la vez hasta cerrar: pantalla, campos, done, no-objetivos.
- Spec corto: `docs/superpowers/specs/YYYY-MM-DD-<slice>-design.md`
- Aprobación explícita del usuario.

### B. Writing-plans

- Plan: `docs/superpowers/plans/YYYY-MM-DD-<slice>.md`
- Cada task declara: **seams**, **test file**, pasos red → green
- File map + done criteria (suite + smoke)
- No agrupar “todos los tests primero”: una task = un seam vertical

### C. Implementación (con `/tdd`)

- Invocar skill **`tdd`** en cada task de código.
- Confirmar seams del slice (tabla abajo) antes del primer test.
- Extender puerto (`BackendClient`) solo si hace falta un nuevo verbo.
- Preferir reusar `getRecordList` / allowlist antes de inventar APIs.
- UI: portar tokens/patrones OWL; contratos UI por source-assert (como `shell-ui.test.mjs`).
- Smoke al final: login → camino → dato real visible (no sustituye unit tests).

### D. Cierre

- Checklist `astro-bff-shell` aplicable al slice.
- `verification-before-completion`: `npm test` + smoke.
- Actualizar README/`CONTEXT` solo si cambia el camino feliz documentado.
- Commit solo si el usuario lo pide.

## TDD: seams y tests mínimos por slice

Suite: `web/` → `npm test` (`node --experimental-strip-types --test tests/**/*.test.mjs`).

### Seams acordados (Astro BFF)

| Seam | Qué prueba | Dónde suele vivir |
|------|------------|-------------------|
| **Allowlist / nav** | click/action → ruta Astro correcta; desconocido → coming_soon | `tests/record-lists.test.mjs`, `tests/tile-nav.test.mjs` |
| **Adapter / puerto** | JSON-RPC correcto, mapeo a payload, errores `401`/`404`/`503` | `tests/odoo-adapter.test.mjs` |
| **API route** (si hay endpoint nuevo) | sesión requerida; 404 allowlist; no filtra `session_id` | `tests/api-routes.test.mjs` o test del route |
| **Contrato UI** | página usa BFF + componentes shell; navegación al path | `tests/shell-ui.test.mjs` |
| **Smoke** (manual o e2e liviano) | dato real en browser, sin iframe | checklist DoD |

Reglas `tdd` en este repo:

- Red before green; un test → implementación mínima → siguiente test.
- Comportamiento en la interfaz pública, no internals del adapter.
- Expected values literales del spec/fixtures (no tautologías).
- No mockear lo que no es el seam bajo prueba; el adapter se mockea en `fetch`, no al revés.

### Checklist mínima (copiar en cada plan de slice)

En el `writing-plans` del slice, marcar seams activos y exigir al menos:

- [ ] **Nav/allowlist:** 1 test camino feliz + 1 rechazo/coming_soon  
- [ ] **Adapter:** 1 test payload mapeado + 1 error (`not_found` / `unauthorized` / `odoo_unavailable` según el slice)  
- [ ] **UI contract:** página/componente referencia BFF + markup clave (tabla, thumb, KPI, etc.)  
- [ ] **API** (solo si hay route nueva): 401 sin cookie  
- [ ] **Smoke:** camino documentado en el plan (URL + qué se debe ver)

Ejemplo Productos (referencia): allowlist + `getRecordList` + hub→`list` + página `RecordTable` + smoke 50 filas.

## Backlog sugerido (orden de iteración)

Prioridad = valor operativo × reuso del patrón Productos.

| # | Slice | Patrón a reusar | Backend (orientativo) | UI OWL a copiar |
|---|--------|-----------------|------------------------|-----------------|
| 1 | ~~Lista Productos~~ | allowlist + `getRecordList` + `RecordTable` | `product.template` search_read | `servigas_list` |
| 2 | ~~Fotos en lista Productos~~ | `image_url` + `/api/media/...` | binary Odoo allowlisted | thumbs densas |
| 3 | ~~KPI / metric en tiles y cards~~ | `sg-tile-kpi` | `value` launcher/hub | tiles hub OWL |
| 4 | ~~Lista Sin stock~~ | allowlist | `product.product` qty≤0 | `RecordTable` |
| 5 | ~~Lista Variantes SKU~~ | allowlist | `product.product` | idem |
| 6 | ~~Lista Transferencias~~ | allowlist | `stock.picking` | idem |
| 7 | ~~Detalle producto~~ | `/lists/inventory/products/:id` | `read` + media | ficha densa |
| 8 | ~~Hubs sales/purchase/accounting~~ | `hubs/[app]` + `getHub` | `sg.hub.card` | hub grid |
| 9 | ~~Búsqueda / paginación~~ | `ListToolbar` + query | limit/offset + ilike | toolbar |
| 10 | ~~Retirar opción B~~ | eliminado work/proxy | — | — |

Cada fila = **un** ciclo brainstorming → writing-plans → implement con **`tdd`**.

## Definition of Ready (antes de writing-plans)

- [ ] Pantalla y click de entrada claros  
- [ ] Campos mínimos y allowlist  
- [ ] No-objetivos (qué no es este slice)  
- [ ] Spec aprobado  
- [ ] Referencia OWL (archivo SCSS/componente) nombrada  

## Definition of Done (antes de cerrar slice)

- [ ] Checklist TDD del slice completada (seams)  
- [ ] `npm test` verde  
- [ ] Smoke: dato real sin iframe  
- [ ] Errores 401/503/vacío manejados como shell actual  
- [ ] Navegación allowlisted sin “Próximamente” solo donde corresponda  

## Cómo pedirlo en el chat (prompts útiles)

**Siguiente slice (diseño):**  
> Usá brainstorming. Próximo slice: fotos en lista Productos. Spec corto, mismo patrón BFF.

**Después del ok al spec:**  
> Usá writing-plans sobre el spec. Cada task con TDD. Implementá con subagent-driven-development y skill tdd.

**Solo implementar un plan ya escrito:**  
> Ejecutá el plan X con tdd (red-green por task) y verification-before-completion al cerrar.

**Solo backlog en issues:**  
> Usá to-issues sobre este playbook; un issue por fila del backlog.

## Anti-patrones

- Empezar por “traé todo el inventario” sin allowlist.  
- Mezclar iframe Odoo “mientras tanto”.  
- Planificar 5 listas en un solo plan (romper en slices).  
- Saltar brainstorming “porque ya sabemos”.  
- Acoplar handlers Astro a JSON-RPC crudo (siempre `BackendClient`).  
- Escribir todos los tests del slice y después toda la implementación (horizontal slicing — lo prohíbe `tdd`).  
- Tests acoplados a internals o tautológicos.  
- Dar por cerrado solo con smoke, sin unit tests del seam nuevo.
