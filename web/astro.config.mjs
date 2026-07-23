// @ts-check
import { defineConfig } from "astro/config";
import node from "@astrojs/node";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  vite: { plugins: [tailwindcss()] },
  redirects: {
    "/lists/purchase/rfq": "/lists/purchase/solicitudes",
    "/lists/purchase/rfq/new": "/lists/purchase/solicitudes/new",
    "/lists/purchase/rfq-draft": "/lists/purchase/solicitudes-borrador",
    "/lists/purchase/rfq-sent": "/lists/purchase/solicitudes-enviadas",
    "/lists/sales/pos-orders": "/lists/sales/ventas-caja",
    "/lists/sales/pos-orders/[id]": "/lists/sales/ventas-caja/[id]",
    "/lists/inventory/quants": "/lists/inventory/existencias",
  },
});
