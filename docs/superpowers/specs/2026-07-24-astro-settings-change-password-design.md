# Design: Ajustes — perfil + cambiar contraseña (Astro shell)

**Fecha:** 2026-07-24  
**Estado:** draft (pending user review)  
**Repo:** servigas (`web/`)  
**Ruta afectada:** `/settings`

## Problema

Chrome / gestores de contraseña empujan a cambiar la clave vía `localhost:8069/.well-known/change-password`, y el consejo operativo era ir a Odoo crudo (`:8070/web` → Preferencias). En el shell Astro, `/settings` es un stub: no hay perfil ni cambio de contraseña. El usuario queda fuera de la experiencia unificada y choca con puertos equivocados.

## Objetivos

1. Mostrar en `/settings` un bloque **Tu cuenta** (solo lectura): nombre mostrado + login.
2. Permitir **Cambiar contraseña** desde la misma página, 100% vía Astro BFF (browser nunca habla con `:8070`).
3. Tras éxito: **cerrar sesión** (BFF + Odoo) y redirigir a `/login` con feedback claro.
4. Conservar el card existente de **Integraciones**.

## No objetivos

- Preferencias Odoo, configuración de empresa, 2FA
- “Olvidé mi contraseña” / self-service de alta de usuarios
- Editar nombre o login
- iframe, deep-link o redirect a Odoo web (`:8070`)
- Endpoint público Well-Known `/.well-known/change-password` (queda fuera; se puede agregar después apuntando a `/settings`)

## Decisiones cerradas en brainstorming

| Tema | Decisión |
|------|----------|
| Alcance v1 | Perfil read-only + cambiar contraseña (**opción B**) |
| Post-éxito | Logout completo + redirect a login (**opción B**) |
| Arquitectura de pantalla | Todo en `/settings` (enfoque 1), no subruta |
| Canal | Solo BFF Astro → Odoo server-side |

## UX — `/settings`

Misma shell (`ShellLayout`). Tres bloques glass, en orden:

1. **Tu cuenta** — labels fijos + valores de la sesión BFF (`session.name`, `session.login`). Sin inputs.
2. **Cambiar contraseña** — campos: contraseña actual, nueva, confirmar; botón Guardar. Validación cliente: no vacíos; nueva === confirmar; nueva ≠ actual (mensaje claro). Errores server debajo del form (patrón login).
3. **Integraciones** — card actual sin cambios funcionales.

Lead copy (reemplaza el “todavía no está disponible”):

> Gestioná tu cuenta. Otras configuraciones de empresa siguen en Integraciones.

Tras redirect a login con `?changed=1`, mostrar alerta no intrusiva:  
“Contraseña actualizada. Ingresá con la nueva.”

## Arquitectura

```text
Browser (/settings)
    │  cookie httpOnly BFF
    ▼
POST /api/auth/change-password
    │  requireOdooSession → odooSessionId
    ▼
BackendClient.changePassword(odooSessionId, current, next)
    │
OdooAdapter → call_kw res.users.change_password(current, next)
    │
on success → logout Odoo + destroy BFF session + clear cookie
    ▼
{ ok: true } → client redirect /login?changed=1
```

### API

| Método | Ruta | Body | Respuesta |
|--------|------|------|-----------|
| `POST` | `/api/auth/change-password` | `{ currentPassword, newPassword }` | `{ ok: true }` |

- Confirmación de clave solo en cliente (no viaja al server).
- Auth: cookie BFF obligatoria; sin sesión → `401` + invalidate.
- Errores: `validation_error` (campos), `bad_credentials` o equivalente si la actual no coincide; mensajes seguros sin traceback Odoo.
- Mínimo de longitud: alinear a lo que Odoo exija (si Odoo rechaza, mapear a mensaje legible).

### Capas a tocar

| Pieza | Cambio |
|-------|--------|
| `backend-client.ts` | Agregar `changePassword(...)` |
| `odoo-adapter.ts` | Implementar vía `#callKw` / método Odoo de cambio de password |
| `api/auth/change-password.ts` | Handler nuevo (espejo de `login.ts`) |
| `settings.astro` | Perfil + form + script fetch |
| `login.astro` | Banner opcional si `changed=1` |
| Tests | `api-routes`, `odoo-adapter`, smoke UI settings si aplica |

## Seguridad

- Nunca enviar cookie Odoo al browser (patrón BFF actual).
- Tras cambio exitoso: invalidar sesión BFF **y** destruir sesión Odoo antes de responder ok.
- No loguear contraseñas ni debug Odoo con secretos.
- Rate limiting explícito: fuera de alcance v1 (mismo nivel que login hoy).

## Criterios de aceptación

1. Usuario autenticado ve nombre + login en `/settings` sin ir a Odoo.
2. Con contraseña actual correcta y nueva válida → éxito → queda deslogueado → login pide la nueva.
3. Contraseña actual incorrecta → error visible; sesión sigue viva.
4. Nueva ≠ confirmar → no llama API.
5. Network tab del browser: solo requests a `:4321`, nunca a `:8070`.
6. Card Integraciones sigue funcionando.

## Riesgos / notas

- Confirmar firma exacta del método Odoo en la versión del workspace (`res.users.change_password` vs endpoint session). Si el método no existe, adaptar el adapter sin cambiar el contrato del BFF hacia el browser.
- En dev, `admin`/`admin` seguirá disparando avisos de Chrome hasta cambiar la clave; eso es esperado y positivo.
