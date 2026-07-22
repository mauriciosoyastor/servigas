/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly ODOO_URL: string;
  readonly ODOO_DB: string;
  readonly BFF_SESSION_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
