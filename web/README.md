# Servigas Astro BFF Shell

Spike experimental de un shell operativo Astro 7 con SSR y BFF. Implementa
login, launcher, rail y un hub de inventario contra Odoo 19 sin exponer la
sesión de Odoo al navegador.

```text
Browser → Astro BFF → BackendClient → OdooAdapter → Odoo
```

`web/` es el **camino a corte** del shell operativo (ADR 0016): meta =
reemplazar launcher/hubs/listas/POS OWL. Hoy OWL sigue en producción hasta
go/no-go; este árbol es el piloto que debe alcanzar la checklist del ADR.

## Requisitos

- Node.js 22.12 o posterior.
- Odoo de desarrollo accesible, con los modelos `sg.app.tile` y `sg.hub.card`.
- Una base con un usuario válido; en Servigas se usa `servigas_dev`.

## Ejecutar el spike

Desde `web/`:

```powershell
npm install
@"
ODOO_URL=http://127.0.0.1:8069
ODOO_DB=servigas_dev
"@ | Set-Content .env
npm test
npm run astro -- dev --background
```

Abrir `http://localhost:4321`, iniciar sesión con un usuario de Odoo y recorrer
Inicio → hubs Inventario / Ventas / Compras / Contabilidad → cards de resumen
abren listas nativas Astro (allowlist BFF: productos, stock, pedidos, clientes,
OC, facturas, pagos, integraciones, etc.). Detalle de producto en
`/lists/inventory/products/:id`. Para administrar el servidor en segundo plano:

```powershell
npm run astro -- dev status
npm run astro -- dev logs
npm run astro -- dev stop
```

Verificación sin levantar el servidor:

```powershell
npm test
npm run build
```

No commitear `.env` ni credenciales. `ODOO_URL` y `ODOO_DB` se leen solo en el
servidor desde `src/lib/bff/get-backend.ts`.

## Qué es reutilizable

- `src/lib/bff/backend-client.ts`: puerto neutral para autenticación, sesión,
  launcher y hubs.
- `src/lib/bff/errors.ts` y `http.ts`: errores y respuestas seguras del BFF.
- `src/lib/bff/session-store.ts`: forma de asociar una cookie BFF opaca con la
  sesión upstream. Su implementación en memoria es solo para el spike.
- `src/pages/api/`: forma de las rutas de auth, launcher y hub.
- `src/lib/shell/`, layouts y componentes: responsabilidades de navegación y
  presentación, una vez removidos nombres y estilos propios del proyecto.

## Qué pertenece a Odoo o Servigas

- `src/lib/bff/odoo-adapter.ts`: JSON-RPC, cookie `session_id`, modelos
  `sg.app.tile` / `sg.hub.card` y métodos Odoo.
- `src/lib/bff/get-backend.ts`: factory actual configurada con
  `ODOO_URL` / `ODOO_DB`.
- Contratos y mappings con campos, apps o `client_tag` de Servigas.
- Tokens `--sg-*`, marca, copy, iconos y apariencia Liquid Glass.

Para otro backend, conservar `BackendClient` y reemplazar `OdooAdapter` y su
factory. El sistema visual también es pluggable: mantener los límites de
`ShellLayout`, rail, tile, card y estados, pero inyectar tokens y estilos del
nuevo producto.

Antes de producción, reemplazar `MemorySessionStore` por un store compartido
con expiración y definir políticas de timeout, rotación y revocación.

## Referencias

- [Diseño aprobado](../docs/superpowers/specs/2026-07-22-astro-bff-shell-design.md)
- [Plan del spike](../docs/superpowers/plans/2026-07-22-astro-bff-shell-spike.md)
- Skill personal: `C:/Users/mauri/.agents/skills/astro-bff-shell/SKILL.md`
- Checklist reusable: `C:/Users/mauri/.agents/skills/astro-bff-shell/checklist.md`
