# Spec — Numpad lite caja Astro

**Fecha:** 2026-07-22  
**Estado:** approved (opción B)

## Pantalla

`/pos` — panel numpad junto al ticket.

## Done

1. Seleccionar línea del ticket.
2. Modos: **Qty**, **Precio**, **%** (línea), **Desc.** (pedido %).
3. Dígitos 0–9, `.`, Backspace; Enter/Aplicar escribe en carrito.
4. Total = subtotal líneas × (1 − Desc.pedido/100); checkout manda descuento efectivo por línea.
5. Tests puros numpad + cart; contrato UI.

## No-objetivos

- Popup nativo Odoo / producto “Descuento general”
- Offline, multi-caja, paridad total OWL
