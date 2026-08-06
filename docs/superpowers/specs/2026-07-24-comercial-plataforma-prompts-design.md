# Comercial plataforma de gestión — guion + prompts Veo 3.1

## Objetivo

Video comercial **horizontal 16:9 · ~35s** que vende la **plataforma de gestión** (producto), no un film de marca retail.

- Formato: YouTube / web / presentación
- Público: gerencia + equipo interno (cajeros, depósito, compras, admin)
- Tono: problema → solución, con facilidad de uso y UI personalizada por usuario
- Motor IA: **Google Veo 3.1** para escenas cinematográficas; **UI real** para pantallas

## Regla de oro

Veo **nunca inventa la interfaz**. Las pantallas del producto se muestran con grabación o captura real. Servigas aparece como **nombre del producto**, no como marca emocional de retail.

## Estructura (35s)

| Tiempo | Escena | Tipo | Contenido |
|--------|--------|------|-----------|
| 0–5s | El caos | Veo | Mostrador saturado, papeles, fricción |
| 5–10s | El click | Veo | Notebook/monitor; mood charcoal + ember (sin UI inventada) |
| 10–22s | El cockpit | UI real | Roles personalizados + flujo a Cobrar |
| 22–30s | El alivio | Veo | Operación calmada, venta fluida |
| 30–35s | Cierre | Gráfica | Nombre producto + tagline + CTA |

## Voz en off (español AR · final)

> Cuando el mostrador se satura… el negocio se frena.  
> Stock en un lado, pedidos en otro, la caja por separado.  
> Ahora todo vive en un solo lugar: inventario, ventas, compras y contabilidad.  
> Una interfaz hecha a tu medida: cada usuario ve lo que necesita.  
> Tan simple que tu equipo lo adopta el mismo día.  
> Buscás, armás el ticket… y cobrás.  
> Menos caos. Más control.  
> Todo tu negocio, en un solo lugar.

### Timing sugerido de VO

| Bloque | Líneas |
|--------|--------|
| Caos | “Cuando el mostrador…” / “Stock en un lado…” |
| Click + plataforma | “Ahora todo vive…” |
| UI personalizada | “Una interfaz hecha a tu medida…” |
| Facilidad + ticket | “Tan simple…” / “Buscás, armás el ticket… y cobrás.” |
| Cierre | “Menos caos. Más control.” / “Todo tu negocio, en un solo lugar.” |

## Escena 3 — inserts UI reales (obligatorio)

Secuencia de grabación (zooms limpios, cursor suave):

1. **Home / launcher** — “¿Qué querés gestionar hoy?”
2. **Roles personalizados** (corte rápido, misma plataforma):
   - Cajero → Mostrador / Cobrar
   - Depósito → Inventario / stock
   - Admin → panel completo
3. **Inventario** — productos / stock
4. **Mostrador** — buscar producto → armar ticket → **Cobrar**

Mensaje visual: *misma plataforma, vistas distintas por usuario*.

## Prompts Veo 3.1

### Settings globales

- Aspect ratio: **16:9**
- Duration: **6–8s** por clip
- Resolution: **1080p**
- Audio nativo: **on**
- Opcional: image-to-video con foto real del local para escenas 1 y 4

---

### Escena 1 — El caos (0–5s)

**Prompt**

```
Cinematic handheld shot inside a busy Argentine spare-parts counter shop. Morning rush: customers waiting in a short line, a clerk flipping through paper notes and a messy desk with printed lists, boxes of heater and stove parts on shelves in the soft background. Cool, slightly dull fluorescent light. Sense of urgency and friction, not panic. Shallow depth of field, natural documentary feel, 35mm lens. Subtle ambient audio: muffled chatter in Spanish (Argentina), papers rustling, a phone ringing far away. No logos, no readable brand names, no computer UI on screen.
```

**Negative prompt**

```
text overlays, subtitles, logos, neon, purple lighting, cartoon, chaotic blur, readable screen UI
```

---

### Escena 2 — El click (5–10s)

**Prompt**

```
Close push-in on a modern laptop on a dark charcoal counter in the same spare-parts shop. The screen turns on with a soft warm glow: deep charcoal interface accents in ember orange and flame yellow, glass-like reflections, no readable text or fake app UI. Camera slowly pushes in as the clerk’s hand calmly taps the trackpad once. Lighting shifts from cool fluorescent to warm charcoal-and-orange mood. Clean, premium product-software atmosphere. Soft click sound, quiet ambient shop noise fading under a low confident tone. No logos.
```

**Negative prompt**

```
fake UI text, invented buttons, neon cyberpunk, purple, cluttered desk, shaky cam
```

---

### Escena 4 — El alivio (22–30s)

**Prompt**

```
Same Argentine spare-parts shop, now calm mid-afternoon. Wide then medium shot: a clerk finishes a smooth counter sale, hands a small bag to a satisfied installer customer who nods and leaves. Team in the background working with quiet focus. Warm natural light mixed with soft orange accents on metal and wood surfaces. Sense of control and ease. Slow cinematic glide, 50mm lens. Ambient: soft footsteps, a calm cash drawer sound, low pleasant room tone. No logos, no readable UI.
```

**Negative prompt**

```
chaos, long queues, paper mess, neon, purple, fake UI, exaggerated smiles
```

---

### Escena 5 — Cierre (30–35s · gráfica / CapCut o similar)

- Fondo: `#1A1A1A`
- Tipografía: Montserrat
- Acento llama: `#F57C00` → `#E64A19`
- Nombre del **producto** (+ isotipo llama opcional)
- Línea: **Todo tu negocio, en un solo lugar.**
- CTA opcional: “Pedí una demo” / “Probalo hoy”

## Identidad visual de apoyo (producto)

| Token | Valor |
|-------|--------|
| Charcoal | `#1A1A1A`, `#2B2B2B` |
| Paper | `#F7F5F2` |
| Flame | `#FFD600` → `#F57C00` → `#E64A19` → `#BF360C` |
| Font | Montserrat |
| Estilo | Liquid Glass, glass hubs, sin look purple/neon “AI default” |

## Flujo de producción

1. Generar clips Veo (escenas 1, 2, 4).
2. Grabar inserts UI reales (escena 3) con roles distintos.
3. Montar en CapCut / DaVinci / Runway: VO + música + gráfica de cierre.
4. Export 1080p 16:9; variantes sociales después si hacen falta.

## Fuera de alcance

- Versión vertical 9:16 (se puede adaptar luego).
- Generar pantallas de la app con IA.
- Comercial de marca retail / lifestyle de tienda.
