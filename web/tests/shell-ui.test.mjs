import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) =>
  readFile(new URL(`../src/${path}`, import.meta.url), "utf8");

describe("shell UI contracts", () => {
  it("loads shared tokens and shell styles globally", async () => {
    const css = await source("styles/global.css");

    assert.match(css, /@import "\.\/tokens\.css"/);
    assert.match(css, /@import "\.\/shell\.css"/);
    assert.match(css, /@import "\.\/list\.css"/);
  });

  it("provides the requested shell components", async () => {
    const [layout, rail, tile, note, table] = await Promise.all([
      source("layouts/ShellLayout.astro"),
      source("components/RailNav.astro"),
      source("components/TileCard.astro"),
      source("components/ComingSoonNote.astro"),
      source("components/RecordTable.astro"),
    ]);

    assert.match(layout, /<RailNav active=/);
    assert.match(rail, /\/hubs\/inventory/);
    assert.match(rail, /\/hubs\/sales/);
    assert.match(tile, /data-tile/);
    assert.match(tile, /data-kpi|sg-tile-kpi/);
    assert.match(note, /Próximamente/);
    assert.match(table, /sg-record-table/);
    assert.match(table, /sg-record-thumb/);
  });

  it("posts login credentials to the BFF before navigating home", async () => {
    const login = await source("pages/login.astro");

    assert.match(login, /fetch\(["']\/api\/auth\/login["']/);
    assert.match(login, /location\.(?:assign|href)/);
  });

  it("protects and renders the launcher using tile navigation", async () => {
    const index = await source("pages/index.astro");

    assert.match(index, /requireOdooSession\(Astro\.cookies\)/);
    assert.match(index, /getLauncher\(odooSessionId\)/);
    assert.match(index, /invalidateBffSession\(Astro\.cookies\)/);
    assert.match(index, /Astro\.redirect\(["']\/login["']\)/);
    assert.match(index, /resolveTileNavigation/);
  });

  it("validates Odoo before redirecting an existing session from login", async () => {
    const login = await source("pages/login.astro");

    assert.match(login, /validateSession\(odooSessionId\)/);
    assert.match(login, /invalidateBffSession\(Astro\.cookies\)/);
  });

  it("renders known hubs and routes allowlisted cards into Astro lists", async () => {
    const hub = await source("pages/hubs/[app].astro");

    assert.match(hub, /isHubApp\(app\)/);
    assert.match(hub, /getBackend\(\)\.getHub\(odooSessionId,\s*app,\s*requestedSection\)/);
    assert.match(hub, /<HubSubnav/);
    assert.match(hub, /searchParams\.get\(['"]section['"]\)/);
    assert.match(hub, /payload\.groups/);
    assert.match(hub, /sg-hub-group/);
    assert.match(hub, /resolveTileNavigation/);
    assert.match(hub, /destination\.kind === ['"]list['"]/);
  });

  it("renders allowlisted lists from the BFF with search toolbar", async () => {
    const page = await source("pages/lists/[...slug].astro");

    assert.match(page, /getRecordList\(odooSessionId,\s*listKey/);
    assert.match(page, /<RecordTable/);
    assert.match(page, /<ListToolbar/);
    assert.match(page, /Sin resultados/);
    assert.match(page, /active=\{def\.railApp\}/);
  });

  it("renders product detail from the BFF", async () => {
    const page = await source("pages/lists/inventory/products/[id].astro");
    const body = await source("components/RecordDetailBody.astro");

    assert.match(page, /loadRecordDetail\(/);
    assert.match(page, /['"]inventory\/products['"]/);
    assert.match(page, /RecordDetailBody/);
    assert.match(body, /sg-detail/);
  });

  it("renders sale order detail from the BFF", async () => {
    const page = await source("pages/lists/sales/orders/[id].astro");
    assert.match(page, /loadRecordDetail\(/);
    assert.match(page, /['"]sales\/orders['"]/);
    assert.match(page, /RecordDetailBody/);
  });

  it("renders POS caja with catalog BFF and cart controls", async () => {
    const page = await source("pages/pos.astro");
    assert.match(page, /getPosCatalog\(/);
    assert.match(page, /data-pos-caja/);
    assert.match(page, /\/api\/pos\/checkout/);
    assert.match(page, /\/lists\/sales\/pos-orders/);
    assert.match(page, /addToCart|cartTotal/);
    assert.match(page, /data-pos-pay-method|paymentMethods/);
    assert.match(page, /data-pos-numpad|data-np-mode/);
    assert.match(page, /sg-pos-scroll|overscroll-behavior/);
    assert.match(page, /sg-pos-line-thumb|data-line-thumb/);
    assert.match(page, /data-line-disc|data-pos-order-disc/);
    assert.match(page, /setCartDiscount|checkoutLinesFromCart/);
    assert.match(page, /data-pos-receipt/);
    assert.match(page, /Nueva venta/);
  });

  it("renders invoice and customer detail pages", async () => {
    const invoice = await source("pages/lists/accounting/customer-invoices/[id].astro");
    const customer = await source("pages/lists/sales/customers/[id].astro");
    assert.match(invoice, /['"]accounting\/customer-invoices['"]/);
    assert.match(customer, /['"]sales\/customers['"]/);
  });

  it("renders transfer detail page", async () => {
    const page = await source("pages/lists/inventory/transfers/[id].astro");
    assert.match(page, /['"]inventory\/transfers['"]/);
    assert.match(page, /RecordDetailBody/);
  });

  it("renders order lines block in record detail body", async () => {
    const body = await source("components/RecordDetailBody.astro");
    assert.match(body, /detail\.lines/);
    assert.match(body, /sg-detail-lines/);
  });

  it("renders Apps and Settings landings", async () => {
    const apps = await source("pages/apps.astro");
    const settings = await source("pages/settings.astro");
    assert.match(apps, /Aplicaciones/);
    assert.match(apps, /href=\"\/\"/);
    assert.match(settings, /Ajustes/);
    assert.match(settings, /\/lists\/integrations/);
  });

  it("renders credit-note and variant detail pages", async () => {
    const credit = await source("pages/lists/accounting/credit-notes/[id].astro");
    const variant = await source("pages/lists/inventory/variants/[id].astro");
    assert.match(credit, /['"]accounting\/credit-notes['"]/);
    assert.match(variant, /['"]inventory\/variants['"]/);
  });

  it("provides generic allowlisted detail route", async () => {
    const page = await source("pages/lists/[app]/[list]/[id].astro");
    assert.match(page, /getRecordListDef\(listKey\)/);
    assert.match(page, /loadRecordDetail\(/);
    assert.match(page, /RecordDetailBody/);
  });

  it("renders customer detail with allowlisted edit form", async () => {
    const page = await source("pages/lists/sales/customers/[id].astro");
    assert.match(page, /RecordEditForm|data-record-edit/);
    assert.match(page, /\/api\/records\/sales\/customers/);
    assert.match(page, /phone|email/);
    assert.match(page, /RecordArchiveControl|data-record-archive/);
  });

  it("renders partner create pages and list create CTA", async () => {
    const customerNew = await source("pages/lists/sales/customers/new.astro");
    const vendorNew = await source("pages/lists/purchase/vendors/new.astro");
    const createForm = await source("components/RecordCreateForm.astro");
    const listPage = await source("pages/lists/[...slug].astro");
    assert.match(customerNew, /RecordCreateForm/);
    assert.match(createForm, /action:\s*['"]create['"]/);
    assert.match(vendorNew, /purchase\/vendors/);
    assert.match(listPage, /canCreateRecord/);
    assert.match(listPage, /sg-list-create|Nuevo cliente/);
  });

  it("renders product create/archive and quotation confirm", async () => {
    const productNew = await source("pages/lists/inventory/products/new.astro");
    const productDetail = await source("pages/lists/inventory/products/[id].astro");
    const quote = await source("pages/lists/sales/quotations/[id].astro");
    const po = await source("pages/lists/purchase/orders/[id].astro");
    assert.match(productNew, /inventory\/products/);
    assert.match(productDetail, /RecordArchiveControl|Archivar producto/);
    assert.match(quote, /RecordConfirmControl|Confirmar pedido/);
    assert.match(po, /Confirmar OC|purchase\/rfq/);
  });

  it("renders quotation create page with searchable pickers", async () => {
    const page = await source("pages/lists/sales/quotations/new.astro");
    const form = await source("components/OrderCreateForm.astro");
    assert.match(page, /OrderCreateForm/);
    assert.match(page, /partnerListKey=["']sales\/customers["']/);
    assert.match(page, /productListKey=["']inventory\/variants["']/);
    assert.match(form, /data-order-picker/);
    assert.match(form, /data-picker-query/);
    assert.match(form, /name=["']partnerId["']/);
    assert.match(form, /name=["']productId["']/);
    assert.match(form, /\/api\/lists\//);
    assert.match(form, /action:\s*['"]create['"]/);
    assert.doesNotMatch(form, /<select/);
  });

  it("renders RFQ create page with searchable pickers", async () => {
    const page = await source("pages/lists/purchase/rfq/new.astro");
    assert.match(page, /OrderCreateForm/);
    assert.match(page, /purchase\/rfq/);
    assert.match(page, /partnerListKey=["']purchase\/vendors["']/);
    assert.match(page, /Proveedor|Nueva RFQ/);
  });

  it("does not keep option B proxy/work surfaces", async () => {
    await assert.rejects(() => source("pages/work.astro"));
    await assert.rejects(() => source("pages/odoo-proxy/[...path].ts"));
    await assert.rejects(() => source("lib/bff/odoo-proxy.ts"));
  });
});
