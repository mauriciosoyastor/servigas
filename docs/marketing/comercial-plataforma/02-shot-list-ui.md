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
| U1 | 1.5s | Home producto | Launcher “¿Qué querés gestionar hoy?” |
| U2 | 1.5s | Cajero | Entrar a Mostrador / Caja |
| U3 | 1.5s | Depósito | Hub Inventario / lista productos o stock |
| U4 | 1.5s | Admin | Hub completo o Inicio con todas las áreas |
| U5 | 1.5s | Facilidad | Buscar producto en Mostrador |
| U6 | 1.5s | Ticket | Agregar ítem(s) al ticket |
| U7 | 2–3s | Cierre UI | Click claro en **Cobrar** |

Total escena 3: ~12s (trim en montaje si hace falta).

## Checklist de calidad por toma

- [ ] Texto legible a 1080p
- [ ] Sin notificaciones del SO
- [ ] Sin datos personales reales
- [ ] Zoom/pan solo si ayuda a leer el CTA (Cobrar)
- [ ] Misma sesión/branding visual entre tomas
