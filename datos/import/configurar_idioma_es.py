"""Instala español (Argentina) y lo aplica a todos los usuarios."""

LANG_CODE = "es_AR"

Lang = env["res.lang"].with_context(active_test=False)
lang = Lang.search([("code", "=", LANG_CODE)], limit=1)
if not lang:
  raise SystemExit(f"No se encontró el idioma {LANG_CODE}")

if not lang.active:
    lang.active = True
    print(f"Idioma activado: {lang.name}")
else:
    print(f"Idioma ya activo: {lang.name}")

installer = env["base.language.install"].create(
    {
        "lang_ids": [(6, 0, lang.ids)],
        "overwrite": True,
    }
)
print("Instalando traducciones (puede tardar unos minutos)...")
installer.lang_install()

users = env["res.users"].search([])
users.write({"lang": LANG_CODE})
print(f"Usuarios actualizados: {len(users)}")

for company in env["res.company"].search([]):
    if company.partner_id:
        company.partner_id.write({"lang": LANG_CODE})

env.cr.commit()
print(f"Listo. Recargá el navegador (Ctrl+F5). Idioma: {LANG_CODE}")
