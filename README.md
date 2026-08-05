# servigas

Módulos Odoo custom para **Servigas**. No incluye el core de Odoo.

**Repo:** https://github.com/mauriciosoyastor/servigas  
**Workspace:** abrí `servigas.code-workspace` en Cursor

## Requisitos (desarrollo nativo)

- Odoo 19 Community en `../odoo-workspace/odoo-19/` (runtime compartido)
- Python 3.10+, PostgreSQL
- Config local: `../odoo-workspace/config/servigas.conf` (no está en este repo)
- **PDF (Windows):** `wkhtmltopdf` en PATH + parches del host  
  (`../odoo-workspace/scripts/apply-odoo-patches.ps1`, guía `../odoo-workspace/docs/WINDOWS-PDF.md`)

## Inicio rápido (nativo)

```powershell
cd ..\odoo-workspace\odoo-19
python odoo-bin -c ../config/servigas.conf
```

Primera vez (módulos):

```powershell
python odoo-bin -c ../config/servigas.conf -d servigas_dev -i servigas_core --stop-after-init
```

Documentación del host: [`../odoo-workspace/docs/INICIO-PROYECTO.md`](../odoo-workspace/docs/INICIO-PROYECTO.md)

## Piloto Docker (mostrador — opción C)

Postgres + Odoo 19 + Astro BFF en contenedores, pensado para la PC del mostrador:

→ [`docs/proyecto/docker-piloto-mostrador.md`](docs/proyecto/docker-piloto-mostrador.md)  
→ carpeta `infra/docker/`

```powershell
cd infra\docker
copy .env.example .env
docker compose --env-file .env up -d --build
.\install-modules.ps1
```

URLs piloto (no chocan con nativo 8070/4321): Astro http://127.0.0.1:4322 · Odoo http://127.0.0.1:8069

## Módulos

| Módulo | Descripción |
|--------|-------------|
| `servigas_core` | Tema Liquid Glass, hubs, taller, POS, backend |
| `servigas_integrations` | Panel de integraciones y pantalla de inicio al login |

## Licencia

LGPL-3 — Odoo CE es propiedad de [Odoo S.A.](https://www.odoo.com); este repo no está afiliado.
