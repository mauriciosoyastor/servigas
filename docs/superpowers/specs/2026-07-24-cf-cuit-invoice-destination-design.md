# Design: Destino fiscal CF vs CUIT (arco facturación)

**Fecha:** 2026-07-24  
**Estado:** approved (fase 1 en implementación)  
**Repo:** servigas (`custom_addons/servigas_core`, `web/`)  
**Usuario día a día:** administrativo de mostrador  
**Relacionado:** [astro-partner-vat-create](./2026-07-23-astro-partner-vat-create-design.md) · `CONTEXT.md` (contabilidad operativa → Factura Web → AFIP)

## Problema

Servigas ya carga **CUIT opcional** (`vat`) y domicilio mínimo en clientes, y el hub Contabilidad lista FC/FP/NC en modo consulta. Falta un modelo explícito de **a quién va la factura fiscal**:

- **CF** = Consumidor final  
- **CUIT** = cliente con CUIT (empresa / monotributista / responsable)

Sin ese destino, el mostrador no distingue el camino fiscal, y las fases siguientes (FC en Astro, Factura Web, AFIP) adivinan.

## Meta

Que el administrativo sepa, en cada cliente y en cada venta, si el destino fiscal es **CF** o **CUIT**, sin emitir AFIP todavía. La venta operativa (POS) sigue registrándose siempre.

## Arco acordado (1 → 2 → 3)

| Fase | Nombre | Entrega |
|------|--------|---------|
| **1** | Datos + reglas UX | Clasificar cliente CF/CUIT; validar CUIT si corresponde; visible en ficha, listas y POS |
| **2** | FC con destino | Crear/publicar FC en Astro eligiendo/heredando CF o CUIT |
| **3** | AFIP / `l10n_ar` | Tipos de comprobante e emisión electrónica |

Este documento especifica **fase 1** en detalle y deja **fase 2/3** como backlog + paquetes comerciales.

## Glosario (pedagógico)

| Sigla | Significado |
|-------|-------------|
| **FC** | Factura de cliente (lo que emitís) |
| **FP** | Factura de proveedor (lo que te emiten) |
| **NC** | Nota de crédito (anula/descuenta) |
| **CF** | Consumidor final |
| **CUIT** | Clave fiscal del destinatario |
| **IIBB** | Ingresos Brutos (provincial; fuera de fase 1) |

Analogía fase 1: etiqueta en la ficha del cliente.  
Fase 2: emitir la carta (FC).  
Fase 3: sello oficial (AFIP).

**Fuera de alcance absoluto:** cualquier flujo de venta oculta al fisco (“facturación en negro”). Solo se modelan comprobante operativo vs fiscal, y destino CF vs CUIT.

---

## Fase 1 — Diseño detallado

### Decisión de producto

1. Nuevo campo en `res.partner` (clientes): destino fiscal **CF** | **CUIT**.  
2. Default al alta: **CF**.  
3. Si destino = **CUIT** → `vat` obligatorio al guardar.  
4. Si destino = **CF** → `vat` opcional (como hoy).  
5. Badge **CF** / **CUIT** en lista, ficha y selector de cliente del POS.  
6. Cobro POS **nunca** se bloquea por falta de CUIT (aviso informativo solamente).  
7. Proveedores: fuera de fase 1 (el destino es de FC, no de FP).

### Modelo de datos

| Campo | Modelo | Tipo | Valores | Regla |
|-------|--------|------|---------|--------|
| `sg_invoice_dest` | `res.partner` | Selection | `cf` · `cuit` | Obligatorio; default `cf` |
| `vat` | `res.partner` | Char (existente) | CUIT | Obligatorio si `sg_invoice_dest = cuit` |
| `street`, `city` | `res.partner` | Char (existentes) | texto | Recomendados si CUIT; obligatorios al emitir FC (fase 2) |

**Derivación UI:** badge desde `sg_invoice_dest`.  
**No auto-cambiar** destino solo porque haya `vat`: un CF puede tener CUIT cargado “por las dudas”.

**Módulo:** `servigas_core` (campo + label ES-AR).  
**Shell:** allowlist BFF create/update/read en listas de clientes.

### UX

**Alta / edición cliente**

- Selector: **Consumidor final** | **Con CUIT** (copy visible; no mostrar nombre técnico del campo).  
- Destino CUIT → CUIT obligatorio; `street`/`city` recomendados.  
- Destino CF → CUIT opcional.

**Lista clientes**

- Columna o badge CF/CUIT.  
- Búsqueda por `vat` se mantiene.

**POS**

- Al elegir cliente, mostrar badge CF/CUIT.  
- Si destino CUIT y falta `vat`: aviso no bloqueante: *“Falta CUIT; completá la ficha antes de facturar.”*  
- Cobro operativo sigue OK.

**Hub Contabilidad**

- Sin pantallas nuevas de alta FC en fase 1.

### Flujo de datos

```text
Alta/edición cliente → sg_invoice_dest + vat
        ↓
Lista / ficha / POS muestran badge CF|CUIT
        ↓
Cobro POS siempre permitido
        ↓
(Fase 2) Emitir FC hereda destino del partner
        ↓
(Fase 3) AFIP mapea destino → tipo de comprobante
```

### Errores (copy ES-AR)

| Caso | Comportamiento | Mensaje |
|------|----------------|---------|
| Guardar cliente destino CUIT sin `vat` | Bloquea save (BFF/Odoo constraint) | “Este cliente es Con CUIT: cargá el CUIT para guardar.” |
| POS + destino CUIT sin `vat` | Aviso; no bloquea cobro | “Falta CUIT; completá la ficha antes de facturar.” |

### Arquitectura técnica

1. **Odoo** (`servigas_core`): campo `sg_invoice_dest` en `res.partner`; constraint o `@api.constrains` si destino CUIT ⇒ `vat` no vacío; bump versión módulo.  
2. **BFF** (`web/src/lib/shell/record-writes.ts`, `odoo-adapter` / allowlists): incluir `sg_invoice_dest` en create/update/read de clientes.  
3. **UI Astro**: forms `customers/new` + ficha edit; columna/badge en lista; badge en selector POS.  
4. **Validación BFF**: si `sg_invoice_dest === 'cuit'` y `vat` vacío → 400 con mensaje de arriba (defensa en profundidad además del constraint Odoo).

### No-objetivos fase 1

- Crear/publicar FC desde Astro  
- Automatizar Factura Web  
- AFIP / `l10n_ar` / tipos A-B-C  
- IIBB / responsabilidad IVA  
- Checksum CUIT  
- Proveedores con destino fiscal  
- Bloquear cobro POS por datos fiscales incompletos  

### Verificación fase 1

- Unit: partner destino CUIT sin `vat` falla; CF sin `vat` ok.  
- Unit/UI: create cliente con destino; lista/POS muestran badge.  
- Smoke POS: cobro con cliente CUIT incompleto **no** falla.  
- Upgrade módulo: `-u servigas_core` en `servigas_dev`.

### Éxito fase 1

- Admin alta/edita cliente CF o CUIT.  
- Lista y POS muestran badge.  
- No se persiste “Con CUIT” sin CUIT.  
- Cobro POS no se rompe.

---

## Fase 2 — FC con destino

Arco D secuencial:

| Entrega | Spec | Estado |
|---------|------|--------|
| **2a** | [fc-create-publish-destino](./2026-07-24-fc-create-publish-destino-design.md) — alta manual + Publicar + badge | Implementada |
| **2b** | Crear FC desde pedido a facturar | Backlog tras 2a |

1. Alta/publicación de **FC** (`account.move` out_invoice) desde Astro.  
2. Destino heredado del partner (sin override en 2a).  
3. Si destino CUIT → exigir `vat` + domicilio mínimo antes de publicar.  
4. Lista/ficha FC con badge CF/CUIT.  
5. Puente Factura Web documentado usando esos datos (sigue manual salvo otro spec).

## Fase 3 — Backlog (AFIP / `l10n_ar`)

1. Instalar/configurar localización AR.  
2. Mapear CF/CUIT (+ condición IVA) → tipo de comprobante.  
3. Emisión electrónica.  
4. IIBB / padrones: solo si se prioriza en spec aparte.

---

## Paquetes comerciales (reutilizable)

| Paquete | Corresponde a | Incluye | No incluye |
|---------|---------------|---------|------------|
| **Operativo fiscal-ready** | Fase 1 | Destino CF/CUIT en partners, badges, validación, POS informado | Emisión FC, AFIP |
| **Facturación Astro** | Fase 2 | Crear/publicar FC con destino, listas contables de escritura básica | AFIP electrónico |
| **AFIP AR** | Fase 3 | `l10n_ar` + emisión + tipos de comprobante | IIBB avanzado salvo add-on |

Encaje Servigas-like: vender en ese orden; el núcleo operativo (stock/POS) es prerequisito, no parte de este menú fiscal.

---

## Alternativas consideradas

| Enfoque | Decisión |
|---------|----------|
| Solo AFIP de entrada | Rechazado: fuera de fase actual del repo |
| Inferir CF/CUIT solo por presencia de `vat` | Rechazado: ambiguo; CF puede tener CUIT cargado |
| Bloquear POS sin CUIT | Rechazado: rompe mostrador; fase 1 es operativa-first |
| Destino en cada venta (no en partner) | Diferido: partner es fuente de verdad; override venta = fase 2 si hace falta |

## Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Campo custom vs campos `l10n_ar` futuros | Nombre `sg_*`; fase 3 mapea, no reemplaza a ciegas |
| Datos históricos sin destino | Default `cf` en campo; migración noupdate-safe |
| Admin confunde ticket POS con FC fiscal | Copy claro; fase 2 separa emisión |

## Referencias de código actuales

- Allowlist partner `vat`/`street`/`city`: `web/src/lib/shell/record-writes.ts`  
- Alta cliente: `web/src/pages/lists/sales/customers/new.astro`  
- Hub accounting (lectura FC/FP/NC): `custom_addons/servigas_core/data/hub_accounting_data.xml` + `web/src/lib/shell/record-lists.ts`  
- Contexto fases fiscales: `CONTEXT.md`
