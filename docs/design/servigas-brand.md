# Identidad visual Servigas — análisis para SCSS / Odoo

**Fuente:** logo oficial (llama + wordmark «Servigas» sobre fondo oscuro).  
**Implementación:** `custom_addons/servigas_core/static/src/scss/servigas_tokens.scss`

---

## Símbolo (isotipo)

| Aspecto | Descripción |
|---------|-------------|
| **Forma** | Llama / gota de gas estilizada; dos trazos fluidos superpuestos |
| **Lectura** | Energía, calor, gas — alineado al rubro (calefacción, termotanques, cocinas) |
| **Estilo** | Plano con profundidad por **gradiente** y solapamiento; bordes redondeados |
| **Construcción** | Trazo izquierdo (amarillo→naranja) + trazo derecho (naranja→rojo óxido) |

### Gradiente llama (oficial aproximado)

```scss
// De arriba-izquierda a abajo-derecha en el símbolo
#FFD600  →  #F57C00  →  #E64A19
(amarillo vivo) (naranja) (rojo óxido)
```

Uso en UI: botón **Cobrar**, badges activos, acentos POS, barra de progreso, focus ring.

---

## Tipografía (wordmark)

| Aspecto | Valor |
|---------|-------|
| **Familia** | Sans-serif geométrica, peso medio–semibold |
| **Referentes** | Montserrat, Poppins, Gotham, Geomanist |
| **Implementación web** | **Montserrat** (Google Fonts) 400 / 500 / 600 / 700 |
| **Casing** | Sentence case — «Servigas» (solo S mayúscula) |
| **Color sobre oscuro** | `#FFFFFF` |
| **Tracking** | Normal a ligeramente abierto (`0.01em`–`0.02em`) |
| **Formas** | Curvas circulares (`e`, `g`, `a`); `g` de un piso con descender abierto |

### Stack CSS

```scss
--sg-font-family: "Montserrat", "Segoe UI", system-ui, sans-serif;
```

**No usar** serif ni condensed en UI operativa (POS / inventario).

---

## Paleta de color

### Fondo marca (logo)

| Token | Hex | Uso |
|-------|-----|-----|
| `--sg-bg-deep` | `#1A1A1A` | Fondo POS, navbar oscuro |
| `--sg-bg-charcoal` | `#2B2B2B` | Paneles, gradiente fondo |
| `--sg-bg-gradient` | `#333333` → `#1A1A1A` | Canvas ambiental POS |

### Llama / acentos

| Token | Hex | Uso |
|-------|-----|-----|
| `--sg-flame-yellow` | `#FFD600` | Inicio gradiente, highlights |
| `--sg-flame-orange` | `#F57C00` | Acento principal marca |
| `--sg-flame-deep` | `#E64A19` | CTA, botón cobrar, estados activos |
| `--sg-flame-rust` | `#BF360C` | Hover / pressed CTA |

### Neutros

| Token | Hex | Uso |
|-------|-----|-----|
| `--sg-text-on-dark` | `#FFFFFF` | Texto principal sobre fondo oscuro |
| `--sg-text-muted-dark` | `rgba(255,255,255,0.72)` | Secundario POS |
| `--sg-paper` | `#F7F5F2` | Backend — fondo cálido claro |
| `--sg-canvas` | `#EFECEA` | Backend — secciones |
| `--sg-text-on-light` | `#1A1A1A` | Texto backend |

### Glass (Liquid Glass v2)

**POS (sobre oscuro):**

| Token | Valor |
|-------|-------|
| `--sg-glass-fill` | `rgba(255, 255, 255, 0.08)` |
| `--sg-glass-fill-strong` | `rgba(255, 255, 255, 0.14)` |
| `--sg-glass-border` | `rgba(255, 255, 255, 0.12)` |
| `--sg-glass-blur` | `16px` |

**Backend (sobre claro):**

| Token | Valor |
|-------|-------|
| `--sg-glass-fill` | `rgba(255, 255, 255, 0.55)` |
| `--sg-glass-fill-strong` | `rgba(255, 255, 255, 0.72)` |
| `--sg-glass-border` | `rgba(230, 74, 25, 0.12)` | tinte llama sutil |

---

## Mapeo logo → tokens Odoo

| Elemento logo | Token / clase SCSS | Dónde en Odoo |
|---------------|-------------------|---------------|
| Fondo oscuro | `--sg-bg-deep` | `.pos` background |
| Gradiente llama | `--sg-flame-gradient` | `.pay-order-button`, `.btn-primary` |
| Blanco wordmark | `--sg-text-on-dark` | Navbar POS, títulos |
| Sans geométrica | `--sg-font-family` | Todo POS + backend |
| Isotipo | `--navbar-logo` | `.pos-logo` |
| Pill / bordes suaves | `--sg-radius-card`, `--sg-radius-pill` | Cards producto, subnav |

---

## Reglas de uso

1. **CTA principal** siempre usa gradiente llama (no verde Odoo ni morado Astor).
2. **POS** = tema oscuro (como el logo); **backend** = papel claro con acentos llama.
3. Glass **solo** en header, búsqueda, KPIs — no en cada fila de producto.
4. Logo en navbar: `servigas_logo.png` vía `--navbar-logo`.
5. Mantener contraste WCAG en textos sobre gradiente (blanco sobre llama OK).

---

## Archivos relacionados

| Archivo | Rol |
|---------|-----|
| `servigas_tokens.scss` | Variables y custom properties |
| `servigas_pos.scss` | Estilos POS |
| `servigas_backend.scss` | Acentos backend + tipografía |
| `static/src/img/servigas_logo.png` | Logo para navbar POS |
