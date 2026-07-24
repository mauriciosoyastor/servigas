# Launcher: acentos fríos (fila inferior) + marca llama + wordmark

**Fecha:** 2026-07-23  
**Estado:** aprobado en chat (opción paleta 1 + enfoque A)  
**Superficies:** shell Astro (home + login) y login Odoo (`servigas_core`)

## Problema

1. Las cuatro tiles inferiores del home (Integraciones, Punto de venta, Aplicaciones, Ajustes) usan acentos grises (`bg-mid` / `bg-deep` / `bg-charcoal`) y se leen como “apagadas” frente a la fila superior (llama amarillo→óxido).
2. El logo actual (`servigas-logo.png` / `servigas_logo.png`) incluye caja oscura + wordmark embebido; se pide **solo la llama** + el nombre **Servigas** tipográfico.

## Decisión

### Acentos KPI (fuente de verdad en Odoo)

Nuevos `accent_key` y tokens, mapeados en `sg.app.tile.setup_launcher_tile_accents`:

| Tile (xmlid) | `accent_key` | Hex |
|--------------|--------------|-----|
| `servigas_integrations.launcher_tile_integrations` | `cool-teal` | `#26A69A` |
| `servigas_core.launcher_tile_pos` | `cool-cyan` | `#00BCD4` |
| `servigas_core.launcher_tile_apps` | `cool-blue` | `#42A5F5` |
| `servigas_core.launcher_tile_settings` | `cool-indigo` | `#5C6BC0` |

La fila superior **no cambia** (`flame-yellow` / `flame-orange` / `flame-deep` / `flame-rust`).

**Astro:** extender el mapa de acentos en `TileCard.astro` (y el tipo `AccentKey` si aplica) con los mismos cuatro keys/hex (o CSS vars nuevas en tokens del shell).

**Odoo OWL launcher:** registrar los mismos keys en `$sg-launcher-accents` (`servigas_launcher.scss`) y tokens en `servigas_tokens.scss` si hace falta reutilizarlos.

Tras upgrade / re-ejecutar `setup_launcher_tile_accents`, el BFF ya propaga `accent_key` al home Astro.

### Marca (isotipo + wordmark)

| Pieza | Antes | Después |
|-------|--------|---------|
| Asset | PNG compuesto (caja + llama + texto) | Isotipo PNG: llama sola, fondo transparente (`web/public/servigas-mark.png` + copia Odoo en `servigas_core/static/src/img/`) |
| Wordmark | Dentro del PNG | Texto HTML/CSS **Servigas** (Sentence case, Montserrat / tokens existentes) |
| Rail Astro | Solo `<img>` del logo compuesto | Llama + “Servigas” debajo, sin caja |
| Login Astro | Logo compuesto | Mismo patrón (llama + Servigas) |
| Login Odoo | `servigas_logo.png` en `login_templates.xml` | Isotipo + wordmark tipográfico (misma lectura visual) |

Cache-bust: subir `?v=` en URLs de asset al cambiar el archivo.

## Fuera de alcance

- Cambiar colores de la fila superior.
- Rediseñar tipografía de marca más allá del wordmark del logo.
- Iconografía Font Awesome de las tiles (sigue el monograma por letra).

## Verificación

1. Home Astro: las 4 tiles inferiores muestran monograma + borde “Dato” en teal/cyan/azul/índigo (no grises).
2. Rail y login Astro: llama sola + “Servigas”, sin caja oscura alrededor del mark.
3. `/web/login` Odoo: misma lectura de marca.
4. Hard refresh / assets Odoo regenerados si hace falta (`-u servigas_core` o equivalente local).

## Analogía

Arriba = fuego (calor de la marca). Abajo = agua/aire (fríos) para no competir con la llama, pero igual de “vivos”. El logo pasa de “pegatina en caja” a “símbolo + nombre” como un isotipo real.
