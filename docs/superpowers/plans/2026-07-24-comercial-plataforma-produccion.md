# Comercial plataforma — Plan de producción

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dejar un kit de producción listo en el repo (VO, shot list UI, prompts Veo, checklist de montaje) para generar el comercial 35s 16:9 de la plataforma de gestión.

**Architecture:** El comercial se arma fuera de Cursor (Veo 3.1 + captura UI real + editor). Este plan materializa el spec aprobado en archivos copy-paste listos bajo `docs/marketing/comercial-plataforma/`, sin tocar código de la app.

**Tech Stack:** Google Veo 3.1 (clips 1/2/4), grabación de pantalla del shell Astro (escena 3), CapCut/DaVinci/Runway (montaje), Montserrat + tokens charcoal/flame (cierre).

## Global Constraints

- Formato: 16:9 · ~35s · 1080p
- Vende la **plataforma de gestión**, no brand film retail
- Veo **nunca** inventa UI; pantallas = captura real
- Copy VO final del spec (facilidad + UI personalizada por usuario)
- Spec fuente: `docs/superpowers/specs/2026-07-24-comercial-plataforma-prompts-design.md`
- Español AR (vos)

---

### Task 1: Carpeta del kit + voz en off copy-ready

**Files:**
- Create: `docs/marketing/comercial-plataforma/README.md`
- Create: `docs/marketing/comercial-plataforma/01-voz-en-off.md`

**Interfaces:**
- Consumes: VO final del spec `2026-07-24-comercial-plataforma-prompts-design.md`
- Produces: script de locución listo para grabar + índice del kit

- [ ] **Step 1: Crear README del kit**

Contenido exacto de `docs/marketing/comercial-plataforma/README.md`:

```markdown
# Kit comercial — plataforma de gestión

Video 35s · 16:9 · 1080p. Vende el producto (plataforma), no marca retail.

| Archivo | Uso |
|---------|-----|
| `01-voz-en-off.md` | Locución final + timing |
| `02-shot-list-ui.md` | Grabación de pantallas reales |
| `03-prompts-veo.md` | Prompts Veo 3.1 (escenas 1, 2, 4) |
| `04-montaje-checklist.md` | Ensamble, gráfica, QA export |

Spec: `docs/superpowers/specs/2026-07-24-comercial-plataforma-prompts-design.md`
```

- [ ] **Step 2: Crear archivo de VO**

Contenido exacto de `docs/marketing/comercial-plataforma/01-voz-en-off.md`:

```markdown
# Voz en off — comercial plataforma

**Idioma:** español AR (vos)  
**Duración objetivo:** ~35s  
**Tono:** claro, seguro, cercano; sin gritar “promo”

## Texto final (grabar tal cual)

Cuando el mostrador se satura… el negocio se frena.
Stock en un lado, pedidos en otro, la caja por separado.
Ahora todo vive en un solo lugar: inventario, ventas, compras y contabilidad.
Una interfaz hecha a tu medida: cada usuario ve lo que necesita.
Tan simple que tu equipo lo adopta el mismo día.
Buscás, armás el ticket… y cobrás.
Menos caos. Más control.
Todo tu negocio, en un solo lugar.

## Timing sugerido

| Tiempo | Líneas |
|--------|--------|
| 0–5s | Cuando el mostrador… / Stock en un lado… |
| 5–12s | Ahora todo vive… |
| 12–18s | Una interfaz hecha a tu medida… |
| 18–28s | Tan simple… / Buscás, armás el ticket… y cobrás. |
| 28–35s | Menos caos. Más control. / Todo tu negocio… |

## Notas de grabación

- Pausas cortas en los puntos suspensivos
- Énfasis suave en: “un solo lugar”, “a tu medida”, “el mismo día”, “cobrás”
- Export audio: WAV 48 kHz mono o stereo
```

- [ ] **Step 3: Verificar archivos existen**

Run:

```bash
test -f docs/marketing/comercial-plataforma/README.md && test -f docs/marketing/comercial-plataforma/01-voz-en-off.md && echo OK
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add docs/marketing/comercial-plataforma/README.md docs/marketing/comercial-plataforma/01-voz-en-off.md
git commit -m "docs(marketing): kit comercial — VO e índice"
```

---

### Task 2: Shot list de UI real (escena 3 + roles)

**Files:**
- Create: `docs/marketing/comercial-plataforma/02-shot-list-ui.md`

**Interfaces:**
- Consumes: estructura escena 3 del spec (roles cajero/depósito/admin + flujo a Cobrar)
- Produces: checklist de grabación con rutas de pantalla de la app

- [ ] **Step 1: Crear shot list**

Contenido exacto de `docs/marketing/comercial-plataforma/02-shot-list-ui.md`:

```markdown
# Shot list UI real — Escena 3 (10–22s)

**Regla:** solo pantallas reales del producto. Sin mocks de IA.

## Setup

- Resolución captura: 1920×1080 (o reescalar a 1080p)
- Cursor visible, movimientos suaves
- Datos demo limpios (sin info sensible)
- Rutas típicas del shell Astro:
  - Home: `/`
  - Inventario: hub inventario / productos
  - Ventas: hub ventas
  - Mostrador: `/pos`

## Tomas (en orden de montaje)

| # | Duración | Rol / mensaje | Acción en pantalla |
|---|----------|---------------|--------------------|
| U1 | 2s | Home producto | Launcher “¿Qué querés gestionar hoy?” |
| U2 | 2s | Cajero | Entrar a Mostrador / Caja |
| U3 | 2s | Depósito | Hub Inventario / lista productos o stock |
| U4 | 2s | Admin | Hub completo o Inicio con todas las áreas |
| U5 | 2s | Facilidad | Buscar producto en Mostrador |
| U6 | 2s | Ticket | Agregar ítem(s) al ticket |
| U7 | 2–3s | Cierre UI | Click claro en **Cobrar** |

Total escena 3: ~12s.

## Checklist de calidad por toma

- [ ] Texto legible a 1080p
- [ ] Sin notificaciones del SO
- [ ] Sin datos personales reales
- [ ] Zoom/pan solo si ayuda a leer el CTA (Cobrar)
- [ ] Misma sesión/branding visual entre tomas
```

- [ ] **Step 2: Verificar archivo**

Run:

```bash
test -f docs/marketing/comercial-plataforma/02-shot-list-ui.md && echo OK
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add docs/marketing/comercial-plataforma/02-shot-list-ui.md
git commit -m "docs(marketing): shot list UI para escena cockpit"
```

---

### Task 3: Prompts Veo copy-paste (escenas 1, 2, 4)

**Files:**
- Create: `docs/marketing/comercial-plataforma/03-prompts-veo.md`

**Interfaces:**
- Consumes: prompts + negatives del spec
- Produces: tarjeta por escena lista para pegar en Veo / Flow

- [ ] **Step 1: Crear archivo de prompts**

Contenido exacto de `docs/marketing/comercial-plataforma/03-prompts-veo.md`:

```markdown
# Prompts Veo 3.1 — escenas 1, 2, 4

## Settings globales

- Aspect: 16:9
- Duration: 6–8s
- Resolution: 1080p
- Audio: on
- Opcional: image-to-video con foto real del local (escenas 1 y 4)

---

## Escena 1 — El caos (0–5s)

### Prompt

```
Cinematic handheld shot inside a busy Argentine spare-parts counter shop. Morning rush: customers waiting in a short line, a clerk flipping through paper notes and a messy desk with printed lists, boxes of heater and stove parts on shelves in the soft background. Cool, slightly dull fluorescent light. Sense of urgency and friction, not panic. Shallow depth of field, natural documentary feel, 35mm lens. Subtle ambient audio: muffled chatter in Spanish (Argentina), papers rustling, a phone ringing far away. No logos, no readable brand names, no computer UI on screen.
```

### Negative

```
text overlays, subtitles, logos, neon, purple lighting, cartoon, chaotic blur, readable screen UI
```

---

## Escena 2 — El click (5–10s)

### Prompt

```
Close push-in on a modern laptop on a dark charcoal counter in the same spare-parts shop. The screen turns on with a soft warm glow: deep charcoal interface accents in ember orange and flame yellow, glass-like reflections, no readable text or fake app UI. Camera slowly pushes in as the clerk’s hand calmly taps the trackpad once. Lighting shifts from cool fluorescent to warm charcoal-and-orange mood. Clean, premium product-software atmosphere. Soft click sound, quiet ambient shop noise fading under a low confident tone. No logos.
```

### Negative

```
fake UI text, invented buttons, neon cyberpunk, purple, cluttered desk, shaky cam
```

---

## Escena 4 — El alivio (22–30s)

### Prompt

```
Same Argentine spare-parts shop, now calm mid-afternoon. Wide then medium shot: a clerk finishes a smooth counter sale, hands a small bag to a satisfied installer customer who nods and leaves. Team in the background working with quiet focus. Warm natural light mixed with soft orange accents on metal and wood surfaces. Sense of control and ease. Slow cinematic glide, 50mm lens. Ambient: soft footsteps, a calm cash drawer sound, low pleasant room tone. No logos, no readable UI.
```

### Negative

```
chaos, long queues, paper mess, neon, purple, fake UI, exaggerated smiles
```
```

- [ ] **Step 2: Verificar que los 3 prompts están**

Run:

```bash
rg -c "Escena [124]" docs/marketing/comercial-plataforma/03-prompts-veo.md
```

Expected: al menos 3 matches de encabezados de escena.

- [ ] **Step 3: Commit**

```bash
git add docs/marketing/comercial-plataforma/03-prompts-veo.md
git commit -m "docs(marketing): prompts Veo 3.1 copy-paste"
```

---

### Task 4: Checklist de montaje + cierre gráfico + QA

**Files:**
- Create: `docs/marketing/comercial-plataforma/04-montaje-checklist.md`

**Interfaces:**
- Consumes: timeline 35s del spec + tokens charcoal/flame + CTA
- Produces: orden de timeline, gráfica de cierre y QA de export

- [ ] **Step 1: Crear checklist de montaje**

Contenido exacto de `docs/marketing/comercial-plataforma/04-montaje-checklist.md`:

```markdown
# Montaje, cierre y QA — comercial 35s

## Timeline

| Tiempo | Capa visual | Audio |
|--------|-------------|-------|
| 0–5s | Clip Veo escena 1 | VO caos + ambient |
| 5–10s | Clip Veo escena 2 | VO “Ahora todo vive…” |
| 10–22s | Inserts UI U1–U7 | VO UI a medida + facilidad + ticket/cobrar |
| 22–30s | Clip Veo escena 4 | VO “Menos caos…” (inicio) / ambient |
| 30–35s | Gráfica de cierre | VO tagline + sting corto |

## Gráfica de cierre (30–35s)

- Fondo: `#1A1A1A`
- Tipografía: Montserrat
- Acento: `#F57C00` → `#E64A19`
- Nombre del **producto** (+ isotipo llama opcional)
- Línea: **Todo tu negocio, en un solo lugar.**
- CTA opcional: “Pedí una demo” / “Probalo hoy”
- No look purple/neon genérico

## Assets a reunir antes de editar

- [ ] `veo-escena-1.mp4`
- [ ] `veo-escena-2.mp4`
- [ ] `veo-escena-4.mp4`
- [ ] `ui-u1` … `ui-u7` (mp4 o secuencia)
- [ ] `vo-final.wav`
- [ ] Música bed low (sin letra, no pisa la VO)
- [ ] Logo/isotipo producto (si se usa en cierre)

## QA export

- [ ] Duración total 33–38s
- [ ] 1920×1080, 16:9, H.264
- [ ] VO inteligible; música −12 a −18 dB bajo la VO
- [ ] Ninguna UI inventada por IA
- [ ] Se entiende “UI personalizada” (roles U2–U4)
- [ ] Se entiende facilidad (U5–U7 + línea VO)
- [ ] Cierre muestra producto + tagline legible ≥2s
```

- [ ] **Step 2: Verificar kit completo**

Run:

```bash
ls docs/marketing/comercial-plataforma/ && test -f docs/marketing/comercial-plataforma/04-montaje-checklist.md && echo KIT_OK
```

Expected: lista de `README.md`, `01`…`04`, y `KIT_OK`

- [ ] **Step 3: Commit**

```bash
git add docs/marketing/comercial-plataforma/04-montaje-checklist.md
git commit -m "docs(marketing): checklist de montaje y QA del comercial"
```

---

## Self-review (plan vs spec)

| Requisito del spec | Task |
|--------------------|------|
| VO final con facilidad + UI a medida | Task 1 |
| Escena 3 UI real + roles | Task 2 |
| Prompts Veo 1/2/4 + negatives | Task 3 |
| Cierre gráfico + flujo producción + QA | Task 4 |
| No inventar UI con IA | Global + Tasks 2/4 |

Sin placeholders. Fuera de alcance del plan: generar los MP4 dentro de Cursor (se hace en Veo/editor humano).
