# Resumen — corrida backlog Astro BFF (2026-07-22)

## Suite

- `web/`: **132/132** tests OK

## Entregado en esta corrida

- Shell listas/hubs/detalle + media
- Caja POS (Cash/Card, desc. %, recibo)
- **Numpad lite** en `/pos`: Qty / Precio / % línea / Desc. pedido + dígitos + Aplicar
- Partners create/archive (clientes + proveedores)
- Productos create/archive + edit código/precio
- Confirmar cotización / RFQ (`action_confirm`)
- Crear cotización + RFQ (`feature/astro-rfq-quotation-create`)

## Smoke

- Producto id `8772` creado
- Cotización `S00002` draft → `sale` vía BFF
- Numpad: `/pos` sirve `data-pos-numpad` + checkout con desc. efectivo 19% OK

## Siguiente

- Offline / multi-caja POS
- Recorrido/onboarding Astro
