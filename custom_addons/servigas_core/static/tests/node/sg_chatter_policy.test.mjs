import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
    listNoChatterForms,
    noChatterModels,
    noChatterXmlIds,
    phaseForXmlId,
} from "../../src/js/services/sg_chatter_policy.js";

const BACKEND_SCSS = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../src/scss/servigas_backend.scss"
);

describe("chatter policy catalog (ADR 0015 / S1)", () => {
    it("includes the Inventario product.template pilot form", () => {
        const xmlId = "product.product_template_form_view";
        const forms = listNoChatterForms();
        const pilot = forms.find((f) => f.xmlId === xmlId);

        assert.ok(pilot, "pilot form missing from catalog");
        assert.equal(pilot.model, "product.template");
        assert.equal(pilot.hub, "inventory");
        assert.equal(pilot.phase, "done");

        assert.ok(noChatterXmlIds().includes(xmlId));
        assert.ok(noChatterModels().includes("product.template"));
        assert.equal(phaseForXmlId(xmlId), "done");
    });

    it("lists Inventario P1 forms (category + picking)", () => {
        const expected = [
            {
                xmlId: "product.product_category_form_view",
                model: "product.category",
                hub: "inventory",
            },
            {
                xmlId: "stock.view_picking_form",
                model: "stock.picking",
                hub: "inventory",
            },
        ];
        for (const row of expected) {
            const found = listNoChatterForms().find((f) => f.xmlId === row.xmlId);
            assert.ok(found, `missing ${row.xmlId}`);
            assert.equal(found.model, row.model);
            assert.equal(found.hub, row.hub);
            assert.equal(found.phase, "p1");
            assert.equal(phaseForXmlId(row.xmlId), "p1");
        }
    });

    it("lists Ventas and Compras P1 order forms", () => {
        const expected = [
            {
                xmlId: "sale.view_order_form",
                model: "sale.order",
                hub: "sales",
            },
            {
                xmlId: "purchase.purchase_order_form",
                model: "purchase.order",
                hub: "purchase",
            },
        ];
        for (const row of expected) {
            const found = listNoChatterForms().find((f) => f.xmlId === row.xmlId);
            assert.ok(found, `missing ${row.xmlId}`);
            assert.equal(found.model, row.model);
            assert.equal(found.hub, row.hub);
            assert.equal(found.phase, "p1");
        }
    });

    it("lists Facturación and partner P1 forms", () => {
        const expected = [
            {
                xmlId: "account.view_move_form",
                model: "account.move",
                hub: "accounting",
            },
            {
                xmlId: "account.view_account_payment_form",
                model: "account.payment",
                hub: "accounting",
            },
            {
                xmlId: "base.view_partner_form",
                model: "res.partner",
                hub: "contacts",
            },
        ];
        for (const row of expected) {
            const found = listNoChatterForms().find((f) => f.xmlId === row.xmlId);
            assert.ok(found, `missing ${row.xmlId}`);
            assert.equal(found.model, row.model);
            assert.equal(found.hub, row.hub);
            assert.equal(found.phase, "p1");
        }
    });

    it("lists P2 config and POS-backend forms", () => {
        const expected = [
            {
                xmlId: "product.product_pricelist_view",
                model: "product.pricelist",
                hub: "inventory",
            },
            {
                xmlId: "stock.view_production_lot_form",
                model: "stock.lot",
                hub: "inventory",
            },
            {
                xmlId: "stock.stock_scrap_form_view",
                model: "stock.scrap",
                hub: "inventory",
            },
            {
                xmlId: "account.view_account_journal_form",
                model: "account.journal",
                hub: "accounting",
            },
            {
                xmlId: "account.view_account_form",
                model: "account.account",
                hub: "accounting",
            },
            {
                xmlId: "account.view_tax_form",
                model: "account.tax",
                hub: "accounting",
            },
            {
                xmlId: "point_of_sale.view_pos_pos_form",
                model: "pos.order",
                hub: "pos",
            },
            {
                xmlId: "point_of_sale.view_pos_session_form",
                model: "pos.session",
                hub: "pos",
            },
        ];
        for (const row of expected) {
            const found = listNoChatterForms().find((f) => f.xmlId === row.xmlId);
            assert.ok(found, `missing ${row.xmlId}`);
            assert.equal(found.model, row.model);
            assert.equal(found.hub, row.hub);
            assert.equal(found.phase, "p2");
        }
    });
});

describe("chatter policy layout anchors (ADR 0015 / S2)", () => {
    it("scopes full-width sheet and residual chatter hide under .sg-form-no-chatter", () => {
        const scss = readFileSync(BACKEND_SCSS, "utf8");
        assert.ok(
            scss.includes(".sg-form-no-chatter"),
            "canonical class .sg-form-no-chatter must exist"
        );
        assert.ok(
            scss.includes("max-width: none"),
            "sheet must drop Odoo ~1400px cap"
        );
        assert.ok(
            scss.includes(".o-mail-Form-chatter"),
            "must hide residual mail chatter container"
        );
    });
});
