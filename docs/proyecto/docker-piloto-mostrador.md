# Docker piloto — mostrador Servigas (opción C)

Stack reproducible: **Postgres + Odoo 19 + Astro BFF** en contenedores.
Pensado para instalar en la PC del mostrador sin depender del Postgres/Python de Windows.

## Analogía

Es una **mudanza en tres cajas**:

| Caja | Servicio | Puerto en tu PC (default piloto) |
|------|----------|----------------------------------|
| Bóveda | Postgres 16 | `5433` (solo debug; el nativo sigue en 5432) |
| Oficina | Odoo 19 + addons Servigas | `8069` |
| Mostrador web | Astro BFF | `4322` |

El día a día de desarrollo (nativo) sigue en `8070` / `4321` / Postgres Windows: **no chocan**.

## Requisitos

1. [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y **en marcha** (ícono de ballena).
2. Este repo clonado (carpeta `custom_addons` con `servigas_core` y `servigas_integrations`).
3. En PowerShell: `docker version` debe mostrar Client **y** Server (si Server falla → abrí Docker Desktop).

## Arranque en tu PC (prueba)

Atajo (doble clic / acceso directo):

```powershell
cd Desktop\proyectos\servigas-workshop\infra\docker
python .\build-servigas-ico.py
.\Start-Servigas.ps1 -CreateDesktopShortcut
.\Start-Servigas.ps1
```

El acceso **Servigas** del escritorio usa el ícono de la llama (`servigas.ico`).

O a mano:

```powershell
cd Desktop\proyectos\servigas-workshop\infra\docker
copy .env.example .env
docker compose --env-file .env up -d --build
```

La primera vez el build de Astro puede tardar varios minutos.

### Instalar módulos (solo primera vez / upgrade)

```powershell
.\install-modules.ps1
```

Eso crea/actualiza la DB `servigas` e instala `servigas_core` + `servigas_integrations` sin datos demo.

### Abrir

| URL | Qué es |
|-----|--------|
| http://127.0.0.1:4322 | Shell Astro (login operativo) |
| http://127.0.0.1:8069 | Odoo nativo (wizard DB / backend) |

1. Entrá a Odoo `:8069` si pedís crear usuario master / admin la primera vez.
2. Luego login en Astro `:4322` con ese usuario y DB `servigas`.

## Smoke checklist (5–10 min)

- [ ] `docker compose --env-file .env ps` → `db`, `odoo`, `web` up (odoo healthy)
- [ ] http://127.0.0.1:8069/web/login responde
- [ ] http://127.0.0.1:4322/login → entrar
- [ ] Home / rail carga (Inicio, Mostrador, Caja, …, Cobros, Taller)
- [ ] Hub Taller o listado OT abre sin error de campo
- [ ] (Opcional) PDF OT / cobro con caja abierta

## Comandos útiles

```powershell
cd infra\docker

# Ver logs
docker compose --env-file .env logs -f web
docker compose --env-file .env logs -f odoo

# Parar (conserva datos en volúmenes)
docker compose --env-file .env down

# Parar y BORRAR datos (reset total del piloto)
docker compose --env-file .env down -v

# Rebuild solo Astro tras cambiar web/
docker compose --env-file .env up -d --build web

# Upgrade módulos tras pull de código
.\install-modules.ps1
# o: docker compose run --rm --no-deps odoo odoo -d servigas -u servigas_core --stop-after-init --db_host=db --db_user=odoo --db_password=odoo
```

## Variables (`.env`)

Copiá desde `.env.example`. Importantes:

| Variable | Default piloto | Nota |
|----------|----------------|------|
| `ODOO_DB` | `servigas` | Debe coincidir con `dbfilter` en `odoo.conf` |
| `WEB_HOST_PORT` | `4322` | En el mostrador real podés poner `4321` |
| `ODOO_HOST_PORT` | `8069` | Oficial Docker Odoo |
| `POSTGRES_PASSWORD` | `odoo` | **Cambiar** antes de producción |

## Instalación en la PC del mostrador

1. Instalar Docker Desktop + iniciar sesión Windows estable (arranque automático opcional).
2. Clonar este repo (o copiar carpeta).
3. `infra/docker`: `copy .env.example .env` → ajustar puertos si querés `4321`.
4. `docker compose --env-file .env up -d --build`
5. `.\install-modules.ps1`
6. Crear usuario admin en Odoo; smoke checklist.
7. Bookmark: Astro en el navegador del mostrador.

**Master password** de gestión de DB Odoo: ver `admin_passwd` en `odoo.conf` (cambiar antes de dejar el local sin supervisión).

## Límites (explícitos)

- No incluye AFIP / emisión electrónica.
- PDF depende de `wkhtmltopdf` en la imagen oficial `odoo:19.0` (suele venir; si falla PDF, revisar logs Odoo).
- Los addons se montan **read-only** desde `custom_addons/`; para código nuevo: pull + rebuild web + `-u` módulos.
- Este Postgres Docker es **aparte** del Postgres de Windows; no mezcla `servigas_dev` nativo.

## Troubleshooting

| Síntoma | Qué mirar |
|---------|-----------|
| `failed to connect to the docker API` / pipe | Abrir **Docker Desktop** y esperar a que diga Running |
| Puerto en uso | Cambiar `WEB_HOST_PORT` / `ODOO_HOST_PORT` en `.env` |
| Astro “Missing ODOO_URL” | El compose ya setea `ODOO_URL=http://odoo:8069` dentro de la red |
| Módulo no aparece | `install-modules.ps1` y volumen `../../custom_addons` montado |
| Login Astro falla | DB `servigas` creada + usuario Odoo; `ODOO_DB` en `.env` |
