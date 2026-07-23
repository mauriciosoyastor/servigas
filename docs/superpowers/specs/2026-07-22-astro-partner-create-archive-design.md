# Spec — Crear / archivar partners (clientes + proveedores)

**Fecha:** 2026-07-22  
**Estado:** approved (corrida automática; start A → generalizar a vendors)

## Pantallas

1. `/lists/sales/customers/new` — alta cliente  
2. Ficha cliente — editar (ya) + **Archivar**  
3. Lista clientes — CTA “Nuevo cliente”  
4. Idem proveedores: `/lists/purchase/vendors/new`, ficha, CTA

## Done

1. Create allowlisted: `name` (req), `phone`, `email` + defaults (`customer_rank` / `supplier_rank`).
2. Archive = `active=false` (no `unlink`).
3. Update sigue igual (phone/email).
4. BFF: `createRecord` / `archiveRecord`; API `POST /api/records/:slug` con `action`.
5. Sin campos libres ni modelos fuera de allowlist.

## No-objetivos

- Delete duro / multi-company / contactos hijos  
- Create de productos, pedidos, facturas  
- Formularios ricos (dirección, fiscal, tags)
