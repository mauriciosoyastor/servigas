# Spec — Teclado físico en ticket POS / caja

**Fecha:** 2026-08-03  
**Estado:** implemented  
**Pantalla:** `/pos` — panel Ticket + numpad en pantalla

## Problema

El ticket de caja ya tiene numpad táctil (Cant. / Precio / % línea / Desc. total), pero no responde al teclado físico de la PC. En mostrador conviene cargar cantidades y precios con el teclado numérico sin mirar la pantalla.

## Enfoque

**B — módulo puro de mapeo + listener fino en `pos.astro`.**

- Extraer `mapKeyboardToNumpad` (o equivalente) en `web/src/lib/pos/` con tests unitarios.
- El wiring en `pos.astro` despacha las mismas funciones que ya usa el numpad táctil (`pressDigit`, `pressBackspace`, `setNumpadMode`, `applyNumpad`).
- No cambiar checkout, carrito ni API.

## Mapa de teclas

| Tecla | Acción |
|--------|--------|
| `0–9` (fila superior y Numpad) | Dígito al buffer |
| `.` / `NumpadDecimal` | Decimal (misma regla: un solo punto) |
| `Backspace` | Borrar último carácter del buffer |
| `Enter` / `NumpadEnter` | Aplicar (igual que el botón) |
| `F1` | Modo Cant. |
| `F2` | Modo Precio |
| `F3` | Modo % línea |
| `F4` | Modo Desc. total |
| `Escape` | Vaciar buffer sin aplicar |

## Reglas

1. Si el foco está en `input`, `textarea`, `select` o elemento `contenteditable`, **no** capturar atajos (incluye F1–F4), para no pelear con “Buscar cliente…” u otros campos.
2. Al capturar una tecla mapeada, llamar `preventDefault` para evitar scroll / comportamientos del browser (p. ej. F1 ayuda).
3. Misma validación que el teclado táctil (vía `pressDigit` / `pressBackspace` / apply existente).
4. Cambiar modo con F1–F4 limpia el buffer (comportamiento actual de `setNumpadMode`).
5. `Enter` con buffer vacío o sin línea seleccionada (cuando el modo lo exige) no inventa lógica nueva: reutiliza `applyNumpad` tal cual.

## Done

1. Dígitos y punto del teclado físico alimentan el buffer visible.
2. Backspace / Enter / Escape se comportan como arriba.
3. F1–F4 cambian el modo activo en la UI.
4. Con foco en búsqueda de cliente (u otro campo), el teclado no mueve el numpad.
5. Tests unitarios del mapeo tecla → acción; wiring mínimo en `pos.astro`.

## No-objetivos

- Atajos para agregar productos del catálogo o cobro / checkout
- Remap configurable por usuario
- Soporte offline / multi-caja
- Cambiar layout visual del numpad táctil
- Capturar teclas fuera de `/pos`

## Analogía

El numpad en pantalla es la caja registradora; el teclado físico es un mando a distancia que aprieta los mismos botones. El mapeo es el control remoto; `pos.astro` solo apunta el IR al aparato.
