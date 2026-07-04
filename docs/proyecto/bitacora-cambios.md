# Bitácora de cambios — Servigas

> Documento vivo: registra **qué** cambiamos, **por qué**, **dónde** y **qué se podría automatizar** en proyectos futuros.
>
> **Mantenerlo:** al cerrar cada sesión de trabajo significativa, agregar una entrada con la plantilla de abajo. Los agentes de Cursor deben leer este archivo antes de tocar tema/UI y actualizarlo al terminar.

**Relacionado:** [CONTEXT.md](../../CONTEXT.md) · [liquid-glass-odoo.md](../design/liquid-glass-odoo.md) · [owl-liquid-glass-boundaries.md](../design/owl-liquid-glass-boundaries.md) · [servigas-brand.md](../design/servigas-brand.md)

---

## Cómo usar esta bitácora

| Rol | Acción |
|-----|--------|
| **Humano** | Revisa el backlog de automatización al planificar un cliente nuevo |
| **Agente Cursor** | Añade entrada al implementar; marca oportunidades de script/plantilla |
| **Futuro yo** | Copia la sección «Kit reutilizable» como base para otro Odoo + marca |

### Plantilla para nuevas entradas

```markdown
### YYYY-MM-DD — Título breve

**Área:** tema | datos | POS | compras | infra | docs | …
**Motivo:** por qué se hizo
**Archivos:** lista de paths tocados
**Cambios:** bullets concretos
**Verificación:** comando o paso manual para validar
**Automatización:** qué se podría templatizar / scriptear (o «ninguna»)
```

---

## Resumen ejecutivo (estado al 2026-07-03)

| Área | Estado | Notas |
|------|--------|-------|
| Identidad visual | Hecho | Tokens llama + Montserrat (`servigas_tokens.scss`) |
| Backend Odoo | Hecho | Navbar, acentos flame, `servigas_hub.scss` |
| Hubs App Shell | **Hecho** | Inventario, Ventas, Compras, Facturación (`v19.0.1.4.0`) |
| POS | En curso | Tema oscuro + glass en header |
| Catálogo / datos | Hecho | 8.767 SKU importados |
| Facturación fiscal | Pendiente | Factura Web manual por ahora |
| Web pública (`web/`) | Iniciado | Astro scaffold, sin integrar aún |
| Infra GitHub (`main`) | Documentado | Ruleset versionado; aplicar con script o UI |

**Docs de referencia hubs:** [plan-hub-rail-kpi-ingreso.md](./plan-hub-rail-kpi-ingreso.md) · [plan-liquid-glass-kpi-routes.md](./plan-liquid-glass-kpi-routes.md)

---

## Entradas

### 2026-07-04 — Guardrails OWL + Liquid Glass v2

**Área:** docs  
**Motivo:** documentar límites técnicos de OWL/Odoo para que agentes y humanos avisen cuando una propuesta de UI no es viable, y guiar el diseño moderno máximo sin romper funcionalidad.

**Archivos:**
- `docs/design/owl-liquid-glass-boundaries.md` *(nuevo)*
- `CONTEXT.md`
- `docs/proyecto/bitacora-cambios.md` *(este archivo)*

**Cambios:**
- Doc guardrails: stack OWL, capas S/O/X, tabla propuestas inviables (§5.1), árbol de decisión, invariantes LG v2, protocolo agentes, alcance N1–N5.
- `CONTEXT.md`: enlace al doc + regla #2 para agentes (avisar antes de implementar propuestas fuera de alcance).
- Bitácora: enlace cruzado al nuevo doc.

**Verificación:** agente lee `owl-liquid-glass-boundaries.md` antes de proponer cambios UI; propuesta tipo «glass en cada fila de lista» debe generar aviso §10.

**Automatización:** skill Cursor local `servigas-owl-ui-guardrails` (backlog) que referencie este doc + `liquid-glass-v2-routes`.

---

### 2026-07-03 — Bitácora: kit automatización hubs App Shell

**Área:** docs  
**Motivo:** documentar cómo replicar rails + KPI cards en futuros proyectos Odoo sin reimplementar desde cero.

**Archivos:**
- `docs/proyecto/bitacora-cambios.md` *(este archivo)*

**Cambios:**
- Sección **Kit reutilizable — App Hub Shell** (checklist, mapa 4 apps, contrato `sg.hub.card`).
- Propuesta **`hub.yaml`** + comando `scaffold_odoo_hub.py` (backlog A9–A10).
- Refactor **hub OWL genérico** (A11), skill Cursor (A12), tests smoke (A13).
- Tabla errores frecuentes y verificación estándar.
- Resumen ejecutivo actualizado: hubs **Hecho** en v19.0.1.4.0.

**Verificación:** agente o humano sigue checklist «Por cada app Odoo» en nuevo repo.

**Automatización:** implementar A9–A13 en repo `odoo-hub-scaffold` o script en `scripts/`.

---

### 2026-
