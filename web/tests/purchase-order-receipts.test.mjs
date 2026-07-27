import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { OdooAdapter } from "../src/lib/bff/odoo-adapter.ts";
import { BffError } from "../src/lib/bff/errors.ts";
import {
  canValidatePurchaseReceipt,
  mapPurchaseOrderReceiptRow,
  purchaseOrderReceiptDetailPath,
  receiptStatusLabel,
} from "../src/lib/shell/purchase-order-receipts.ts";

describe("purchase-order-receipts helpers", () => {
  it("builds transfer detail paths and validate flags", () => {
    assert.equal(purchaseOrderReceiptDetailPath(12), "/lists/inventory/transfers/12");
    assert.equal(purchaseOrderReceiptDetailPath(0), "");
    assert.equal(canValidatePurchaseReceipt("assigned"), true);
    assert.equal(canValidatePurchaseReceipt("done"), false);
    assert.equal(receiptStatusLabel("pending"), "Pendiente");
    assert.equal(receiptStatusLabel("full"), "Completa");
    assert.equal(receiptStatusLabel(null), "Sin recepción");
  });

  it("maps picking rows with supplier and CTA path", () => {
    const row = mapPurchaseOrderReceiptRow({
      id: 44,
      name: "WH/IN/00012",
      partnerName: "Proveedor Astro",
      origin: "P00008",
      state: "assigned",
      scheduledDate: "2026-07-27",
    });
    assert.equal(row.partnerName, "Proveedor Astro");
    assert.equal(row.origin, "P00008");
    assert.equal(row.stateLabel, "Listo");
    assert.equal(row.canValidate, true);
    assert.equal(row.detailPath, "/lists/inventory/transfers/44");
  });
});

describe("OdooAdapter.getPurchaseOrderReceipts", () => {
  it("reads picking_ids and returns supplier + validate flags", async () => {
    const fetchImpl = mock.fn(async (_url, init) => {
      const body = JSON.parse(String(init.body));
      if (
        body.params.model === "purchase.order" &&
        body.params.method === "read"
      ) {
        return Response.json({
          result: [
            {
              id: 8,
              name: "P00008",
              receipt_status: "pending",
              picking_ids: [44, 45],
            },
          ],
        });
      }
      if (
        body.params.model === "stock.picking" &&
        body.params.method === "read"
      ) {
        assert.deepEqual(body.params.args[0], [44, 45]);
        return Response.json({
          result: [
            {
              id: 44,
              name: "WH/IN/00044",
              partner_id: [3, "Proveedor Astro"],
              origin: "P00008",
              state: "assigned",
              scheduled_date: "2026-07-28 10:00:00",
              picking_type_code: "incoming",
            },
            {
              id: 45,
              name: "WH/IN/00045",
              partner_id: [3, "Proveedor Astro"],
              origin: "P00008",
              state: "done",
              scheduled_date: "2026-07-20 10:00:00",
              picking_type_code: "incoming",
            },
          ],
        });
      }
      throw new Error(`unexpected ${body.params.model}.${body.params.method}`);
    });

    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl,
    });
    const out = await adapter.getPurchaseOrderReceipts("sess", 8);
    assert.equal(out.orderName, "P00008");
    assert.equal(out.receiptStatus, "pending");
    assert.equal(out.receiptStatusLabel, "Pendiente");
    assert.equal(out.pickings.length, 2);
    assert.equal(out.pickings[0].partnerName, "Proveedor Astro");
    assert.equal(out.pickings[0].canValidate, true);
    assert.equal(out.pickings[1].canValidate, false);
    assert.equal(out.pickings[0].detailPath, "/lists/inventory/transfers/44");
  });

  it("returns empty pickings when OC has none", async () => {
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl: async () =>
        Response.json({
          result: [
            {
              id: 9,
              name: "P00009",
              receipt_status: false,
              picking_ids: [],
            },
          ],
        }),
    });
    const out = await adapter.getPurchaseOrderReceipts("sess", 9);
    assert.equal(out.pickings.length, 0);
    assert.equal(out.receiptStatusLabel, "Sin recepción");
  });

  it("rejects invalid ids", async () => {
    const adapter = new OdooAdapter({
      baseUrl: "http://odoo.test",
      db: "servigas_dev",
      fetchImpl: async () => Response.json({ result: [] }),
    });
    await assert.rejects(
      () => adapter.getPurchaseOrderReceipts("sess", 0),
      (err) => err instanceof BffError && err.code === "not_found"
    );
  });
});
