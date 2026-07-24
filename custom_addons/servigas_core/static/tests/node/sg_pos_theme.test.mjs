import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
    bgUtilitiesToOverride,
    listPosThemeSurfaces,
    requiresBgOverride,
    requiresOnDarkContrast,
    selectorsForSurface,
    tokenRoleForSurface,
} from "../../src/js/services/sg_pos_theme.js";

const POS_SCSS = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../src/scss/servigas_pos.scss"
);

describe("POS Liquid Glass theme contract (ADR 0005)", () => {
    it("marks chrome and panes as requiring Bootstrap bg-* overrides", () => {
        const surfaces = listPosThemeSurfaces();
        for (const id of ["chrome-navbar", "chrome-canvas", "ticket-pane", "product-pane"]) {
            assert.ok(surfaces.includes(id), `missing surface ${id}`);
            assert.equal(requiresBgOverride(id), true, `${id} must override bg-*`);
            assert.ok(selectorsForSurface(id).length > 0, `${id} needs selectors`);
        }
    });

    it("lists Bootstrap bg utilities that the Mostrador theme must neutralize", () => {
        const utils = bgUtilitiesToOverride();
        for (const name of ["bg-view", "bg-100", "bg-secondary"]) {
            assert.ok(utils.includes(name), `missing utility ${name}`);
        }
    });

    it("keeps navbar chrome controls legible on the dark Mostrador canvas", () => {
        assert.ok(listPosThemeSurfaces().includes("chrome-controls"));
        assert.equal(tokenRoleForSurface("chrome-controls"), "chrome-control");
        assert.equal(requiresOnDarkContrast("chrome-controls"), true);
        assert.ok(
            selectorsForSurface("chrome-controls").includes(".pos .pos-topheader .btn-light")
        );
        assert.ok(
            selectorsForSurface("chrome-controls").includes(
                ".pos .floating-order-container .btn"
            )
        );

        const scss = readFileSync(POS_SCSS, "utf8");
        assert.ok(
            scss.includes("--btn-bg:"),
            "Odoo POS buttons paint via --btn-bg (empty BS prefix); must override that var"
        );
        assert.ok(
            scss.includes("--btn-color:"),
            "must override --btn-color so text is not white-on-light when bg var wins"
        );
        assert.ok(
            scss.includes("floating-order-container"),
            "order tabs must be restyled (pastel colorlist + white text = invisible)"
        );
    });

    it("exposes search as a command-bar surface", () => {
        assert.ok(listPosThemeSurfaces().includes("search-command"));
        assert.equal(tokenRoleForSurface("search-command"), "command-bar");
        assert.ok(selectorsForSurface("search-command").length > 0);
        assert.equal(requiresBgOverride("search-command"), false);
    });

    it("exposes category pills with pill token role", () => {
        assert.ok(listPosThemeSurfaces().includes("category-pills"));
        assert.equal(tokenRoleForSurface("category-pills"), "pill");
        assert.ok(selectorsForSurface("category-pills").includes(".pos .category-button"));
    });

    it("exposes order lines as readable dense rows without glass role", () => {
        assert.ok(listPosThemeSurfaces().includes("order-line"));
        assert.equal(tokenRoleForSurface("order-line"), "order-line");
        assert.ok(selectorsForSurface("order-line").includes(".pos .orderline"));
    });

    it("keeps selected order-line visible on the dark ticket pane", () => {
        // Servigas densify used background:transparent on all .orderline and
        // wiped Odoo .orderline.selected highlight (same specificity, later load).
        assert.equal(requiresOnDarkContrast("order-line"), true);
        assert.ok(
            selectorsForSurface("order-line").includes(".pos .orderline.selected")
        );

        const scss = readFileSync(POS_SCSS, "utf8");
        assert.ok(
            scss.includes(".orderline.selected") ||
                scss.includes("orderline.selected"),
            "must style selected ticket line explicitly"
        );
        assert.ok(
            scss.includes("--sg-pos-orderline-selected") ||
                scss.includes("sg-pos-orderline-selected"),
            "selected line needs a named Servigas highlight token"
        );
        // densify must not leave a bare transparent rule that beats .selected
        assert.ok(
            /orderline\.selected[\s\S]{0,200}background/.test(scss),
            "selected rule must set its own background after densify"
        );
    });

    it("exposes manual discount control as a visible accent surface", () => {
        assert.ok(listPosThemeSurfaces().includes("discount-control"));
        assert.equal(tokenRoleForSurface("discount-control"), "discount");
        assert.ok(selectorsForSurface("discount-control").includes(".pos .numpad-discount"));
    });

    it("exposes order-level Desc. control as discount surface (ADR 0014)", () => {
        assert.ok(listPosThemeSurfaces().includes("order-discount-control"));
        assert.equal(tokenRoleForSurface("order-discount-control"), "discount");
        assert.ok(
            selectorsForSurface("order-discount-control").includes(
                ".pos .numpad-order-discount"
            )
        );

        const scss = readFileSync(POS_SCSS, "utf8");
        assert.ok(
            scss.includes("numpad-order-discount"),
            "servigas_pos.scss must style Desc. button"
        );
    });

    it("exposes pay CTA with primary token role", () => {
        assert.ok(listPosThemeSurfaces().includes("pay-cta"));
        assert.equal(tokenRoleForSurface("pay-cta"), "cta-primary");
        assert.ok(selectorsForSurface("pay-cta").includes(".pos .pay-order-button"));
    });

    it("keeps SCSS overrides aligned with bg utilities in the contract", () => {
        const scss = readFileSync(POS_SCSS, "utf8");
        for (const name of bgUtilitiesToOverride()) {
            assert.ok(
                scss.includes(`.${name}`),
                `servigas_pos.scss must target .${name} (ADR 0005)`
            );
        }
        for (const id of ["chrome-navbar", "chrome-canvas", "ticket-pane", "product-pane"]) {
            for (const selector of selectorsForSurface(id)) {
                const needle = selector.replace(/^\.pos\s+/, "");
                assert.ok(
                    scss.includes(needle),
                    `servigas_pos.scss missing rule for ${selector}`
                );
            }
        }
    });
});

describe("POS UX phases — product card (ADR 0012 Fase A)", () => {
    it("exposes product-card surface with product-card token role", () => {
        assert.ok(listPosThemeSurfaces().includes("product-card"));
        assert.equal(tokenRoleForSurface("product-card"), "product-card");
        assert.equal(requiresBgOverride("product-card"), false);
        assert.ok(
            selectorsForSurface("product-card").includes(".pos .rightpane .product")
        );
    });

    it("anchors product-card typography in servigas_pos.scss", () => {
        const scss = readFileSync(POS_SCSS, "utf8");
        assert.ok(
            scss.includes(".pos .rightpane .product"),
            "product tile selector required"
        );
        assert.ok(
            scss.includes(".pos .product-name") || scss.includes(".product-name"),
            "product name typography required"
        );
        assert.ok(
            scss.includes("text-transform: none"),
            "Mostrador must not force uppercase on product tiles (ADR 0012)"
        );
        assert.ok(
            scss.includes("-webkit-line-clamp"),
            "product names need controlled clamp for dense grid readability"
        );
    });

    it("exposes product-card-image surface for img and missing-image states", () => {
        assert.ok(listPosThemeSurfaces().includes("product-card-image"));
        assert.equal(tokenRoleForSurface("product-card-image"), "product-image");
        assert.equal(requiresBgOverride("product-card-image"), false);
        const selectors = selectorsForSurface("product-card-image");
        assert.ok(selectors.includes(".pos .rightpane .product .product-img"));
        assert.ok(selectors.includes(".pos .rightpane .product .product-img img"));
        // Odoo 19 omits .product-img when imageUrl is empty; name gets .no-image
        assert.ok(selectors.includes(".pos .rightpane .product .product-name.no-image"));
    });

    it("anchors product image fallback styling in servigas_pos.scss", () => {
        const scss = readFileSync(POS_SCSS, "utf8");
        assert.ok(
            scss.includes(".product-img"),
            "must style Odoo 19 .product-img container"
        );
        assert.ok(
            scss.includes("object-fit: cover") || scss.includes("object-fit:cover"),
            "product photos need cover fit"
        );
        assert.ok(
            scss.includes(".product-name.no-image") || scss.includes("product-name.no-image"),
            "missing-image tiles need Servigas fallback (Odoo uses .no-image)"
        );
        assert.ok(
            scss.includes("sg-pos-product-fallback") ||
                scss.includes("--sg-pos-product-fallback"),
            "fallback uses a named Servigas token/marker for the empty tile"
        );
    });
});

describe("POS UX phases — Acciones modal (ADR 0012 Fase B)", () => {
    // DOM Odoo 19: ControlButtonsPopup → .control-buttons.control-buttons-modal;
    // Cancel Order = button with .fa-trash (no dedicated BEM class).
    it("exposes acciones-modal as glass-panel for the Actions dialog body", () => {
        assert.ok(listPosThemeSurfaces().includes("acciones-modal"));
        assert.equal(tokenRoleForSurface("acciones-modal"), "glass-panel");
        assert.equal(requiresBgOverride("acciones-modal"), false);
        assert.equal(requiresOnDarkContrast("acciones-modal"), true);
        const selectors = selectorsForSurface("acciones-modal");
        assert.ok(selectors.includes(".pos .control-buttons-modal"));
        assert.ok(
            selectors.includes(".pos .modal-content:has(.control-buttons-modal)")
        );
    });

    it("exposes acciones-destructive for Cancel Order via fa-trash", () => {
        assert.ok(listPosThemeSurfaces().includes("acciones-destructive"));
        assert.equal(tokenRoleForSurface("acciones-destructive"), "destructive");
        assert.equal(requiresBgOverride("acciones-destructive"), false);
        assert.ok(
            selectorsForSurface("acciones-destructive").includes(
                ".pos .control-buttons-modal button:has(.fa-trash)"
            )
        );
    });

    it("anchors Acciones hierarchy in servigas_pos.scss", () => {
        const scss = readFileSync(POS_SCSS, "utf8");
        assert.ok(
            scss.includes("control-buttons-modal"),
            "must style Odoo 19 Actions modal body"
        );
        assert.ok(
            scss.includes(":has(.fa-trash)") || scss.includes(":has(.fa-trash )"),
            "Cancel Order has no BEM class — target button:has(.fa-trash)"
        );
        assert.ok(
            scss.includes("--sg-pos-acciones-destructive") ||
                scss.includes("sg-pos-acciones-destructive"),
            "destructive action needs a named Servigas token/marker"
        );
        assert.ok(
            !/control-buttons-modal[\s\S]{0,400}sg-flame-cta/.test(scss),
            "Acciones Cancel must not reuse pay-cta flame CTA styling"
        );
    });
});

describe("POS UX phases — ticket empty + order lines (ADR 0012 Fase C)", () => {
    // DOM Odoo 19 OrderDisplay: empty cart = flex placeholder without .order-container /
    // .orderline (no dedicated empty BEM class).
    it("exposes ticket-empty surface for leftpane without order lines", () => {
        assert.ok(listPosThemeSurfaces().includes("ticket-empty"));
        assert.equal(tokenRoleForSurface("ticket-empty"), "empty-state");
        assert.equal(requiresBgOverride("ticket-empty"), false);
        const selectors = selectorsForSurface("ticket-empty");
        assert.ok(
            selectors.includes(
                ".pos .product-screen .leftpane:not(:has(.orderline))"
            )
        );
    });

    it("anchors ticket empty-state and denser order lines in servigas_pos.scss", () => {
        const scss = readFileSync(POS_SCSS, "utf8");
        assert.ok(
            scss.includes(":not(:has(.orderline))") ||
                scss.includes(":not(:has(.orderline ))"),
            "empty ticket must target leftpane without .orderline"
        );
        assert.ok(
            scss.includes("--sg-pos-ticket-empty") ||
                scss.includes("sg-pos-ticket-empty"),
            "empty ticket needs a named Servigas token/marker"
        );
        assert.ok(
            scss.includes("::before") || scss.includes(":before"),
            "empty state copy/visual via ::before (no OWL)"
        );
        assert.ok(
            scss.includes(".pos .orderline") || scss.includes(".orderline"),
            "order-line surface still styled"
        );
        assert.ok(
            scss.includes(".orderline .qty") || scss.includes(".orderline .product-price"),
            "denser lines need qty/price hierarchy anchors"
        );
    });
});

describe("POS payment theme — chrome + due (ADR 0013 Fase A)", () => {
    it("exposes payment-chrome canvas that must override bg-100", () => {
        assert.ok(listPosThemeSurfaces().includes("payment-chrome"));
        assert.equal(tokenRoleForSurface("payment-chrome"), "canvas");
        assert.equal(requiresBgOverride("payment-chrome"), true);
        const selectors = selectorsForSurface("payment-chrome");
        assert.ok(selectors.includes(".pos .payment-screen"));
        assert.ok(selectors.includes(".pos .payment-screen .main-content"));
    });

    it("exposes payment-due with payment-due token role", () => {
        assert.ok(listPosThemeSurfaces().includes("payment-due"));
        assert.equal(tokenRoleForSurface("payment-due"), "payment-due");
        assert.equal(requiresBgOverride("payment-due"), false);
        const selectors = selectorsForSurface("payment-due");
        assert.ok(selectors.includes(".pos .paymentlines-container .total"));
        assert.ok(selectors.includes(".pos .paymentlines-empty"));
    });

    it("anchors payment chrome and due contrast in servigas_pos.scss", () => {
        const scss = readFileSync(POS_SCSS, "utf8");
        assert.ok(
            scss.includes(".payment-screen"),
            "must style Odoo 19 PaymentScreen root"
        );
        assert.ok(
            scss.includes("paymentlines-container") || scss.includes(".paymentlines-empty"),
            "must style Due / empty payment lines container"
        );
        assert.ok(
            scss.includes("--sg-pos-payment-due") || scss.includes("sg-pos-payment-due"),
            "Due amount needs a named Servigas token/marker"
        );
        assert.ok(
            scss.includes("text-dark") || scss.includes("--sg-text-on-dark"),
            "must neutralize Odoo text-dark on Due for on-dark canvas"
        );
    });
});

describe("POS payment theme — methods + validate (ADR 0013 Fase B)", () => {
    it("exposes payment-methods with chrome-control role", () => {
        assert.ok(listPosThemeSurfaces().includes("payment-methods"));
        assert.equal(tokenRoleForSurface("payment-methods"), "chrome-control");
        assert.equal(requiresBgOverride("payment-methods"), true);
        const selectors = selectorsForSurface("payment-methods");
        assert.ok(selectors.includes(".pos .paymentmethods"));
        assert.ok(selectors.includes(".pos .paymentmethod"));
    });

    it("exposes payment-line as dense readable rows", () => {
        assert.ok(listPosThemeSurfaces().includes("payment-line"));
        assert.equal(tokenRoleForSurface("payment-line"), "order-line");
        // Odoo paints .bg-view / .selected with light active bg — must override
        // or on-dark text (white) becomes invisible on white chips.
        assert.equal(requiresBgOverride("payment-line"), true);
        assert.equal(requiresOnDarkContrast("payment-line"), true);
        const selectors = selectorsForSurface("payment-line");
        assert.ok(selectors.includes(".pos .paymentlines .paymentline"));
        assert.ok(selectors.includes(".pos .paymentlines .paymentline.bg-view"));
        assert.ok(selectors.includes(".pos .paymentlines .paymentline.selected"));
    });

    it("anchors payment-line dark chip contrast in servigas_pos.scss", () => {
        const scss = readFileSync(POS_SCSS, "utf8");
        assert.ok(
            scss.includes("paymentline.bg-view") ||
                scss.includes(".paymentline.bg-view"),
            "must override Odoo unselected .bg-view light chip"
        );
        assert.ok(
            scss.includes("paymentline.selected") ||
                scss.includes(".paymentline.selected"),
            "must override Odoo .selected light active background"
        );
        assert.ok(
            scss.includes("--sg-pos-payment-line") ||
                scss.includes("sg-pos-payment-line"),
            "payment line chip needs a named Servigas bg token/marker"
        );
    });

    it("exposes payment-validate as primary CTA", () => {
        assert.ok(listPosThemeSurfaces().includes("payment-validate"));
        assert.equal(tokenRoleForSurface("payment-validate"), "cta-primary");
        assert.equal(requiresBgOverride("payment-validate"), false);
        const selectors = selectorsForSurface("payment-validate");
        assert.ok(
            selectors.includes(".pos .payment-screen .validation-button.next")
        );
    });

    it("anchors methods, lines, and Validate vs Back in servigas_pos.scss", () => {
        const scss = readFileSync(POS_SCSS, "utf8");
        assert.ok(
            scss.includes(".paymentmethod") || scss.includes("paymentmethods"),
            "must style payment method buttons"
        );
        assert.ok(
            scss.includes(".paymentline") || scss.includes("paymentlines"),
            "must style payment lines"
        );
        assert.ok(
            scss.includes("validation-button") || scss.includes(".next"),
            "must style Validate CTA"
        );
        assert.ok(
            scss.includes("--sg-pos-payment-validate") ||
                scss.includes("sg-flame-cta") ||
                scss.includes("sg-flame-gradient"),
            "Validate must use Servigas flame / primary language"
        );
        assert.ok(
            scss.includes(".back-button") || scss.includes("back-button"),
            "Back must be styled separately so it is not flame CTA"
        );
    });
});

describe("POS receipt theme — chrome + done (ADR 0013 Fase C)", () => {
    it("exposes receipt-chrome canvas that must override bg-100", () => {
        assert.ok(listPosThemeSurfaces().includes("receipt-chrome"));
        assert.equal(tokenRoleForSurface("receipt-chrome"), "canvas");
        assert.equal(requiresBgOverride("receipt-chrome"), true);
        assert.ok(
            selectorsForSurface("receipt-chrome").includes(".pos .receipt-screen")
        );
    });

    it("exposes receipt-pane as glass-panel for the paper container", () => {
        assert.ok(listPosThemeSurfaces().includes("receipt-pane"));
        assert.equal(tokenRoleForSurface("receipt-pane"), "glass-panel");
        assert.equal(requiresBgOverride("receipt-pane"), true);
        assert.ok(
            selectorsForSurface("receipt-pane").includes(
                ".pos .pos-receipt-container"
            )
        );
    });

    it("exposes receipt-done as primary CTA", () => {
        assert.ok(listPosThemeSurfaces().includes("receipt-done"));
        assert.equal(tokenRoleForSurface("receipt-done"), "cta-primary");
        assert.equal(requiresBgOverride("receipt-done"), false);
        const selectors = selectorsForSurface("receipt-done");
        assert.ok(selectors.includes(".pos .receipt-screen .button.next.validation"));
    });

    it("anchors receipt chrome, paper pane, and Done CTA in servigas_pos.scss", () => {
        const scss = readFileSync(POS_SCSS, "utf8");
        assert.ok(
            scss.includes(".receipt-screen"),
            "must style Odoo 19 ReceiptScreen root"
        );
        assert.ok(
            scss.includes("pos-receipt-container"),
            "must style receipt paper container"
        );
        assert.ok(
            scss.includes("--sg-pos-receipt-paper") ||
                scss.includes("sg-pos-receipt-paper"),
            "printed ticket stays light paper on dark canvas"
        );
        assert.ok(
            scss.includes("--sg-pos-receipt-done") ||
                scss.includes("sg-flame-cta") ||
                scss.includes("sg-flame-gradient"),
            "New Order / Done must use Servigas flame CTA"
        );
    });
});
