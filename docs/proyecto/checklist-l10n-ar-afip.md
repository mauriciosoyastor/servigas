# Checklist — `l10n_ar` y camino a AFIP (fase 3b)

> Preparación de localización Argentina. **No** incluye emisión electrónica real (fase **3c**).  
> Relacionado: [spec destino CF/CUIT](../superpowers/specs/2026-07-24-cf-cuit-invoice-destination-design.md) · [spec tipo sugerido 3a](../superpowers/specs/2026-07-24-afip-doc-type-hint-design.md) · `CONTEXT.md`

## Estado Servigas hoy

| Pieza | Estado |
|-------|--------|
| Destino CF/CUIT (`sg_invoice_dest`) | Hecho (fase 1) |
| FC create/publish en Astro | Hecho (fase 2) |
| Tipo de comprobante **sugerido** en UI | Hecho (fase 3a) |
| Puente Factura Web | Manual |
| `l10n_ar` instalado + EDI/CAE | Pendiente (3c) |

## Checklist instalación `l10n_ar` (Odoo 19 CE)

1. [ ] Backup de `servigas_dev` / prod.
2. [ ] Instalar módulo **`l10n_ar`** (y dependencias que pida el wizard de localización).
3. [ ] Compañía: país Argentina, moneda ARS, plan de cuentas AR.
4. [ ] Condición frente al IVA de **Servigas** (RI / Monotributo / Exento).
5. [ ] Impuestos de venta/compra alineados al catálogo (productos con `taxes_id`).
6. [ ] Diarios y secuencias de facturación revisados.
7. [ ] (Opcional prep. 3c) Puntos de venta AFIP / datos de emisor — solo cuando haya certificados.

## Mapeo conceptual `sg_*` → nativo

| Servigas (hoy) | Concepto AFIP / `l10n_ar` |
|----------------|---------------------------|
| `sg_invoice_dest = cf` | Consumidor final → tipicamente Factura B o C |
| `sg_invoice_dest = cuit` | Cliente con CUIT → tipicamente Factura A o B |
| `vat` | CUIT / identificación |
| Tipo sugerido UI (`B/C`, `A/B`) | Orientativo; el tipo exacto lo define responsabilidad IVA + `l10n_ar` |

No borrar `sg_invoice_dest` al instalar `l10n_ar`: mapear o sincronizar en un spec 3c (responsibility type / document type).

## Criterios para abrir fase 3c (emisión real)

- [ ] Certificado / clave fiscal AFIP (homologación primero).
- [ ] Módulo EDI AR disponible en el runtime (CE/OCA o camino Enterprise acordado).
- [ ] Prueba de CAE en homologación OK.
- [ ] Decisión: ¿Factura Web se apaga o convive un tiempo?

## Fuera de este checklist

- IIBB / padrones provinciales (add-on aparte).
- Emisión automática al **Publicar** desde Astro (solo tras 3c).
