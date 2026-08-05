# Guía: copiar `servigas_dev` (Windows) → `servigas` (Docker)

Cómo llevar la base nativa (con productos y datos operativos) al Postgres del stack Docker del mostrador.

## Analogía

Son **dos cajas fuertes distintas**. Esta guía saca una **fotocopia** de la nativa y la guarda en Docker con el nombre que el piloto ya espera (`servigas`).

| Origen | Destino |
|--------|---------|
| Postgres Windows `:5432` | Postgres Docker `:5433` |
| DB `servigas_dev` | DB `servigas` |
| Productos / usuarios / todo Odoo | Mismo contenido, otro contenedor |

El stack nativo (`Astro :4321` → `Odoo :8070` → `servigas_dev`) **no se modifica**.

Relacionado: [`docker-piloto-mostrador.md`](./docker-piloto-mostrador.md).

## 0. Antes de empezar

1. Docker Desktop en marcha y stack arriba:

```powershell
cd C:\Users\mauri\OneDrive\Desktop\proyectos\servigas-workshop\infra\docker
docker compose --env-file .env ps
```

Tiene que verse `db` healthy.

2. Parar Odoo y Astro Docker mientras restaurás (evita escrituras a medias):

```powershell
docker compose --env-file .env stop odoo web
```

3. Tener `pg_dump` / `pg_restore` en el PATH de Windows (cliente Postgres), **o** usar la variante “copiar al contenedor” del paso 3.

Credenciales Docker (defaults de `.env`):

- user / password: `odoo` / `odoo`
- puerto host DB: `5433`

Credenciales Windows: las de tu Postgres nativo (a menudo también `odoo`/`odoo` o las de `servigas.conf`).

## 1. Dump de la base con productos

```powershell
cd $env:USERPROFILE\Desktop
# Custom format (-Fc): comprimido y apto para pg_restore
pg_dump -h 127.0.0.1 -p 5432 -U odoo -Fc -d servigas_dev -f servigas_dev.dump
```

Si pide password, usá el del Postgres Windows.

Verificá que el archivo exista y pese algo razonable (no 0 KB):

```powershell
Get-Item .\servigas_dev.dump | Select-Object FullName, Length
```

## 2. Preparar la DB destino en Docker

Crear (o recrear) la base `servigas` vacía en el contenedor:

```powershell
cd C:\Users\mauri\OneDrive\Desktop\proyectos\servigas-workshop\infra\docker

# Terminar conexiones a servigas si ya existía
docker compose --env-file .env exec -T db psql -U odoo -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'servigas' AND pid <> pg_backend_pid();"

# Borrar y recrear (CUIDADO: borra lo que hubiera en Docker)
docker compose --env-file .env exec -T db psql -U odoo -d postgres -c "DROP DATABASE IF EXISTS servigas;"
docker compose --env-file .env exec -T db psql -U odoo -d postgres -c "CREATE DATABASE servigas OWNER odoo;"
```

## 3. Restore del dump

### Variante fácil (copiar el dump al contenedor)

```powershell
# Desde la carpeta donde está el .dump
docker cp "$env:USERPROFILE\Desktop\servigas_dev.dump" servigas-mostrador-db-1:/tmp/servigas_dev.dump

docker compose --env-file .env exec -T db pg_restore -U odoo -d servigas --no-owner --role=odoo /tmp/servigas_dev.dump
```

Notas:

- `--no-owner` evita errores si el rol Windows no existe igual en Docker.
- `pg_restore` a veces imprime avisos de “already exists” / permisos; lo crítico es el exit code y que Odoo arranque después.
- Si el contenedor se llama distinto: `docker ps --format "{{.Names}}"` y usá el nombre real de `db`.

### Variante desde el host (si tenés cliente Postgres)

```powershell
$env:PGPASSWORD = "odoo"
pg_restore -h 127.0.0.1 -p 5433 -U odoo -d servigas --no-owner --role=odoo "$env:USERPROFILE\Desktop\servigas_dev.dump"
```

## 4. Volver a levantar Odoo + Astro

```powershell
cd C:\Users\mauri\OneDrive\Desktop\proyectos\servigas-workshop\infra\docker
docker compose --env-file .env up -d
```

En `.env` tiene que seguir:

```env
ODOO_DB=servigas
```

(`dbfilter` en `odoo.conf` ya es `^servigas$`.)

## 5. Upgrade de módulos (recomendado)

El código de addons del repo puede ser más nuevo que el de la DB copiada:

```powershell
.\install-modules.ps1
```

O:

```powershell
docker compose --env-file .env run --rm --no-deps odoo odoo -d servigas -u servigas_core,servigas_integrations --stop-after-init --db_host=db --db_user=odoo --db_password=odoo
```

Después:

```powershell
docker compose --env-file .env up -d odoo web
```

## 6. Verificar

1. http://127.0.0.1:8069/web/login → DB `servigas`, usuario/clave **los mismos** que en `servigas_dev`.
2. http://127.0.0.1:4322/login → mismo usuario.
3. Inventario / Mostrador: deberían aparecer los productos.

Chequeo rápido:

```powershell
docker compose --env-file .env exec -T db psql -U odoo -d servigas -c "SELECT COUNT(*) AS productos FROM product_template;"
```

## Problemas frecuentes

| Síntoma | Qué hacer |
|---------|-----------|
| `pg_dump: command not found` | Instalá herramientas cliente de Postgres o hacé dump desde una ruta donde esté el binario |
| Auth falla al dump | Revisá user/password/host del Postgres Windows (`-h 127.0.0.1 -p 5432`) |
| Restore “role does not exist” | Usá `--no-owner --role=odoo` |
| Odoo no lista la DB | Confirmá nombre `servigas` y `dbfilter = ^servigas$` |
| Login Astro OK pero sin productos | Entraste a otra DB o el restore falló a medias; mirá el `COUNT(*)` de arriba |
| `docker compose down -v` | **No lo uses** después del restore: borra el volumen y perdés la copia |

## Qué no cambia

- La base nativa `servigas_dev` en `:5432` sigue intacta (solo se leyó un dump).
- Astro nativo `:4321` sigue apuntando a `servigas_dev` vía `web/.env`.
- Astro Docker `:4322` usa la copia `servigas` en Docker.
