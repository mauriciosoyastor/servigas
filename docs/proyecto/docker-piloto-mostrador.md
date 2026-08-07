# Servigas en la PC del mostrador (Docker)

Stack reproducible: **Postgres + Odoo 19 + Astro BFF** en contenedores.
Pensado para la PC del mostrador **sin** depender del Postgres/Python de desarrollo en Windows.

## Analogía

Es una **mudanza en tres cajas** (todo vive dentro de Docker):

| Caja | Servicio | Puerto en la PC (default) |
|------|----------|---------------------------|
| Bóveda | Postgres 16 | `5433` (solo debug) |
| Oficina | Odoo 19 + addons Servigas | `8069` |
| Mostrador web | Astro BFF (shell oficial) | `4322` (o `4321` si preferís) |

En la notebook de desarrollo el nativo sigue en `8070` / `4321` / Postgres Windows: **no chocan** con este piloto.

**Relacionado:** copiar productos/usuarios desde `servigas_dev` → [`copiar-servigas-dev-a-docker.md`](./copiar-servigas-dev-a-docker.md).

---

## Requisitos

1. Windows 10/11 estable; sesión de usuario del mostrador (arranque automático de Docker Desktop opcional).
2. [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y **Running** (ícono de ballena).
3. Repo Servigas en disco (carpeta `custom_addons` con `servigas_core` y `servigas_integrations`).
4. En PowerShell: `docker version` muestra Client **y** Server (si Server falla → abrí Docker Desktop y esperá).

---

## Instalación en la PC del mostrador (paso a paso)

### 1. Clonar o copiar el repo

```powershell
cd $env:USERPROFILE\Desktop
# Si hay git:
git clone https://github.com/mauriciosoyastor/servigas.git servigas-workshop
cd servigas-workshop
git checkout main
git pull
```

Si no hay git: copiá la carpeta del proyecto completa (incluye `custom_addons/` e `infra/docker/`).

### 2. Configurar `.env`

```powershell
cd infra\docker
copy .env.example .env
notepad .env
```

| Variable | Default | En el mostrador real |
|----------|---------|----------------------|
| `ODOO_DB` | `servigas` | Dejar así (debe coincidir con `dbfilter` en `odoo.conf`) |
| `WEB_HOST_PORT` | `4322` | Podés poner `4321` si nadie más lo usa |
| `ODOO_HOST_PORT` | `8069` | Dejar (no uses `8070`: es el nativo de desarrollo) |
| `POSTGRES_PASSWORD` | `odoo` | **Cambiar** antes de dejar la PC sin supervisión |

### 3. Primera vez: build + módulos

```powershell
cd infra\docker
docker compose --env-file .env up -d --build
.\install-modules.ps1
```

- La primera build de Astro puede tardar varios minutos.
- `install-modules.ps1` crea/actualiza la DB `servigas` e instala `servigas_core` + `servigas_integrations` **sin demos**.

### 4. Usuario admin

1. Abrí http://127.0.0.1:8069 → wizard / login Odoo.
2. Creá (o usá) el usuario admin de la DB `servigas`.
3. Cambiá también el **master password** de gestión de DB en `infra/docker/odoo.conf` (`admin_passwd`) si la PC queda en el local.

### 5. Acceso diario (atajo del escritorio)

```powershell
cd infra\docker
python .\build-servigas-ico.py          # una vez, genera servigas.ico
.\Start-Servigas.ps1 -CreateDesktopShortcut
.\Start-Servigas.ps1
```

El acceso **Servigas** del escritorio:

- Espera Docker Desktop
- Levanta `db` + `odoo` + `web`
- Abre el navegador en el shell Astro

Días siguientes: **doble clic en Servigas** (o `.\Start-Servigas.ps1`).

### 6. Bookmark del shell

| URL | Uso |
|-----|-----|
| http://127.0.0.1:4322 (o el `WEB_HOST_PORT`) | **Shell operativo** (login del día a día) |
| http://127.0.0.1:8069 | Odoo backend (solo admin / hotfix) |

Login en Astro con el **mismo** usuario/clave Odoo y DB `servigas`.

### 7. (Opcional) Traer catálogo y datos de desarrollo

Si ya tenés productos/usuarios en `servigas_dev` (Windows), seguí  
[`copiar-servigas-dev-a-docker.md`](./copiar-servigas-dev-a-docker.md)  
y después `.\install-modules.ps1` o un `-u` de módulos (paso “Actualizar”).

---

## Smoke checklist (5–10 min)

Hacelo la primera vez y después de cada `git pull` + upgrade.

- [ ] `docker compose --env-file .env ps` → `db`, `odoo`, `web` up (`odoo` healthy)
- [ ] http://127.0.0.1:8069/web/login responde
- [ ] http://127.0.0.1:4322/login → entrar
- [ ] Home / rail: Inicio, Mostrador, Caja, Cobros, Taller, …
- [ ] Mostrador (POS): buscar producto y (si hay caja abierta) cobro de prueba
- [ ] Hub Taller o listado OT abre sin error de campo
- [ ] Ficha OT: Ver / Descargar PDF (debe bajar un `%PDF`, no HTML de error)
- [ ] (Opcional) PDF de factura desde ficha FC
- [ ] Caja: abrir sesión y ver feed de movimientos

---

## Actualizar código en el mostrador

Cuando haya cambios mergeados en `main` (layout PDF, taller, caja, etc.):

```powershell
cd path\to\servigas-workshop
git pull

cd infra\docker
docker compose --env-file .env up -d --build web   # si cambió Astro / web/
.\upgrade-modules.ps1                              # -u servigas_core (DB ya existente)
```

> **Importante:** `install-modules.ps1` es solo para la **primera** instalación (`-i`).
> Tras un `git pull`, usá **`upgrade-modules.ps1`** para aplicar campos nuevos en Odoo
> (p. ej. listado de OT de taller, alertas de stock, seña en OT).

Upgrade manual equivalente:

```powershell
docker compose --env-file .env run --rm --no-deps odoo `
  odoo -d servigas -u servigas_core,servigas_integrations `
  --stop-after-init --db_host=db --db_user=odoo --db_password=odoo
docker compose --env-file .env up -d
```

Luego repetí el **smoke checklist** (sobre todo PDF OT/factura y hub Taller).

> **Nota:** el layout PDF de facturas usa un inherit `primary` Servigas para no pelear con `account_edi_ubl_cii`. Si un `-u servigas_core` falla con xpath `web.external_layout`, asegurate de estar en `main` con el fix mergeado.

---

## Comandos útiles

```powershell
cd infra\docker

# Estado
docker compose --env-file .env ps

# Logs
docker compose --env-file .env logs -f web
docker compose --env-file .env logs -f odoo

# Parar (conserva datos en volúmenes)
docker compose --env-file .env down

# Parar y BORRAR datos (reset total — pierde productos/usuarios del piloto)
docker compose --env-file .env down -v

# Solo rebuild Astro tras cambiar web/
docker compose --env-file .env up -d --build web
```

---

## Qué incluye / qué no

| Incluye | No incluye (aún) |
|---------|------------------|
| Shell Astro (POS, caja, cobros, taller, listas) | AFIP / emisión electrónica |
| PDFs con marca Servigas (OT, pedidos, OC, facturas) | eCommerce |
| Catálogo / compras / contabilidad operativa | Multi-caja / offline |
| Factura Web (puente manual) | Listas de precio automáticas |

---

## Troubleshooting

| Síntoma | Qué mirar |
|---------|-----------|
| `failed to connect to the docker API` / pipe | Abrir **Docker Desktop** y esperar Running |
| Puerto en uso | Cambiar `WEB_HOST_PORT` / `ODOO_HOST_PORT` en `.env` |
| Astro “Missing ODOO_URL” | El compose setea `ODOO_URL=http://odoo:8069` dentro de la red |
| Módulo no aparece | `install-modules.ps1`; volumen `../../custom_addons` montado |
| Login Astro falla | DB `servigas` creada + usuario Odoo; `ODOO_DB` en `.env` |
| Taller → “No se pudo abrir el listado” | Tras `git pull`, correr `.\upgrade-modules.ps1` (`-u servigas_core`) |
| PDF falla / HTML en vez de PDF | Logs Odoo; imagen `odoo:19.0` trae wkhtmltopdf; `-u servigas_core` |
| Upgrade XML `web.external_layout` | `git pull` de `main` con fix factura primary; volver a `-u` |
| Tras `down -v` “desapareció todo” | Esperado: borraste volúmenes; hay que reinstalar o restaurar dump |

---

## Arranque rápido (dev en la misma máquina)

Si solo querés probar el piloto Docker **sin** ser la PC del negocio:

```powershell
cd infra\docker
copy .env.example .env
docker compose --env-file .env up -d --build
.\install-modules.ps1
.\Start-Servigas.ps1
```
