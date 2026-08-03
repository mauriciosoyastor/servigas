# Design: Taller — PDF, WhatsApp y mail de OT + marca Servigas

**Fecha:** 2026-08-03  
**Estado:** approved (pending implementation)  
**Repo:** servigas (`web/` + `servigas_core`)  
**Base:** [2026-08-03-workshop-work-order-design.md](./2026-08-03-workshop-work-order-design.md)  
**Patrón de referencia:** envío de pedidos/cotizaciones (`sale-order-share` + `RecordSaleOrderShareControl`)

## Problema

Las OT digitales se cargan y consultan en el shell, pero no hay forma de entregar un documento formal al cliente (PDF con marca Servigas) ni de enviarlo por WhatsApp o mail como ya se hace con pedidos.

## Meta

En la ficha de OT: generar PDF con logo Servigas, compartirlo por WhatsApp (chat con mensaje listo) y enviarlo por mail vía Odoo. Mostrar el logo Servigas también en el formulario de alta y en la ficha digital.

## Decisiones

| Tema | Decisión |
|------|----------|
| Flujo de envío | Igual que pedidos: Ver/Descargar PDF + WhatsApp (`wa.me`) + mail Odoo con adjunto |
| Disponibilidad | Borrador y cerrada (avance o OT hecha) |
| Logo | PDF (encabezado) **y** UI digital (alta + ficha) |
| Contacto | Prioridad partner Odoo: email/phone del `partner_id`; si no hay phone del partner → `owner_phone`. Mail solo con `partner.email` |
| Layout PDF | Documento A4 branded (no clone 1:1 del papel) |
| Foto de chapa en PDF | Fuera de alcance v1 |

## Arquitectura

```
Ficha OT Astro
  └─ Panel "Enviar al cliente"
       ├─ GET  /api/reports/workshop-order/workshop/orders/:id
       │         → Odoo /report/pdf/<report_xmlid>/:id
       ├─ WhatsApp wa.me (mensaje; tip: adjuntar PDF a mano)
       └─ POST /api/workshop-orders/send-email
                 → mail.template + PDF adjunto (Odoo)
```

| Pieza | Responsabilidad |
|-------|-----------------|
| QWeb report `servigas_core.report_sg_work_order` | Render PDF de `sg.work.order` con logo |
| `mail.template` (XML data) | Asunto/cuerpo + report adjunto |
| BFF (`workshop-order-share`, adapter methods) | Allowlists, proxy PDF, meta contacto, send email |
| UI `RecordWorkOrderShareControl` (mismo patrón visual que SO; APIs propias de OT) | Botones Ver/Descargar/WA/Mail en ficha |
| CSS/markup form + ficha | Logo Servigas visible |

## Contenido del PDF

**Encabezado:** logo Servigas (`servigas_core/static/src/img/servigas_logo.png`) · título “Orden de trabajo” · `name` · estado (Borrador/Cerrada) · fecha.

**Cuerpo:**
1. Propietario, celular, cliente Odoo (si hay)
2. Artefacto: serie, marca, modelo, descripción, gas (GN/GE)
3. Problema, observación, trabajos realizados, materiales
4. Importe si `amount > 0`

**Pie:** “Servigas”. Tipografía limpia, márgenes amplios. Sin foto de chapa.

## UX

### Ficha OT (`/lists/workshop/orders/[id]`)

Panel “Enviar al cliente”:

| Acción | Comportamiento |
|--------|----------------|
| Ver PDF / Descargar PDF | Modal + download; draft y done |
| WhatsApp | Abre chat con mensaje (“Hola {nombre}, te envío la orden de trabajo {name}…”); tip de adjuntar PDF |
| Enviar por mail | Template Odoo; requiere `partner.email`; si falta → disabled + hint |

Resolución de teléfono: `partner.phone` → si vacío `partner.mobile` → si vacío `owner_phone`.  
Resolución de nombre en mensaje: `partner.name` → si vacío `owner_name` → “cliente”.

### Marca digital

- Formulario de alta: header con logo + “Orden de trabajo”
- Ficha OT: logo chico en eyebrow/header junto al título

## Errores

| Caso | Comportamiento |
|------|----------------|
| Sin partner o sin email | Mail disabled + hint “Cargá el mail del cliente” |
| Sin phone partner ni `owner_phone` | WhatsApp disabled + hint |
| Fallo PDF (p. ej. wkhtmltopdf) | 503 con mensaje claro (mismo patrón que pedidos) |
| OT inexistente / listKey no allowlist | 404 |

## Fuera de alcance

- Adjuntar PDF automáticamente en WhatsApp
- Foto de chapa dentro del PDF
- PDF idéntico al formulario papel
- OCR / facturar / stock (siguen fuera como en v1 taller)

## Verificación

- Unit: allowlists PDF/mail, resolve phone/email, mensaje WA, filename seguro
- Shell-ui / component tests: panel en ficha; logo en create y ficha
- Manual: Ver PDF con logo; WA abre chat; mail con partner que tenga email

## Criterios de éxito

1. Desde una OT (draft o done) se puede ver/descargar un PDF con logo Servigas y los campos de la orden.
2. WhatsApp y mail se comportan como en pedidos, con las reglas de contacto definidas arriba.
3. El formulario de alta y la ficha muestran el icono/logo Servigas.
