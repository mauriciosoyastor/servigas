# Checklist — PC del mostrador Servigas (Docker)

Guía paso a paso para dejar Servigas usable en la computadora del local.
Analogía: es como **armar el local nuevo**: primero la luz y el candado (Windows/Docker), después las cajas (contenedores), después la llave del mostrador (acceso directo), y al final el stock (base con productos).

**Puertos piloto (default):** Astro `4322` · Odoo `8069` · Postgres Docker `5433`  
**Doc técnica:** [docker-piloto-mostrador.md](./docker-piloto-mostrador.md)  
**PR de referencia:** https://github.com/mauriciosoyastor/servigas/pull/67

---

## 0. Antes de ir al local (en tu PC / oficina)

- [ ] Merge / pull de la rama con Docker + launcher + ícono (PR #67 o `main` actualizado)
- [ ] Confirmar que en el repo existen:
  - [ ] `infra/docker/docker-compose.yml`
  - [ ] `infra/docker/Start-Servigas.bat` / `.ps1`
  - [ ] `infra/docker/servigas.ico` (o `build-servigas-ico.py` + Pillow)
  - [ ] `custom_addons/servigas_core` y `servigas_integrations`
- [ ] Decidir: ¿piloto con base vacía `servigas`, o con **copia** de `servigas_dev` (productos)?  
  - Vacía → seguir esta checklist tal cual  
  - Con productos → marcar sección **8** (pendiente / hacerlo el día del restore)
- [ ] Anotar usuario/clave admin que vas a crear (no uses la del nativo si la base es otra)
- [ ] Llevar memoria USB o acceso a GitHub para clonar/copiar el repo

---

## 1. Hardware y Windows (PC mostrador)

- [ ] PC enciende, usuario Windows de mostrador (sin pedir admin a cada rato si se puede)
- [ ] Internet estable (primera vez: descarga imágenes Docker)
- [ ] Disco libre razonable (recomendado ≥ 20 GB libres)
- [ ] Hora/zona horaria correctas (Argentina)
- [ ] Navegador: Edge o Chrome actualizado
- [ ] (Opcional) Usuario Windows se inicia solo al encender (kiosk liviano)

---

## 2. Instalar Docker Desktop

- [ ] Instalar [Docker Desktop](https://www.docker.com/products/docker-desktop/) para Windows
- [ ] Reiniciar si el instalador lo pide
- [ ] Abrir Docker Desktop → esperar estado **Running** (ballena estable)
- [ ] Settings → **General** → activar **Start Docker Desktop when you sign in**
- [ ] Settings → Resources: RAM ≥ 4 GB asignada a Docker (ideal 6–8 si la PC aguanta)
- [ ] En PowerShell: `docker version` muestra **Client** y **Server** (sin error de pipe)

---

## 3. Traer el código Servigas

Elegí **una**:

**A) Git (preferido)**

- [ ] Instalar Git si no está
- [ ] Clonar el repo (ej. `Desktop\proyectos\servigas` o `servigas-workshop`)
- [ ] Checkout de `main` (o la rama mergeada con Docker)
- [ ] Verificar carpeta: `...\infra\docker\`

**B) Copia USB**

- [ ] Copiar carpeta completa del proyecto (incluye `custom_addons` + `infra/docker` + `web`)
- [ ] Misma ruta siempre (el acceso directo apunta a esa carpeta)

---

## 4. Primera puesta en marcha del stack

En PowerShell:

```powershell
cd <ruta-del-repo>\infra\docker
copy .env.example .env
```

- [ ] Revisar `.env`:
  - [ ] `ODOO_DB=servigas`
  - [ ] `WEB_HOST_PORT=4322` (o `4321` si querés puerto “oficial” del local)
  - [ ] `ODOO_HOST_PORT=8069`
  - [ ] Cambiar `POSTGRES_PASSWORD` si la PC no es solo de confianza
- [ ] (Recomendado) Cambiar `admin_passwd` en `odoo.conf` (master password de bases)
- [ ] Build + up:

```powershell
docker compose --env-file .env up -d --build
```

- [ ] Esperar a que `docker compose --env-file .env ps` muestre `db`, `odoo`, `web` (odoo **healthy**)
- [ ] Instalar módulos Servigas:

```powershell
.\install-modules.ps1
```

- [ ] Abrir http://127.0.0.1:8069 → crear / confirmar usuario **admin** (anotar clave)
- [ ] Abrir http://127.0.0.1:4322/login → entrar con ese usuario, DB `servigas`

---

## 5. Acceso directo con ícono llama

```powershell
cd <ruta-del-repo>\infra\docker
python .\build-servigas-ico.py
.\Start-Servigas.ps1 -CreateDesktopShortcut
```

- [ ] Existe `Servigas.lnk` en el Escritorio
- [ ] Se ve el ícono de la llama (si no: F5 / recrear shortcut)
- [ ] Doble clic abre el browser en Astro (y levanta Docker si hacía falta)
- [ ] Probar con Docker cerrado: el script espera Docker y después abre

**Sin Python:** si ya viene `servigas.ico` en el repo, alcanza con  
`.\Start-Servigas.ps1 -CreateDesktopShortcut`.

---

## 6. Smoke operativo (15–20 min)

Con caja y turno reales de prueba:

- [ ] Login Astro OK
- [ ] Rail: Inicio, Mostrador, Caja, Stock, Compras, Clientes, Cobros, Taller
- [ ] **Caja:** abrir con monto + turno
- [ ] **Mostrador:** catálogo carga (si la base tiene productos; si no, solo UI vacía)
- [ ] Cobrar una venta de prueba (si hay productos/caja)
- [ ] **Taller:** hub + nueva OT abre
- [ ] (Opcional) Onboarding: no se traba en paso 5; Abrir caja sigue al ticket
- [ ] Cerrar sesión / volver a entrar con el acceso directo

---

## 7. Día a día / cierre

- [ ] Encender PC → Docker arranca solo → (opcional) doble clic Servigas
- [ ] Contenedores con `restart: unless-stopped` vuelven solos cuando Docker está Ready
- [ ] Para apagar limpio al final del día (opcional):

```powershell
cd <ruta-del-repo>\infra\docker
docker compose --env-file .env down
```

(conserva datos; no borra volúmenes)

- [ ] **No** usar `down -v` en producción (borra la base Docker)

---

## 8. Base con productos (cuando lo hagamos)

Hoy el piloto Docker nace **vacío**. Cuando copies `servigas_dev`:

- [ ] Backup de `servigas_dev` (Postgres Windows / nativo)
- [ ] Restore al Postgres Docker (`5433`) o estrategia acordada
- [ ] Ajustar `ODOO_DB` si el nombre de base cambia
- [ ] `install-modules.ps1` o `-u servigas_core` si hace falta
- [ ] Smoke: Mostrador muestra el catálogo real
- [ ] Backup periódico del volumen Docker / `pg_dump`

*(Detalle técnico: pendiente de documentar el día del restore.)*

---

## 9. Seguridad y límites (marcar como leído)

- [ ] Entendido: esto es **piloto** (no AFIP / facturación electrónica completa)
- [ ] Master password Odoo y claves admin no quedan en post-it visibles
- [ ] OneDrive: preferible carpeta del repo **fuera** de sync conflictivo, o “Always keep on this device”
- [ ] Actualizaciones: `git pull` + `docker compose up -d --build` + `install-modules.ps1` cuando haya release

---

## 10. Firma de puesta en marcha

| Campo | Valor |
|-------|--------|
| Fecha | |
| PC (nombre) | |
| Quién instaló | |
| URL Astro | http://127.0.0.1:____ |
| Usuario admin | |
| Base Odoo | `servigas` / otra: ____ |
| Productos cargados | [ ] No (vacío) [ ] Sí (restore) |
| Smoke OK | [ ] Sí [ ] Con observaciones: ____ |

---

## Atajos rápidos (imprimible)

| Acción | Comando / gesto |
|--------|-----------------|
| Abrir Servigas | Doble clic **Servigas** en Escritorio |
| Ver contenedores | `docker compose --env-file .env ps` (en `infra\docker`) |
| Logs Astro | `docker compose --env-file .env logs -f web` |
| Logs Odoo | `docker compose --env-file .env logs -f odoo` |
| Parar (guardar datos) | `docker compose --env-file .env down` |
| Reset total (borra datos) | `docker compose --env-file .env down -v` ← cuidado |
