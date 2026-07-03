# servigas

MÃ³dulos Odoo custom para **Odoo custom - Servigas**. No incluye el core de Odoo.

**Repo:** https://github.com/mauriciosoyastor/servigas  
**Carpeta:** `Desktop/servigas/`  
**Workspace:** abrÃ­ `servigas.code-workspace` en Cursor

## Requisitos

- Odoo 19 Community en `../odoo-workspace/odoo-19/` (runtime compartido, no se clona)
- Python 3.10+, PostgreSQL
- Config local: `../odoo-workspace/config/servigas.conf` (no estÃ¡ en este repo)

## Inicio rÃ¡pido

```powershell
# 1. Abrir en Cursor
#    Desktop/servigas/servigas.code-workspace

# 2. Arrancar Odoo
cd ..\odoo-workspace\odoo-19
python odoo-bin -c ..\config\servigas.conf

# 3. Instalar mÃ³dulos (primera vez)
python odoo-bin -c ..\config\servigas.conf -d servigas_dev -i servigas_core --stop-after-init
```

DocumentaciÃ³n del host: [`../odoo-workspace/docs/INICIO-PROYECTO.md`](../odoo-workspace/docs/INICIO-PROYECTO.md)

## MÃ³dulos

| MÃ³dulo | DescripciÃ³n |
|--------|-------------|
| `servigas_core` | â€¦ |

## Licencia

LGPL-3 â€” Odoo CE es propiedad de [Odoo S.A.](https://www.odoo.com); este repo no estÃ¡ afiliado.

