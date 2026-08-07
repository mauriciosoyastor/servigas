import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) =>
  readFile(new URL(`../src/${path}`, import.meta.url), "utf8");

describe("shell UI contracts", () => {
  it("loads shared tokens and shell styles globally", async () => {
    const css = await source("styles/global.css");
    const tokens = await source("styles/tokens.css");

    assert.match(css, /@import "\.\/tokens\.css"/);
    assert.match(css, /@import "\.\/shell\.css"/);
    assert.match(css, /@import "\.\/list\.css"/);
    assert.match(tokens, /--sg-primary:/);
    assert.match(tokens, /--sg-flame-gradient:/);
    assert.match(tokens, /--sg-radius-card:\s*12px/);
    assert.match(tokens, /--sg-ember-amber:\s*#ffb300/);
    assert.match(tokens, /--sg-ember-coral:\s*#ff7043/);
    assert.match(tokens, /--sg-ember-scarlet:\s*#ef5350/);
    assert.match(tokens, /--sg-ember-wine:\s*#c62828/);
  });

  it("provides the requested shell components", async () => {
    const [layout, rail, tile, note, table, tour, railNav] = await Promise.all([
      source("layouts/ShellLayout.astro"),
      source("components/RailNav.astro"),
      source("components/TileCard.astro"),
      source("components/ComingSoonNote.astro"),
      source("components/RecordTable.astro"),
      source("components/OnboardingTour.astro"),
      source("lib/shell/rail-nav.ts"),
    ]);

    assert.match(layout, /compact\?:/);
    assert.match(layout, /is-compact/);
    assert.match(layout, /<RailNav active=/);
    assert.match(layout, /<OnboardingTour/);
    assert.match(rail, /RAIL_ITEMS|rail-nav/);
    assert.match(railNav, /href: "\/pos"/);
    assert.match(railNav, /href: "\/caja"/);
    assert.match(railNav, /href: "\/hubs\/inventory"/);
    assert.match(railNav, /href: "\/hubs\/purchase"/);
    assert.match(railNav, /href: "\/hubs\/workshop"/);
    assert.match(railNav, /href: "\/hubs\/accounting"/);
    assert.doesNotMatch(railNav, /hubs\/sales/);
    assert.match(railNav, /AREA_LABELS\.inventory|label: "Stock"/);
    assert.match(railNav, /AREA_LABELS\.workshop|label: "Taller"/);
    assert.match(railNav, /AREA_LABELS\.accounting|label: "Cobros"/);
    assert.match(rail, /data-tour=\{`rail-\$\{item\.app\}`\}/);
    assert.match(rail, /servigas-mark\.png/);
    assert.match(rail, /sg-brand-name/);
    assert.match(rail, />Servigas</);
    assert.match(tile, /data-tile/);
    assert.match(tile, /data-kpi|sg-tile-kpi/);
    assert.doesNotMatch(tile, />\s*Dato\s*</);
    assert.match(tile, /resolveAccentKey|accentCssVar|tile-accents/);
    assert.match(tile, /data-accent/);
    assert.match(tile, /tourTarget|data-tour=\{tourTarget\}/);
    const accents = await source("lib/shell/tile-accents.ts");
    assert.match(accents, /ember-amber/);
    assert.match(accents, /ember-wine/);
    assert.match(accents, /TILE_ACCENT_CYCLE/);
    assert.match(note, /Próximamente/);
    assert.match(note, /data-coming-soon-detail/);
    assert.match(note, /todavía no está disponible/);
    assert.doesNotMatch(note, /camino a corte|pantalla Astro/);
    assert.match(table, /sg-record-table/);
    assert.match(table, /sg-record-thumb/);
    assert.match(tour, /data-onboarding/);
    assert.match(tour, /Omitir tutorial/);
    assert.match(tour, /No volver a mostrar/);
    assert.match(tour, /onboarding-tour/);
    const tourCss = await source("styles/onboarding.css");
    assert.match(tourCss, /\.sg-onboarding-hole\s*\{[^}]*pointer-events:\s*none/s);
  });

  it("posts login credentials to the BFF before navigating home", async () => {
    const login = await source("pages/login.astro");

    assert.match(login, /fetch\(["']\/api\/auth\/login["']/);
    assert.match(login, /location\.(?:assign|href)/);
    assert.match(login, /servigas-mark\.png/);
    assert.match(login, /sg-login-brand-name/);
    assert.match(login, />Servigas</);
    assert.match(login, /changed/);
    assert.match(login, /Contraseña actualizada/);
    assert.match(login, /loginChanged/);
    assert.match(login, /Usuario actualizado/);
  });

  it("protects and renders the launcher using tile navigation", async () => {
    const index = await source("pages/index.astro");

    assert.match(index, /requireOdooSession\(Astro\.cookies\)/);
    assert.match(index, /getLauncher\(odooSessionId\)/);
    assert.match(index, /invalidateBffSession\(Astro\.cookies\)/);
    assert.match(index, /Astro\.redirect\(["']\/login["']\)/);
    assert.match(index, /resolveTileNavigation/);
    assert.match(index, /partitionLauncherTiles/);
    assert.match(index, /sg-ops-strip/);
    assert.match(index, /data-tour=["']ops-strip["']/);
    assert.match(index, /href=["']\/pos["'][^>]*>\s*Mostrador/);
    assert.match(index, /href=["']\/caja["'][^>]*>\s*Caja/);
    assert.doesNotMatch(index, /Caja \/ Mostrador/);
    assert.match(index, /href="\/pos"/);
    assert.match(index, /quotations\/new/);
    assert.match(index, /solicitudes\/new/);
    assert.match(index, /Áreas del negocio/);
    assert.match(index, /Más accesos/);
    assert.match(index, /data-coming-soon-detail/);
  });

  it("validates Odoo before redirecting an existing session from login", async () => {
    const login = await source("pages/login.astro");

    assert.match(login, /validateSession\(odooSessionId\)/);
    assert.match(login, /invalidateBffSession\(Astro\.cookies\)/);
  });

  it("renders known hubs and routes allowlisted cards into Astro lists", async () => {
    const hub = await source("pages/hubs/[app].astro");

    assert.match(hub, /isHubApp\(app\)/);
    assert.match(hub, /backend\.getHub\(odooSessionId,\s*app,\s*requestedSection\)/);
    assert.match(hub, /formatLowStockAlertMessage|más de|Bajo stock/);
    assert.match(hub, /countLowStockProducts|low-stock/);
    assert.match(hub, /thinHubPayload/);
    assert.match(hub, /HUB_LABELS/);
    assert.match(hub, /<HubSubnav/);
    assert.match(hub, /searchParams\.get\(['"]section['"]\)/);
    assert.match(hub, /payload\.groups/);
    assert.match(hub, /sg-hub-group/);
    assert.match(hub, /accentIndex=/);
    assert.match(hub, /resolveTileNavigation/);
    assert.match(hub, /destination\.kind === ['"]list['"]/);
    assert.match(hub, /labelHubSections/);
    assert.doesNotMatch(hub, /Ir al mostrador/);
    assert.doesNotMatch(hub, /sg-hub-pos-entry/);
    assert.doesNotMatch(hub, /Ir a la caja/);
    const subnav = await source("components/HubSubnav.astro");
    assert.match(subnav, /splitHubSections/);
    assert.match(subnav, /labelHubSections/);
    assert.match(subnav, />Más</);
  });

  it("renders cash hub with open/move/close seams", async () => {
    const page = await source("pages/caja.astro");
    assert.match(page, /active=["']caja["']/);
    assert.match(page, /getCashHub\(/);
    assert.match(page, /data-caja-root/);
    assert.match(page, /data-caja-open/);
    assert.match(page, /data-tour=["']caja-tour["']/);
    assert.match(page, /data-caja-move/);
    assert.match(page, /data-caja-close/);
    assert.match(page, /data-caja-motive/);
    assert.match(page, /CASH_MOTIVES_IN/);
    assert.match(page, /CASH_MOTIVES_OUT/);
    assert.match(page, /data-caja-note-wrap/);
    assert.match(page, /motiveCode/);
    assert.match(page, /name="shift"/);
    assert.match(page, /CASH_SHIFTS/);
    assert.match(page, /filterCashFeed/);
    assert.match(page, /resolveCashFeedFilter|cajaFeedHref/);
    assert.match(page, /sg-caja-filters/);
    assert.match(page, /aria-current/);
    assert.match(page, /cajaFeedHref\(/);
    assert.match(page, /data-filter=\{activeFilter\}/);
    assert.match(page, /href=["']\/caja\/historial["']/);
    assert.match(page, /Historial/);
    assert.match(page, /sg-caja-alerts/);
    const historyPage = await source("pages/caja/historial.astro");
    assert.match(historyPage, /getCashHistory/);
    assert.match(historyPage, /Ver detalle/);
    assert.match(page, /data-caja-quick-bank/);
    assert.match(page, /data-caja-diff-note/);
    assert.match(page, /bankDeposit/);
    assert.match(page, /leaveFloat/);
    assert.match(page, /retiro_dueno/);
    const motives = await source("lib/caja/cash-motives.ts");
    assert.match(motives, /devolucion_cliente/);
    assert.match(motives, /refuerzo/);
    assert.match(motives, /cobro_ot/);
    assert.match(page, /\/api\/caja\/open/);
    assert.match(page, /setTourStep|pos-ticket/);
    assert.match(page, /\/api\/caja\/move/);
    assert.match(page, /\/api\/caja\/close/);
    assert.match(page, /Efectivo esperado/);
    const detail = await source("pages/caja/[id].astro");
    assert.match(detail, /getCashSessionDetail/);
    assert.match(detail, /data-caja-print/);
    assert.match(detail, /window\.print/);
    assert.match(detail, /item\.href/);
    assert.match(detail, />Ver</);
  });

  it("renders allowlisted lists from the BFF with search toolbar", async () => {
    const page = await source("pages/lists/[...slug].astro");

    assert.match(page, /getRecordList\(odooSessionId,\s*listKey/);
    assert.match(page, /parsePositiveIntParam|categ_id/);
    assert.match(page, /categId/);
    assert.match(page, /partner_id/);
    assert.match(page, /partnerId/);
    assert.match(page, /Quitar filtro/);
    assert.match(page, /rowDeleteApiPath|ProductRowDeleteHost|data-row-delete/);
    assert.match(page, /<RecordTable/);
    assert.match(page, /<ListToolbar/);
    const toolbarMatches = page.match(/<ListToolbar/g) || [];
    assert.equal(toolbarMatches.length, 2, "toolbar at top and bottom of list");
    const toolbar = await source("components/ListToolbar.astro");
    assert.match(toolbar, /showJump/);
    assert.match(toolbar, /\+10/);
    assert.match(toolbar, /−10/);
    assert.match(toolbar, /Avanzar 10 páginas/);
    assert.match(toolbar, /categId|categ_id/);
    assert.match(toolbar, /partnerId|partner_id/);
    assert.match(page, /Sin resultados/);
    assert.match(page, /active=\{def\.railApp\}/);
    const recordTable = await source("components/RecordTable.astro");
    assert.match(recordTable, /data-row-delete/);
    assert.match(recordTable, /Eliminar/);
  });

  it("links vendor detail to products filtered by partner_id", async () => {
    const vendorDetail = await source("pages/lists/purchase/vendors/[id].astro");
    assert.match(
      vendorDetail,
      /\/lists\/inventory\/products\?partner_id=/
    );
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
    assert.match(page, /active=["']pos["']/);
    assert.match(page, /getOpenCashSession\(/);
    assert.match(page, /getPosCatalog\(/);
    assert.match(page, /<h1>Mostrador<\/h1>/);
    assert.match(page, /Abrí la caja primero/);
    assert.match(page, /data-tour=["']pos-caja-closed["']/);
    assert.match(page, /data-pos-caja/);
    assert.match(page, /data-tour=["']pos-ticket["']/);
    assert.match(page, /data-tour=["']pos-checkout["']/);
    assert.match(page, /\/api\/pos\/checkout/);
    assert.match(page, /\/lists\/sales\/ventas-caja/);
    assert.match(page, /addToCart|cartTotal/);
    assert.match(page, /data-pos-pay-method|paymentMethods/);
    assert.match(page, /data-pos-numpad|data-np-mode/);
    assert.match(page, /mapKeyboardToNumpad|numpad-keyboard/);
    assert.match(page, /isEditableKeyboardTarget/);
    assert.match(page, /sg-pos-cart-ops/);
    assert.match(page, /sg-pos-numpad-panel|overscroll-behavior/);
    assert.match(page, /sg-pos-cart-footer/);
    assert.match(page, /sg-pos-scroll|overscroll-behavior/);
    assert.match(page, /sg-pos-line-thumb|data-line-thumb/);
    assert.match(page, /data-line-disc|data-pos-order-disc/);
    assert.match(page, /setCartDiscount|checkoutLinesFromCart/);
    assert.match(page, /data-pos-receipt/);
    assert.match(page, /Nueva venta/);
    assert.match(page, /nombre, código o barras/);
    assert.match(page, /sg-pos-product-stock|qty_available/);
    assert.match(page, /data-product-image-trigger/);
    assert.match(page, /ProductImageUploadHost/);
    assert.match(page, /\/api\/records\/inventory\/products/);
    assert.match(page, /product_tmpl_id|data-record-id/);
    assert.match(page, /data-pos-customer|partnerId/);
    assert.match(page, /sales\/customers/);
    assert.match(page, /compact/);
    assert.match(page, /--sg-flame-gradient/);
    assert.match(page, /min-height:\s*2\.75rem/);
  });

  it("uses flame gradient on login submit", async () => {
    const login = await source("pages/login.astro");
    assert.match(login, /--sg-flame-gradient/);
  });

  it("renders invoice and customer detail pages", async () => {
    const invoice = await source("pages/lists/accounting/customer-invoices/[id].astro");
    const customer = await source("pages/lists/sales/customers/[id].astro");
    assert.match(invoice, /['"]accounting\/customer-invoices['"]/);
    assert.match(invoice, /RecordInvoicePdfControl/);
    assert.match(customer, /['"]sales\/customers['"]/);
  });

  it("embeds invoice PDF viewer on accounting move fichas", async () => {
    const control = await source("components/RecordInvoicePdfControl.astro");
    const host = await source("components/InvoicePdfModalHost.astro");
    const pages = await Promise.all([
      source("pages/lists/accounting/customer-invoices/[id].astro"),
      source("pages/lists/accounting/vendor-bills/[id].astro"),
      source("pages/lists/accounting/credit-notes/[id].astro"),
      source("pages/lists/accounting/vendor-refunds/[id].astro"),
      source("pages/lists/accounting/drafts/[id].astro"),
    ]);
    assert.match(control, /data-invoice-pdf/);
    assert.match(control, /Ver PDF/);
    assert.match(control, /Descargar/);
    assert.match(control, /InvoicePdfModalHost/);
    // Descargar must not use bare <a download> (Chrome saves API JSON errors as N.json).
    assert.match(control, /<button[\s\S]*?data-invoice-pdf-download/);
    assert.doesNotMatch(
      control,
      /<a[\s\S]*?data-invoice-pdf-download[\s\S]*?\bdownload\b/
    );
    assert.match(host, /data-invoice-pdf-host/);
    assert.match(host, /embed|iframe/);
    assert.match(host, /application\/pdf/);
    assert.match(host, /createObjectURL/);
    assert.match(host, /Abrir en pestaña/);
    assert.match(host, /role=["']dialog["']/);
    assert.match(host, /data-invoice-pdf-open/);
    assert.match(host, /data-invoice-pdf-download/);
    assert.match(host, /credentials:\s*['"]same-origin['"]/);
    for (const page of pages) {
      assert.match(page, /RecordInvoicePdfControl/);
      assert.match(page, /slot=["']secondary["']/);
      assert.match(page, /sg-ficha-secondary-actions/);
    }
    const api = await source("pages/api/reports/invoice/[...slug].ts");
    assert.match(api, /fetchInvoicePdf/);
    assert.match(api, /"cache-control":\s*"private, no-store"/);
  });

  it("wires compact PDF action on allowlisted accounting list rows", async () => {
    const table = await source("components/RecordTable.astro");
    const listPage = await source("pages/lists/[...slug].astro");
    assert.match(table, /invoicePdfListKey/);
    assert.match(table, /invoicePdfPath/);
    assert.match(table, /data-invoice-pdf-open/);
    assert.match(table, /data-pdf-url/);
    assert.match(table, />\s*PDF\s*</);
    assert.match(listPage, /canFetchInvoicePdf/);
    assert.match(listPage, /invoicePdfListKey/);
    assert.match(listPage, /InvoicePdfModalHost/);
  });

  it("renders transfer detail page", async () => {
    const page = await source("pages/lists/inventory/transfers/[id].astro");
    assert.match(page, /['"]inventory\/transfers['"]/);
    assert.match(page, /RecordDetailBody/);
    assert.match(page, /RecordConfirmControl|Validar recepción/);
    assert.match(page, /isConfirmableState/);
  });

  it("renders order lines block in record detail body", async () => {
    const body = await source("components/RecordDetailBody.astro");
    const css = await source("styles/list.css");
    assert.match(body, /detail\.lines/);
    assert.match(body, /sg-detail-lines/);
    assert.match(body, /product_image/);
    assert.match(body, /sg-detail-line-product/);
    assert.match(css, /\.sg-detail-line-thumb/);
  });

  it("labels Odoo selection values in Spanish on fichas and lists", async () => {
    const body = await source("components/RecordDetailBody.astro");
    const table = await source("components/RecordTable.astro");
    assert.match(body, /labelOdooSelection/);
    assert.match(table, /labelOdooSelection/);
  });

  it("renders Apps and Settings landings", async () => {
    const apps = await source("pages/apps.astro");
    const settings = await source("pages/settings.astro");
    assert.match(apps, /Aplicaciones/);
    assert.match(apps, /href=\"\/\"/);
    assert.match(settings, /Ajustes/);
    assert.match(settings, /Tu cuenta/);
    assert.match(settings, /Cambiar contraseña/);
    assert.match(settings, /\/api\/auth\/change-password/);
    assert.match(settings, /\/api\/auth\/change-login/);
    assert.match(settings, /data-login-edit/);
    assert.match(settings, /PasswordField|data-password-toggle/);
    assert.match(settings, /data-login-password/);
    assert.match(settings, /Seguís en Ajustes|Seguis en Ajustes|sesión abierta|sesion abierta/);
    assert.doesNotMatch(settings, /login\?loginChanged=1/);
    assert.match(settings, /login\?changed=1/);
    assert.match(settings, /\/lists\/integrations/);
    assert.match(settings, /data-alerts-form/);
    assert.match(settings, /\/api\/settings\/alerts/);
    assert.match(settings, /stockMinQty|Stock mínimo global/i);
    assert.doesNotMatch(settings, /todavía no está disponible/);
  });

  it("provides password visibility toggle field", async () => {
    const field = await source("components/PasswordField.astro");
    assert.match(field, /data-password-toggle/);
    assert.match(field, /type=\"password\"/);
    assert.match(field, /Mostrar contraseña/);
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

  it("provides record notes bitácora component", async () => {
    const notes = await source("components/RecordNotes.astro");
    assert.match(notes, /data-record-notes/);
    assert.match(notes, /\/api\/notes/);
    assert.match(notes, /Agregar/);
    assert.match(notes, /Todavía no hay notas en esta ficha/);
    assert.match(notes, /canEdit/);
    assert.match(notes, /¿Borrar esta nota\?/);
  });

  it("wires RecordNotes into v1 detail pages", async () => {
    const pages = [
      "pages/lists/sales/customers/[id].astro",
      "pages/lists/purchase/vendors/[id].astro",
      "pages/lists/inventory/products/[id].astro",
      "pages/lists/sales/quotations/[id].astro",
      "pages/lists/sales/orders/[id].astro",
      "pages/lists/purchase/orders/[id].astro",
    ];
    for (const path of pages) {
      const src = await source(path);
      assert.match(src, /RecordNotes/, path);
      assert.match(src, /listKey=/, path);
    }
  });

  it("renders customer detail with allowlisted edit form", async () => {
    const page = await source("pages/lists/sales/customers/[id].astro");
    const body = await source("components/RecordDetailBody.astro");
    assert.match(page, /editFields|editApiPath/);
    assert.match(page, /\/api\/records\/sales\/customers/);
    assert.match(page, /phone|email/);
    assert.match(page, /vat|CUIT/);
    assert.match(page, /sg_invoice_dest|Factura como/);
    assert.match(page, /street|city/);
    assert.match(page, /RecordArchiveControl|data-record-archive/);
    assert.match(page, /slot=["']notes["']/);
    assert.match(body, /data-record-ficha/);
    assert.match(body, /data-edit-open/);
    assert.match(body, /sg-ficha-layout/);
    assert.match(body, /select/);
  });

  it("renders partner create pages and list create CTA", async () => {
    const customerNew = await source("pages/lists/sales/customers/new.astro");
    const vendorNew = await source("pages/lists/purchase/vendors/new.astro");
    const createForm = await source("components/RecordCreateForm.astro");
    const detailBody = await source("components/RecordDetailBody.astro");
    const listPage = await source("pages/lists/[...slug].astro");
    assert.match(customerNew, /RecordCreateForm/);
    assert.match(customerNew, /vat|CUIT/);
    assert.match(customerNew, /sg_invoice_dest|Factura como/);
    assert.match(customerNew, /Consumidor final|Con CUIT/);
    assert.match(createForm, /action:\s*['"]create['"]/);
    assert.match(createForm, /select/);
    assert.match(createForm, /data-cuit-fiscal-warn/);
    assert.match(createForm, /El CUIT no es válido/);
    assert.match(detailBody, /data-cuit-fiscal-warn/);
    assert.match(vendorNew, /purchase\/vendors/);
    assert.match(vendorNew, /vat|CUIT/);
    assert.match(listPage, /canCreateRecord/);
    assert.match(listPage, /sg-list-create|Nuevo cliente/);
  });

  it("redirects accounting moves detail by move_type", async () => {
    const movesDetail = await source(
      "pages/lists/accounting/moves/[id].astro"
    );
    assert.match(movesDetail, /resolveAccountingMoveDetailPath/);
    assert.match(movesDetail, /accounting\/moves/);
    assert.match(movesDetail, /Astro\.redirect/);
  });

  it("wires CF/CUIT badge and non-blocking warn in POS customer picker", async () => {
    const pos = await source("pages/pos.astro");
    assert.match(pos, /data-pos-customer-warn/);
    assert.match(pos, /Falta CUIT; completá la ficha antes de facturar/);
    assert.match(pos, /El CUIT no es válido/);
    assert.match(pos, /customerCuitWarnKind|isValidCuitClient/);
    assert.match(pos, /sg_invoice_dest/);
    assert.match(pos, /invoiceDestBadge|CUIT/);
  });

  it("wires customer invoice create and publish UI", async () => {
    const invoiceNew = await source(
      "pages/lists/accounting/customer-invoices/new.astro"
    );
    const invoiceDetail = await source(
      "pages/lists/accounting/customer-invoices/[id].astro"
    );
    const invoiceEdit = await source(
      "pages/lists/accounting/customer-invoices/[id]/edit.astro"
    );
    const orderForm = await source("components/OrderCreateForm.astro");
    const listPage = await source("pages/lists/[...slug].astro");
    assert.match(invoiceNew, /OrderCreateForm/);
    assert.match(invoiceNew, /accounting\/customer-invoices/);
    assert.match(invoiceDetail, /RecordConfirmControl/);
    assert.match(invoiceDetail, /Publicar/);
    assert.match(invoiceDetail, /Editar borrador/);
    assert.match(invoiceDetail, /action_post|customer-invoices/);
    assert.match(invoiceEdit, /update_invoice_draft/);
    assert.match(invoiceEdit, /Guardar borrador/);
    assert.match(orderForm, /update_invoice_draft/);
    assert.match(listPage, /Nueva factura/);
  });

  it("wires Factura Web pending export, POS→FC and vendor NC UI", async () => {
    const listPage = await source("pages/lists/[...slug].astro");
    const fwExport = await source("pages/api/accounting/factura-web-export.ts");
    const markCtrl = await source("components/RecordMarkFwLoadedControl.astro");
    const bulkBar = await source("components/FwBulkMarkBar.astro");
    const recordTable = await source("components/RecordTable.astro");
    const invoiceDetail = await source(
      "pages/lists/accounting/customer-invoices/[id].astro"
    );
    const posDetail = await source("pages/lists/sales/ventas-caja/[id].astro");
    assert.match(posDetail, /data-pos-invoice/);
    assert.match(posDetail, /Facturar/);
    assert.match(posDetail, /Usar Consumidor Final/);
    assert.match(posDetail, /partnerId/);
    const vendorNcNew = await source(
      "pages/lists/accounting/vendor-refunds/new.astro"
    );
    const vendorNcDetail = await source(
      "pages/lists/accounting/vendor-refunds/[id].astro"
    );
    assert.match(listPage, /factura-web-export/);
    assert.match(listPage, /FwBulkMarkBar/);
    assert.match(listPage, /rowSelect=\{showFwBulk\}/);
    assert.match(listPage, /Nueva nota de crédito proveedor/);
    assert.match(fwExport, /exportFwPendingCsv/);
    assert.match(markCtrl, /mark_fw_loaded/);
    assert.match(markCtrl, /N° Factura Web/);
    assert.doesNotMatch(markCtrl, /opcional/i);
    assert.match(bulkBar, /mark_fw_loaded_bulk/);
    assert.match(bulkBar, /Marcar seleccionadas/);
    assert.match(bulkBar, /items/);
    assert.match(bulkBar, /fwNumber/);
    assert.match(recordTable, /data-row-select/);
    assert.match(recordTable, /data-fw-row-number/);
    assert.match(listPage, /fwNumberInput/);
    assert.match(invoiceDetail, /RecordMarkFwLoadedControl/);
    assert.match(posDetail, /isPosOrderReadyToInvoice/);
    assert.match(posDetail, /hasPosOrderPartner/);
    assert.doesNotMatch(posDetail, /RecordCreateInvoiceControl/);
    assert.match(vendorNcNew, /vendor-refunds/);
    assert.match(vendorNcNew, /purchase\/vendors/);
    assert.match(vendorNcDetail, /RecordConfirmControl/);
  });

  it("wires NC/FP create-publish and register payment UI", async () => {
    const creditNew = await source(
      "pages/lists/accounting/credit-notes/new.astro"
    );
    const creditDetail = await source(
      "pages/lists/accounting/credit-notes/[id].astro"
    );
    const vendorNew = await source(
      "pages/lists/accounting/vendor-bills/new.astro"
    );
    const vendorDetail = await source(
      "pages/lists/accounting/vendor-bills/[id].astro"
    );
    const invoiceDetail = await source(
      "pages/lists/accounting/customer-invoices/[id].astro"
    );
    const payControl = await source(
      "components/RecordRegisterPaymentControl.astro"
    );
    const listPage = await source("pages/lists/[...slug].astro");
    assert.match(creditNew, /OrderCreateForm/);
    assert.match(creditNew, /accounting\/credit-notes/);
    assert.match(creditDetail, /RecordConfirmControl/);
    assert.match(creditDetail, /Publicar/);
    assert.match(vendorNew, /purchase\/vendors/);
    assert.match(vendorDetail, /RecordConfirmControl/);
    assert.match(vendorDetail, /RecordRegisterPaymentControl/);
    assert.match(invoiceDetail, /RecordRegisterPaymentControl/);
    assert.match(payControl, /register_payment/);
    assert.match(payControl, /paymentMethod|data-pay-method/);
    assert.match(payControl, /PAYMENT_METHOD_OPTIONS/);
    assert.match(listPage, /Nueva nota de crédito/);
    assert.match(listPage, /Cargar factura de proveedor/);
  });

  it("wires reset and cancel invoice actions only for lifecycle-ready fichas", async () => {
    const control = await source("components/RecordConfirmControl.astro");
    const pages = await Promise.all([
      source("pages/lists/accounting/customer-invoices/[id].astro"),
      source("pages/lists/accounting/credit-notes/[id].astro"),
      source("pages/lists/accounting/vendor-bills/[id].astro"),
      source("pages/lists/accounting/vendor-refunds/[id].astro"),
    ]);

    assert.match(control, /action\?:\s*string/);
    assert.match(control, /action\s*=\s*['"]confirm['"]/);
    assert.match(control, /data-action=\{action\}/);
    assert.match(
      control,
      /querySelectorAll(?:<HTMLElement>)?\(\s*['"]\[data-record-confirm\]['"]\s*\)/
    );
    assert.match(control, /action:\s*btn\.dataset\.action\s*\|\|\s*['"]confirm['"]/);
    for (const page of pages) {
      assert.match(page, /isInvoiceLifecycleReady/);
      assert.match(page, /reset_invoice_draft/);
      assert.match(page, /cancel_invoice/);
      assert.match(page, /Volver a borrador/);
      assert.match(page, /Anular/);
    }
  });

  it("wires vendor bill create with attachment and publish UI", async () => {
    const billNew = await source(
      "pages/lists/accounting/vendor-bills/new.astro"
    );
    const billDetail = await source(
      "pages/lists/accounting/vendor-bills/[id].astro"
    );
    const form = await source("components/OrderCreateForm.astro");
    const detailBody = await source("components/RecordDetailBody.astro");
    const listPage = await source("pages/lists/[...slug].astro");
    assert.match(billNew, /requireAttachment/);
    assert.match(billNew, /showBillSource/);
    assert.match(billNew, /suggestLinesFromPdf/);
    assert.match(billNew, /purchase\/vendors/);
    assert.match(billNew, /accounting\/vendor-bills/);
    assert.match(form, /data-bill-attachment/);
    assert.match(form, /data-bill-source/);
    assert.match(form, /data-pdf-suggest/);
    assert.match(form, /vendor-bill-parse/);
    assert.match(billDetail, /RecordConfirmControl/);
    assert.match(billDetail, /Publicar/);
    assert.match(detailBody, /sg-detail-attachments|Comprobante/);
    assert.match(listPage, /Cargar factura de proveedor/);
  });

  it("styles bill-source origin picker for dark contrast", async () => {
    const form = await source("components/OrderCreateForm.astro");
    assert.match(form, /data-bill-source-select/);
    assert.match(form, /data-bill-source-list/);
    assert.match(form, /sg-order-bill-source-list/);
    assert.match(form, /color:\s*var\(--sg-text-on-dark\)/);
    assert.match(form, /background:\s*rgba\(0,\s*0,\s*0,\s*0\.72\)/);
  });

  it("styles bill attachment picker with Spanish glass control", async () => {
    const form = await source("components/OrderCreateForm.astro");
    assert.match(form, /data-bill-attachment/);
    assert.match(form, /data-bill-attachment-name/);
    assert.match(form, /sg-order-attachment-control/);
    assert.match(form, /Elegir archivo/);
    assert.match(form, /Sin archivo/);
    assert.match(form, /\.sg-order-attachment-native[\s\S]*display:\s*none/);
  });

  it("wires Crear FC on sale order detail when to invoice", async () => {
    const orderDetail = await source("pages/lists/sales/orders/[id].astro");
    const control = await source("components/RecordCreateInvoiceControl.astro");
    assert.match(orderDetail, /RecordCreateInvoiceControl/);
    assert.match(orderDetail, /isOrderReadyToInvoice|invoice_status/);
    assert.match(orderDetail, /Crear FC/);
    assert.match(control, /create_invoice/);
  });

  it("surfaces suggested doc type hint on invoice create partner pick", async () => {
    const form = await source("components/OrderCreateForm.astro");
    assert.match(form, /Tipo sugerido/);
    assert.match(form, /Factura A\/B|Factura B\/C/);
    assert.match(form, /AFIP\/l10n_ar/);
  });

  it("renders product create/archive and quotation confirm", async () => {
    const productNew = await source("pages/lists/inventory/products/new.astro");
    const productDetail = await source("pages/lists/inventory/products/[id].astro");
    const productImport = await source("pages/lists/inventory/products/import.astro");
    const listPage = await source("pages/lists/[...slug].astro");
    const quote = await source("pages/lists/sales/quotations/[id].astro");
    const po = await source("pages/lists/purchase/orders/[id].astro");
    assert.match(productNew, /inventory\/products/);
    assert.match(productImport, /Cargar lista de precios\/Productos/);
    assert.match(productImport, /\/api\/inventory\/price-list-import/);
    assert.match(productImport, /data-step="mapping"/);
    assert.match(productImport, /action: 'analyze'/);
    assert.match(productImport, /data-sample-wrap/);
    assert.match(productImport, /data-fixed-proveedor/);
    assert.match(productImport, /\.xlsx|\.xls/);
    assert.match(productImport, /readAsDataURL|isExcelFile/);
    assert.match(productImport, /data-import-error-banner/);
    assert.match(productImport, /labelImportStatus|statusLabels/);
    assert.match(productImport, /Confirmar e importar/);
    assert.match(productImport, /categoria|Categoría/);
    assert.match(productImport, /proveedor|Proveedor/);
    assert.match(listPage, /\/lists\/inventory\/products\/import/);
    assert.match(productDetail, /RecordArchiveControl|Archivar producto/);
    const categoryDetail = await source(
      "pages/lists/inventory/categories/[id].astro"
    );
    const categoryNew = await source(
      "pages/lists/inventory/categories/new.astro"
    );
    assert.match(categoryDetail, /CategoryProductPurgeControl/);
    assert.match(categoryDetail, /purge-by-category/);
    assert.match(categoryDetail, /editApiPath|editFields/);
    assert.match(categoryDetail, /\/lists\/inventory\/products\?categ_id=/);
    assert.match(categoryDetail, /Ver productos/);
    assert.match(categoryDetail, /countProductsInCategory/);
    assert.match(categoryDetail, /slot=["']card-extra["']/);
    assert.match(categoryDetail, /embedded/);
    const purgeCtrl = await source("components/CategoryProductPurgeControl.astro");
    assert.match(purgeCtrl, /delete-category/);
    assert.match(purgeCtrl, /Eliminar categoría completa/);
    assert.match(purgeCtrl, /archiv/i);
    assert.match(purgeCtrl, /is-embedded/);
    const rowDelete = await source("components/ProductRowDeleteHost.astro");
    assert.match(rowDelete, /archiv/i);
    assert.match(rowDelete, /outcome/);
    const detailBody = await source("components/RecordDetailBody.astro");
    assert.match(detailBody, /card-extra/);
    assert.match(detailBody, /sg-detail-card-extra/);
    const listCss = await source("styles/list.css");
    assert.match(listCss, /\.sg-detail-field-edit select/);
    assert.match(listCss, /color-scheme:\s*dark/);
    assert.match(listCss, /button\[type=['"]submit['"]\]/);
    assert.match(categoryNew, /inventory\/categories/);
    assert.match(categoryNew, /RecordCreateForm/);
    assert.match(categoryNew, /parent_id/);
    assert.match(listPage, /Nueva categoría/);
    const recordTable = await source("components/RecordTable.astro");
    assert.match(recordTable, /product_count/);
    assert.match(recordTable, /\/lists\/inventory\/products\?categ_id=/);
    assert.match(quote, /RecordConfirmControl|Confirmar pedido/);
    assert.match(po, /Confirmar OC|purchase\/solicitudes/);
  });

  it("renders quotation create page with searchable pickers", async () => {
    const page = await source("pages/lists/sales/quotations/new.astro");
    const form = await source("components/OrderCreateForm.astro");
    assert.match(page, /OrderCreateForm/);
    assert.match(page, /partnerListKey=["']sales\/customers["']/);
    assert.match(page, /productListKey=["']inventory\/variants["']/);
    assert.match(page, /Ver historial/);
    assert.match(page, /quotations-history/);
    assert.doesNotMatch(page, /showBillSource|requireAttachment/);
    assert.match(form, /data-order-picker/);
    assert.match(form, /data-picker-query/);
    assert.match(form, /name=["']partnerId["']/);
    assert.match(form, /data-order-lines/);
    assert.match(form, /data-add-line/);
    assert.match(form, /lines:\s*lines\.map/);
    assert.match(form, /\/api\/lists\//);
    assert.match(form, /action:\s*['"]create['"]/);
    // <select> is only for optional FP bill source (gated by showBillSource).
    assert.match(form, /showBillSource/);
  });

  it("renders workshop hub OT create, detail and appliance history", async () => {
    const page = await source("pages/lists/workshop/orders/new.astro");
    const form = await source("components/WorkOrderCreateForm.astro");
    const orderDetail = await source("pages/lists/workshop/orders/[id].astro");
    const applianceDetail = await source(
      "pages/lists/workshop/appliances/[id].astro"
    );
    const hubApps = await source("lib/shell/hub-apps.ts");
    const glossary = await source("lib/shell/ui-glossary.ts");
    assert.match(hubApps, /servigas_workshop_hub/);
    assert.match(hubApps, /"workshop"/);
    assert.match(glossary, /workshop:\s*"Taller"/);
    assert.match(page, /WorkOrderCreateForm/);
    assert.match(page, /Nueva orden de trabajo/);
    assert.match(form, /data-wo-create/);
    assert.match(form, /data-tour=["']workshop-create["']/);
    assert.match(form, /serial_number/);
    assert.match(form, /name=["']deposit["']|Seña/);
    assert.match(form, /error\.message|No se pudo guardar/);
    assert.match(form, /Ya atendido/);
    assert.match(form, /\/api\/lists\//);
    assert.match(form, /workshop\/appliances/);
    assert.doesNotMatch(form, /servigas-logo\.png/);
    assert.match(orderDetail, /servigas-mark\.png/);
    assert.doesNotMatch(orderDetail, /Servigas · Taller/);
    assert.match(orderDetail, /Cerrar orden/);
    assert.match(orderDetail, /RecordConfirmControl/);
    assert.match(orderDetail, /Eliminar orden/);
    assert.match(orderDetail, /action=["']delete["']/);
    assert.match(orderDetail, /sg-ficha-secondary-actions/);
    assert.match(orderDetail, /sg-ficha-action/);
    assert.match(orderDetail, /RecordWorkOrderShareControl/);
    assert.match(orderDetail, /Enviar al cliente|data-wo-share/);
    assert.match(orderDetail, /RecordWorkOrderCashControl/);
    const shareCtrl = await source("components/RecordWorkOrderShareControl.astro");
    assert.match(shareCtrl, /data-wo-share/);
    assert.match(shareCtrl, /\/api\/workshop-orders\/send-email/);
    assert.match(shareCtrl, /WhatsApp/);
    assert.match(shareCtrl, /Descargar PDF/);
    const cashCtrl = await source("components/RecordWorkOrderCashControl.astro");
    assert.match(cashCtrl, /data-wo-cash/);
    assert.match(cashCtrl, /data-remaining/);
    assert.match(cashCtrl, /Registrar cobro/);
    assert.match(cashCtrl, /\/api\/workshop-orders\/collect-cash/);
    assert.match(cashCtrl, /PAYMENT_METHOD_OPTIONS/);
    assert.match(cashCtrl, /fullyCollected|is-collected|Ya cobrado|Pendiente de cobrar/);
    assert.match(cashCtrl, /entra al feed de Caja|Importe − Seña|supera el pendiente/);
    assert.match(orderDetail, /editApiPath|owner_name|Editar/);
    assert.match(orderDetail, /appliance_ref_id|Ver artefacto/);
    assert.match(orderDetail, /\/lists\/workshop\/appliances\/\$\{/);
    assert.match(orderDetail, /amount_collected|workOrderCashRemaining/);
    assert.match(orderDetail, /deposit|Seña/);
    const listPage = await source("pages/lists/[...slug].astro");
    assert.match(listPage, /workshop\/orders['"][\s\S]*Nueva OT|Nueva OT/);
    const archiveCtrl = await source("components/RecordArchiveControl.astro");
    assert.match(archiveCtrl, /sg-glass-rim|backdrop-filter/);
    assert.match(archiveCtrl, /is-delete/);
    assert.match(archiveCtrl, /prefers-reduced-motion/);
    assert.match(applianceDetail, /Historial de OT/);
    assert.match(applianceDetail, /workshop\/orders\//);
  });

  it("renders purchase order create page with searchable pickers", async () => {
    const page = await source("pages/lists/purchase/solicitudes/new.astro");
    assert.match(page, /OrderCreateForm/);
    assert.match(page, /purchase\/solicitudes/);
    assert.match(page, /partnerListKey=["']purchase\/vendors["']/);
    assert.match(page, /Proveedor|Nuevo pedido a proveedor/);
    assert.match(page, /Ver borradores/);
    assert.match(page, /Ver órdenes|Ver ordenes/);
    assert.match(page, /\/lists\/purchase\/orders/);
  });

  it("does not keep option B proxy/work surfaces", async () => {
    await assert.rejects(() => source("pages/work.astro"));
    await assert.rejects(() => source("pages/odoo-proxy/[...path].ts"));
    await assert.rejects(() => source("lib/bff/odoo-proxy.ts"));
  });

  it("marks list cells with data-label for mobile cards", async () => {
    const table = await source("components/RecordTable.astro");
    assert.match(table, /data-label=\{column\.label\}/);
  });

  it("styles record lists as glass panel with mobile card reflow", async () => {
    const css = await source("styles/list.css");

    // Contenedor: isla glass, no papel canvas
    assert.match(css, /\.sg-record-table-wrap\s*\{[^}]*backdrop-filter:/s);
    assert.match(css, /\.sg-record-table-wrap\s*\{[^}]*--sg-glass-fill/s);
    assert.doesNotMatch(
      css,
      /\.sg-record-table-wrap\s*\{[^}]*background:\s*color-mix\(in srgb,\s*var\(--sg-canvas\)/s
    );

    // Tabla on-dark
    assert.match(css, /\.sg-record-table\s*\{[^}]*--sg-text-on-dark/s);

    // Header sticky charcoal / flame
    assert.match(css, /\.sg-record-table thead\s*\{[^}]*sticky/s);
    assert.match(css, /\.sg-record-table thead\s*\{[^}]*--sg-bg-charcoal|--sg-glass-fill/s);

    // Móvil: reflow a cards
    assert.match(css, /@media\s*\(max-width:\s*767px\)/);
    assert.match(css, /@media\s*\(max-width:\s*767px\)[\s\S]*display:\s*block/);

    // Reduced motion
    assert.match(
      css,
      /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.sg-record-table tbody tr/
    );
  });

  it("densifies ficha fields and reserves aside for notes or secondary actions", async () => {
    const css = await source("styles/list.css");
    const body = await source("components/RecordDetailBody.astro");

    assert.match(
      css,
      /\.sg-ficha-layout\s*\{[^}]*grid-template-columns:\s*1fr\s*;/s
    );
    assert.match(
      css,
      /\.sg-ficha-layout:has\(\.sg-ficha-aside\)\s*\{[^}]*minmax\(16rem,\s*22rem\)/s
    );
    assert.match(
      css,
      /\.sg-detail-fields\s*\{[^}]*repeat\(\s*auto-fit\s*,\s*minmax\(\s*min\(\s*100%\s*,\s*14rem\s*\)\s*,\s*1fr\s*\)\s*\)/s
    );
    assert.match(
      css,
      /@media\s*\(max-width:\s*720px\)[\s\S]*\.sg-detail-fields\s*\{[^}]*grid-template-columns:\s*1fr/s
    );
    assert.match(body, /Astro\.slots\.has\(['"]notes['"]\)/);
    assert.match(body, /Astro\.slots\.has\(['"]secondary['"]\)/);
    assert.match(body, /sg-ficha-aside/);
    assert.match(css, /\.sg-ficha-action\s*\{/);
    assert.match(css, /\.sg-ficha-secondary-actions\s*\{/);
    assert.match(
      await source("pages/lists/accounting/customer-invoices/[id].astro"),
      /sg-ficha-action/
    );
  });

  it("densifies shared create pages to ficha frame width", async () => {
    const css = await source("styles/list.css");
    const orderForm = await source("components/OrderCreateForm.astro");
    const recordForm = await source("components/RecordCreateForm.astro");
    const billNew = await source(
      "pages/lists/accounting/vendor-bills/new.astro"
    );
    const customerNew = await source("pages/lists/sales/customers/new.astro");

    assert.match(css, /\.sg-create-page\s*\{[^}]*max-width:\s*78rem/s);
    assert.match(orderForm, /sg-order-create-meta/);
    assert.match(orderForm, /sg-order-create-body/);
    assert.match(
      orderForm,
      /\.sg-order-create-body\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1\.1fr\)\s*minmax\(0,\s*0\.9fr\)/s
    );
    assert.doesNotMatch(orderForm, /max-width:\s*40rem/);
    assert.match(
      recordForm,
      /\.sg-record-create-section-grid\s*\{[^}]*repeat\(\s*auto-fit\s*,\s*minmax\(\s*min\(\s*100%\s*,\s*14rem\s*\)\s*,\s*1fr\s*\)\s*\)/s
    );
    assert.doesNotMatch(recordForm, /max-width:\s*36rem/);
    assert.match(billNew, /sg-create-page/);
    assert.doesNotMatch(billNew, /max-width:\s*40rem/);
    assert.match(customerNew, /sg-create-page/);
    assert.doesNotMatch(customerNew, /max-width:\s*40rem/);
  });

  it("provides product image upload host with gallery picker and preview", async () => {
    const host = await source("components/ProductImageUploadHost.astro");
    assert.match(host, /data-product-image-host/);
    assert.match(host, /type=["']file["']/);
    assert.match(host, /accept=["']image\/\*["']/);
    assert.doesNotMatch(host, /\bcapture=/);
    assert.match(host, /data-product-image-preview/);
    assert.match(host, /Guardar/);
    assert.match(host, /Cancelar/);
    assert.match(host, /fetch\(/);
    assert.match(host, /image_1920/);
    assert.match(host, /let\s+readGeneration\s*=\s*0/);
    assert.match(
      host,
      /const file = fileInput\.files && fileInput\.files\[0\];\s+const generation = \+\+readGeneration;\s+pending\.dataUrl = null;\s+btnSave\.disabled = true;/s
    );
    assert.match(host, /if\s*\(\s*generation\s*!==\s*readGeneration\s*\)\s*return/);
    assert.match(host, /location\.reload\(\)/);
  });

  it("does not cache product media so uploads survive reload", async () => {
    const media = await source("pages/api/media/[model]/[id]/[field].ts");
    assert.match(media, /"cache-control":\s*"private, no-store"/);
  });

  it("wires product image upload triggers on table and detail", async () => {
    const table = await source("components/RecordTable.astro");
    const detail = await source("components/RecordDetailBody.astro");
    const listPage = await source("pages/lists/[...slug].astro");
    const productDetail = await source("pages/lists/inventory/products/[id].astro");

    assert.match(table, /imageUploadApiPath/);
    assert.match(table, /data-product-image-trigger/);
    assert.match(detail, /imageUploadApiPath/);
    assert.match(detail, /data-product-image-trigger/);
    assert.match(listPage, /ProductImageUploadHost/);
    assert.match(listPage, /imageUploadApiPath/);
    assert.match(productDetail, /ProductImageUploadHost/);
    assert.match(productDetail, /imageUploadApiPath/);
  });
});
