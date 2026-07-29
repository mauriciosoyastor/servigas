/**
 * Seed helpers via authenticated BFF API (same cookies as Playwright context).
 * Prefer API for create/prereq; browser only for confirm/publish/checkout/move clicks.
 */

/**
 * @param {import('@playwright/test').APIRequestContext} request
 */
async function json(request, path, opts = {}) {
  const res = await request.fetch(path, {
    ...opts,
    headers: {
      "content-type": "application/json",
      ...(opts.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  return { res, body, status: res.status() };
}

export { json };

/**
 * @param {import('@playwright/test').APIRequestContext} request
 */
export async function pickPartnerAndProduct(request) {
  const customers = await json(request, "/api/lists/sales/customers");
  const products = await json(request, "/api/lists/inventory/products");
  if (!customers.res.ok()) {
    throw new Error(`customers list ${customers.status}`);
  }
  if (!products.res.ok()) {
    throw new Error(`products list ${products.status}`);
  }
  const partnerId = Number(customers.body.rows?.[0]?.id);
  const row = products.body.rows?.[0];
  const productId = Number(
    row?.product_variant_id || row?.product_id || row?.id
  );
  if (!partnerId || !productId) {
    throw new Error(
      `missing partner/product partner=${partnerId} product=${productId}`
    );
  }
  return { partnerId, productId };
}

/**
 * Creates a draft quotation. Returns id + detailPath.
 * @param {import('@playwright/test').APIRequestContext} request
 */
export async function createQuotation(request, partnerId, productId) {
  const { res, body, status } = await json(
    request,
    "/api/records/sales/quotations",
    {
      method: "POST",
      data: JSON.stringify({
        action: "create",
        values: {
          partnerId,
          lines: [{ productId, qty: 1 }],
        },
      }),
    }
  );
  if (!res.ok() || !body.id) {
    throw new Error(
      `create quotation failed ${status} ${JSON.stringify(body).slice(0, 300)}`
    );
  }
  const id = Number(body.id);
  return {
    id,
    detailPath: body.detailPath || `/lists/sales/quotations/${id}`,
  };
}

/**
 * Creates customer invoice draft from confirmed sale order.
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {number} orderId
 */
export async function createInvoiceFromOrder(request, orderId) {
  const { res, body, status } = await json(
    request,
    "/api/records/sales/orders",
    {
      method: "POST",
      data: JSON.stringify({ action: "create_invoice", id: orderId }),
    }
  );
  if (!res.ok() || !body.id) {
    throw new Error(
      `create_invoice failed ${status} ${JSON.stringify(body).slice(0, 300)}`
    );
  }
  const id = Number(body.id);
  return {
    id,
    detailPath:
      body.detailPath || `/lists/accounting/customer-invoices/${id}`,
  };
}

/**
 * Creates a draft customer invoice (FC).
 * @param {import('@playwright/test').APIRequestContext} request
 */
export async function createCustomerInvoiceDraft(
  request,
  partnerId,
  productId
) {
  const { res, body, status } = await json(
    request,
    "/api/records/accounting/customer-invoices",
    {
      method: "POST",
      data: JSON.stringify({
        action: "create",
        values: {
          partnerId,
          lines: [{ productId, qty: 1, price: 100 }],
        },
      }),
    }
  );
  if (!res.ok() || !body.id) {
    throw new Error(
      `create FC failed ${status} ${JSON.stringify(body).slice(0, 300)}`
    );
  }
  const id = Number(body.id);
  return {
    id,
    detailPath:
      body.detailPath || `/lists/accounting/customer-invoices/${id}`,
  };
}

/**
 * Publishes (confirms) a draft customer invoice.
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {number} invoiceId
 */
export async function publishCustomerInvoice(request, invoiceId) {
  const { res, body, status } = await json(
    request,
    "/api/records/accounting/customer-invoices",
    {
      method: "POST",
      data: JSON.stringify({ action: "confirm", id: invoiceId }),
    }
  );
  if (!res.ok() || !(body.state === "posted" || body.ok === true)) {
    throw new Error(
      `publish FC failed ${status} ${JSON.stringify(body).slice(0, 300)}`
    );
  }
  return body;
}

/**
 * Seed: FC publicada lista para cobrar (API only).
 * @param {import('@playwright/test').APIRequestContext} request
 */
export async function seedPostedCustomerInvoice(request) {
  const { partnerId, productId } = await pickPartnerAndProduct(request);
  const draft = await createCustomerInvoiceDraft(
    request,
    partnerId,
    productId
  );
  await publishCustomerInvoice(request, draft.id);
  return draft;
}

/**
 * @param {import('@playwright/test').APIRequestContext} request
 * @returns {Promise<{ isOpen: boolean, sessionId: number, expectedCash: number }>}
 */
export async function getCashHub(request) {
  const { res, body, status } = await json(request, "/api/caja");
  if (!res.ok()) {
    throw new Error(`caja hub ${status} ${JSON.stringify(body).slice(0, 200)}`);
  }
  const openSession = body.openSession || body.session || null;
  const sessionId =
    Number(openSession?.id) ||
    Number(body.session?.id) ||
    Number(body.openSession?.id) ||
    0;
  const isOpen = Boolean(
    sessionId > 0 || body.open === true || body.isOpen === true
  );
  const expectedCash = Number(body.summary?.expectedCash ?? 0);
  return { isOpen, sessionId, expectedCash, body };
}

/**
 * Ensures a cash session is open (API). Idempotent if already open.
 * @param {import('@playwright/test').APIRequestContext} request
 */
export async function ensureCashOpen(request) {
  const hub = await getCashHub(request);
  if (hub.isOpen) return { ...hub, openedByUs: false };

  const { res, body, status } = await json(request, "/api/caja/open", {
    method: "POST",
    data: JSON.stringify({
      openingBalance: 1000,
      shift: "manana",
      note: "e2e-ensure-cash-open",
    }),
  });
  const sessionId =
    Number(body.session?.id) || Number(body.id) || 0;
  if (!res.ok() || sessionId <= 0) {
    throw new Error(
      `caja open failed ${status} ${JSON.stringify(body).slice(0, 300)}`
    );
  }
  return {
    isOpen: true,
    sessionId,
    expectedCash: Number(body.summary?.expectedCash ?? 1000),
    openedByUs: true,
    body,
  };
}

/**
 * @param {import('@playwright/test').APIRequestContext} request
 */
export async function pickVendorAndProduct(request) {
  const vendors = await json(request, "/api/lists/purchase/vendors");
  const products = await json(request, "/api/lists/inventory/products");
  if (!vendors.res.ok()) {
    throw new Error(`vendors list ${vendors.status}`);
  }
  if (!products.res.ok()) {
    throw new Error(`products list ${products.status}`);
  }
  const partnerId = Number(vendors.body.rows?.[0]?.id);
  const row = products.body.rows?.[0];
  const productId = Number(
    row?.product_variant_id || row?.product_id || row?.id
  );
  if (!partnerId || !productId) {
    throw new Error(
      `missing vendor/product partner=${partnerId} product=${productId}`
    );
  }
  return { partnerId, productId };
}

/**
 * Creates a purchase RFQ (solicitud). Detail lives under /lists/purchase/orders/:id.
 * @param {import('@playwright/test').APIRequestContext} request
 */
export async function createPurchaseRfq(request, partnerId, productId) {
  const { res, body, status } = await json(
    request,
    "/api/records/purchase/solicitudes",
    {
      method: "POST",
      data: JSON.stringify({
        action: "create",
        values: {
          partnerId,
          lines: [{ productId, qty: 1, price: 50 }],
        },
      }),
    }
  );
  if (!res.ok() || !body.id) {
    throw new Error(
      `create RFQ failed ${status} ${JSON.stringify(body).slice(0, 300)}`
    );
  }
  const id = Number(body.id);
  return {
    id,
    detailPath: body.detailPath || `/lists/purchase/orders/${id}`,
  };
}

/**
 * Confirms PO via API. Returns picking ids scraped from order HTML.
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {number} orderId
 */
export async function confirmPurchaseOrder(request, orderId) {
  const { res, body, status } = await json(
    request,
    "/api/records/purchase/solicitudes",
    {
      method: "POST",
      data: JSON.stringify({ action: "confirm", id: orderId }),
    }
  );
  if (!res.ok() || !(body.state === "purchase" || body.ok === true)) {
    throw new Error(
      `confirm PO failed ${status} ${JSON.stringify(body).slice(0, 300)}`
    );
  }
  const htmlRes = await request.get(`/lists/purchase/orders/${orderId}`);
  const html = await htmlRes.text();
  const pickingIds = [
    ...html.matchAll(/\/lists\/inventory\/transfers\/(\d+)/g),
  ].map((m) => Number(m[1]));
  return { pickingIds: [...new Set(pickingIds)], body };
}

/**
 * Seed: OC confirmada con al menos un picking (API).
 * @param {import('@playwright/test').APIRequestContext} request
 */
export async function seedConfirmedPurchaseWithPicking(request) {
  const { partnerId, productId } = await pickVendorAndProduct(request);
  const rfq = await createPurchaseRfq(request, partnerId, productId);
  const { pickingIds } = await confirmPurchaseOrder(request, rfq.id);
  if (!pickingIds.length) {
    throw new Error(`no pickings after confirm PO ${rfq.id}`);
  }
  return { ...rfq, pickingId: pickingIds[0], pickingIds };
}

const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/**
 * Creates a sales customer with email (for share mail CTA).
 * @param {import('@playwright/test').APIRequestContext} request
 */
export async function createCustomerWithEmail(request, nameSuffix = "") {
  const stamp = Date.now();
  const { res, body, status } = await json(
    request,
    "/api/records/sales/customers",
    {
      method: "POST",
      data: JSON.stringify({
        action: "create",
        values: {
          name: `E2E Share ${nameSuffix || stamp}`,
          email: `e2e.share.${stamp}@example.com`,
          phone: "11 5555-0000",
          sg_invoice_dest: "cf",
        },
      }),
    }
  );
  if (!res.ok() || !body.id) {
    throw new Error(
      `create customer failed ${status} ${JSON.stringify(body).slice(0, 300)}`
    );
  }
  return {
    id: Number(body.id),
    email: `e2e.share.${stamp}@example.com`,
  };
}

/**
 * Seed: cotización con cliente que tiene mail.
 * @param {import('@playwright/test').APIRequestContext} request
 */
export async function seedQuotationWithCustomerEmail(request) {
  const products = await json(request, "/api/lists/inventory/products");
  const row = products.body.rows?.[0];
  const productId = Number(
    row?.product_variant_id || row?.product_id || row?.id
  );
  if (!productId) throw new Error("no product for share seed");
  const customer = await createCustomerWithEmail(request);
  const quotation = await createQuotation(request, customer.id, productId);
  return { ...quotation, customer };
}

/**
 * Creates a draft vendor bill (FP) with required attachment.
 * @param {import('@playwright/test').APIRequestContext} request
 */
export async function createVendorBillDraft(request, partnerId, productId) {
  const { res, body, status } = await json(
    request,
    "/api/records/accounting/vendor-bills",
    {
      method: "POST",
      data: JSON.stringify({
        action: "create",
        values: {
          partnerId,
          billSource: "whatsapp",
          lines: [{ productId, qty: 1, price: 50 }],
          attachment: {
            filename: "fp-e2e.png",
            mimetype: "image/png",
            content: TINY_PNG_B64,
          },
        },
      }),
    }
  );
  if (!res.ok() || !body.id) {
    throw new Error(
      `create FP failed ${status} ${JSON.stringify(body).slice(0, 300)}`
    );
  }
  const id = Number(body.id);
  return {
    id,
    detailPath: body.detailPath || `/lists/accounting/vendor-bills/${id}`,
  };
}

/**
 * Seed: FP borrador lista para publicar (API).
 * @param {import('@playwright/test').APIRequestContext} request
 */
export async function seedVendorBillDraft(request) {
  const { partnerId, productId } = await pickVendorAndProduct(request);
  return createVendorBillDraft(request, partnerId, productId);
}

/**
 * Confirms a quotation via API (state=sale). Same id is the sale order.
 * @param {import('@playwright/test').APIRequestContext} request
 * @param {number} quotationId
 */
export async function confirmQuotation(request, quotationId) {
  const { res, body, status } = await json(
    request,
    "/api/records/sales/quotations",
    {
      method: "POST",
      data: JSON.stringify({ action: "confirm", id: quotationId }),
    }
  );
  if (!res.ok() || !(body.state === "sale" || body.ok === true)) {
    throw new Error(
      `confirm quotation failed ${status} ${JSON.stringify(body).slice(0, 300)}`
    );
  }
  return {
    id: quotationId,
    detailPath: `/lists/sales/orders/${quotationId}`,
    body,
  };
}

/**
 * Seed: pedido confirmado listo para Crear FC (API).
 * @param {import('@playwright/test').APIRequestContext} request
 */
export async function seedConfirmedSaleOrder(request) {
  const { partnerId, productId } = await pickPartnerAndProduct(request);
  const quotation = await createQuotation(request, partnerId, productId);
  return confirmQuotation(request, quotation.id);
}

/** 1×1 PNG bytes for file uploads in browser. */
export function tinyPngBuffer() {
  return Buffer.from(TINY_PNG_B64, "base64");
}

/** CSV that creates a unique product via price-list import. */
export function uniqueCreateProductCsv() {
  const stamp = Date.now();
  const code = `E2E-${stamp}`;
  const barcode = `779${String(stamp).slice(-10)}`;
  const name = `E2E Import ${stamp}`;
  const csv =
    "barcode,default_code,name,list_price,standard_price\n" +
    `${barcode},${code},${name},1234.00,500.00\n`;
  return { csv, code, barcode, name };
}
