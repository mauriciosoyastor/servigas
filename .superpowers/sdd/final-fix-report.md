# Final fix report — change password

- `changePassword` ahora clasifica primero `data.name` y `data.message` de Odoo para sesiones vencidas, `AccessDenied` y `UserError`.
- El fallback por texto quedó limitado a formas RPC desconocidas, evaluando sesión antes que contraseña incorrecta.
- Fixtures actualizados con nombres de excepción reales de Odoo y cobertura de precedencia sobre texto incidental.
- Prueba focal: 54/54 aprobadas.
- Suite completa: 228/228 aprobadas.
