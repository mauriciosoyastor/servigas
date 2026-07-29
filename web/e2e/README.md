# E2E Playwright (shell Servigas)

Auditoría de **clicks reales** sobre Astro + Odoo. Complementa los scripts HTTP (`audit-*-cycle.mjs`); no los reemplaza.

## Prereq

1. Odoo `:8070` — `npm run odoo:ensure`
2. Astro `:4321` — preferí sin Dev Toolbar:

```bash
# opción A (dev sin toolbar)
ASTRO_TOOLBAR=0 npm run astro -- dev --background --host 127.0.0.1 --port 4321

# opción B (preview, sin toolbar)
npm run build && npm run preview -- --host 127.0.0.1 --port 4321
```

Si corrés contra `astro dev` con toolbar, los helpers remueven `astro-dev-toolbar` en runtime.

## Creds

Mismos que smoke: `SMOKE_LOGIN`, `SMOKE_PASSWORD`, `SMOKE_BASE_URL` (default `http://127.0.0.1:4321`).

## Comandos

```bash
npm run e2e:install   # chromium
npm run e2e:shell     # prereq + playwright test
```

Exit: `0` OK · `1` fail · `2` Astro down.

## Ampliar

Reusar `e2e/helpers/auth.mjs` + `api.mjs`. Seed/prereq por API; clicks solo en CTAs con `data-*`.

Specs actuales:
- `sales-confirm-publish` — Confirmar cotización + Publicar FC
- `hub-tile-nav` — tile Ventas → `/hubs/sales`
- `pos-checkout` — producto + `[data-pos-checkout]`
- `caja-move` — Abrir (si cerrada) + Ingreso refuerzo
- `caja-close` / `caja-close-diff` — Cerrar caja (sin/con diferencia)
- `fc-register-payment` — Registrar cobro en ficha FC
- `fc-lifecycle` — Volver a borrador / Anular FC
- `create-invoice-click` — Crear FC desde pedido
- `customer-archive` / `customer-notes` — Archivar / notas
- `purchase-confirm` — Confirmar OC
- `inventory-validate` — Validar recepción (picking)
- `quotation-share-email` — Enviar cotización por mail
- `fp-publish` / `fp-create-attachment` — Publicar / crear FP con adjunto UI
- `price-list-import` — CSV precios preview + apply
