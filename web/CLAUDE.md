## Development

When the user asks to run / start the development server, always bring up the full stack (Astro + Odoo on separate ports). Do not start Astro alone.

| Service | Port | URL |
|---------|------|-----|
| Astro (web BFF) | `4321` | http://127.0.0.1:4321 |
| Odoo (native Servigas) | `8070` | http://127.0.0.1:8070 |

From `web/`:

1. Ensure Odoo is up (idempotent): `npm run odoo:ensure`
2. Confirm `.env` has `ODOO_URL=http://127.0.0.1:8070` and `ODOO_DB=servigas_dev`
3. Start Astro in background mode:

```
npm run astro -- dev --background --host 127.0.0.1 --port 4321
```

Manage the Astro background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

Foreground full stack (local terminal): `npm run dev:stack`

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
