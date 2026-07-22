/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly ODOO_URL: string;
  readonly ODOO_DB: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
