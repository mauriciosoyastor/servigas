# Checklist — Ubicaciones internas Servigas

> Setup único de inventario: **Recepción → Depósito → Mostrador**.  
> Quién: admin Odoo (o quien configure el local). El **conteo físico** lo hace el vendedor después, producto por producto.

## Analogía (1 minuto)

El depósito no es un solo cajón. Son tres “bandejas”:

| Bandeja | Qué significa |
|---------|----------------|
| **Recepción** | Acaba de llegar del proveedor; todavía no acomodaron |
| **Depósito** | Guardado atrás / en cajas |
| **Mostrador** | A la mano para vender (lo que baja el POS) |

```text
Proveedor → Recepción → Depósito → Mostrador → Cliente
```

---

## Antes de empezar

- [ ] Entrás a Odoo como **administrador** (Settings), no como operativo Astro
- [ ] Módulo **Inventario** instalado
- [ ] Hay al menos un almacén (por defecto suele ser `WH` / “Almacén”)
- [ ] Anotá el nombre del almacén que usan (ej. `WH` o `Servigas`)

---

## 1) Crear / verificar las 3 ubicaciones

En Odoo (admin): **Inventario → Configuración → Ubicaciones**  
(si no ves Configuración: activá modo desarrollador o pedí a quien tenga Settings)

Para cada fila, creá o confirmá que exista **bajo el almacén** (ubicaciones internas hijas de `WH/Stock` o equivalente):

| # | Nombre sugerido | Tipo | Notas |
|---|-----------------|------|--------|
| 1 | `Recepción` | Internal Location | Entrada de compras |
| 2 | `Depósito` | Internal Location | Stock de fondo |
| 3 | `Mostrador` | Internal Location | Stock de venta / POS |

Checklist por ubicación:

- [ ] **Recepción** creada (o renombrada desde una existente tipo Input)
- [ ] **Depósito** creada (o es el Stock principal renombrado / hija clara)
- [ ] **Mostrador** creada
- [ ] Las tres son del **mismo almacén** (no mezclar compañías ni almacenes fantasma)
- [ ] Nombres legibles en español (como arriba); evitá códigos crípticos para el vendedor

> Tip Odoo: muchos almacenes ya traen `WH/Input`, `WH/Stock`, `WH/Output`.  
> Podés **reutilizar y renombrar** en lugar de duplicar:
> - Input → Recepción  
> - Stock → Depósito  
> - (nueva interna) → Mostrador  

---

## 2) Enlazar operaciones al flujo

### Compras / recepción

- [ ] Al validar una recepción de compra, el stock entra en **Recepción** (o en la ubicación de entrada del almacén que mapeaste)
- [ ] Probar con **1 producto de prueba**: pedido de compra → recibir → ver existencias en Recepción

### Transferencias internas (día a día)

- [ ] El equipo sabe hacer: **Inventario → Operaciones → Transferencias** (o equivalente)
- [ ] Flujo acordado:
  - [ ] Acomodar: **Recepción → Depósito**
  - [ ] Reponer vidriera: **Depósito → Mostrador**
- [ ] Probar 1 transferencia chica (ej. 2 unidades) y verificar cantidades en cada ubicación

### Punto de venta (Mostrador Servigas)

- [ ] Abrir config del POS **Mostrador Servigas**
- [ ] Ubicación de stock del POS = **Mostrador** (no Depósito ni Recepción)
- [ ] Venta de prueba de 1 unidad → baja stock solo en **Mostrador**

---

## 3) Verificación rápida (go / no-go)

Hacé este circuito con un SKU de prueba (puede ser el de smoke):

| Paso | Acción | Esperado | OK |
|------|--------|----------|----|
| A | Recibir compra (o ajuste) en Recepción | Cantidad > 0 en Recepción | [ ] |
| B | Transferir a Depósito | Baja Recepción / sube Depósito | [ ] |
| C | Transferir parte a Mostrador | Baja Depósito / sube Mostrador | [ ] |
| D | Vender 1 en caja Astro o POS | Baja solo Mostrador | [ ] |
| E | Ver existencias por ubicación | Las 3 bandejas cuadran con el relato | [ ] |

Si A–E pasan: **ubicaciones listas**. Recién ahí tiene sentido el conteo físico masivo del vendedor.

---

## 4) Después: conteo físico (vendedor)

Esto **no** es esta checklist; queda para el vendedor:

- [ ] Contar Mostrador (prioridad: es lo que se vende)
- [ ] Contar Depósito
- [ ] Contar Recepción (si hay bultos sin acomodar)
- [ ] Cargar ajustes en Odoo por ubicación (no un solo número global)

---

## Errores frecuentes

| Error | Por qué duele | Qué hacer |
|-------|----------------|-----------|
| Todo el stock en una sola ubicación | No sabés si falta en vidriera o en el fondo | Separar las 3 y transferir |
| POS descuenta de Depósito | Venden “de atrás” sin pasar por Mostrador | Config POS → ubicación Mostrador |
| Conteo sin ubicaciones | El ajuste mezcla bandejas | Primero cerrar §1–§3, después contar |
| Crear ubicaciones en otro almacén | Stock “desaparece” al filtrar | Misma compañía / mismo WH |

---

## Referencias

- Alcance: `CONTEXT.md` (Inventario con ubicaciones internas)
- Shell de trabajo del vendedor: Astro (`web/`) — listas de transferencias / productos
- Backend: Odoo Inventario (admin)
