# Crear FC desde pedido (fase 2b) Implementation Plan

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Botón Crear FC en pedidos a facturar → FC borrador → Publicar (2a).

**Architecture:** `order-invoice.ts` allowlist + `createInvoiceFromOrder` (`_create_invoices` / wizard) + `RecordCreateInvoiceControl` en ficha pedido.

- [x] Helpers + API `create_invoice`
- [x] Adapter + UI + tests
- [x] Docs / bitácora / push
