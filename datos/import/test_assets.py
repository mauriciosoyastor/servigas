from odoo.addons.base.models.assetsbundle import AssetsBundle

bundles = ["web.assets_backend", "point_of_sale._assets_pos"]

for name in bundles:
    files, external = env["ir.qweb"]._get_asset_content(name)
    bundle = AssetsBundle(name, files, external_assets=external, env=env)
    bundle.css()
    if bundle.css_errors:
        print(f"ERRORS in {name}:")
        for err in bundle.css_errors:
            print(err)
    else:
        print(f"OK: {name}")

print("Done.")
