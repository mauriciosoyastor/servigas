/** @odoo-module **/
/**
 * Catálogo de forms operativos sin chatter (ADR 0015).
 * Fuente de verdad para herencias XML + tests Node (seam S1).
 */

const NO_CHATTER_FORMS = [
    {
        xmlId: "product.product_template_form_view",
        model: "product.template",
        hub: "inventory",
        phase: "done",
    },
    {
        xmlId: "product.product_category_form_view",
        model: "product.category",
        hub: "inventory",
        phase: "p1",
    },
    {
        xmlId: "stock.view_picking_form",
        model: "stock.picking",
        hub: "inventory",
        phase: "p1",
    },
    {
        xmlId: "sale.view_order_form",
        model: "sale.order",
        hub: "sales",
        phase: "p1",
    },
    {
        xmlId: "purchase.purchase_order_form",
        model: "purchase.order",
        hub: "purchase",
        phase: "p1",
    },
    {
        xmlId: "account.view_move_form",
        model: "account.move",
        hub: "accounting",
        phase: "p1",
    },
    {
        xmlId: "account.view_account_payment_form",
        model: "account.payment",
        hub: "accounting",
        phase: "p1",
    },
    {
        xmlId: "base.view_partner_form",
        model: "res.partner",
        hub: "contacts",
        phase: "p1",
    },
    {
        xmlId: "product.product_pricelist_view",
        model: "product.pricelist",
        hub: "inventory",
        phase: "p2",
    },
    {
        xmlId: "stock.view_production_lot_form",
        model: "stock.lot",
        hub: "inventory",
        phase: "p2",
    },
    {
        xmlId: "stock.stock_scrap_form_view",
        model: "stock.scrap",
        hub: "inventory",
        phase: "p2",
    },
    {
        xmlId: "account.view_account_journal_form",
        model: "account.journal",
        hub: "accounting",
        phase: "p2",
    },
    {
        xmlId: "account.view_account_form",
        model: "account.account",
        hub: "accounting",
        phase: "p2",
    },
    {
        xmlId: "account.view_tax_form",
        model: "account.tax",
        hub: "accounting",
        phase: "p2",
    },
    {
        xmlId: "point_of_sale.view_pos_pos_form",
        model: "pos.order",
        hub: "pos",
        phase: "p2",
    },
    {
        xmlId: "point_of_sale.view_pos_session_form",
        model: "pos.session",
        hub: "pos",
        phase: "p2",
    },
];

export function listNoChatterForms() {
    return NO_CHATTER_FORMS.map((f) => ({ ...f }));
}

export function noChatterXmlIds() {
    return NO_CHATTER_FORMS.map((f) => f.xmlId);
}

export function noChatterModels() {
    return [...new Set(NO_CHATTER_FORMS.map((f) => f.model))];
}

export function phaseForXmlId(xmlId) {
    const row = NO_CHATTER_FORMS.find((f) => f.xmlId === xmlId);
    return row ? row.phase : null;
}
