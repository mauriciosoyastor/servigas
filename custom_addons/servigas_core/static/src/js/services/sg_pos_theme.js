/** @odoo-module **/

/** Bootstrap utilities that fight Servigas POS theme on Odoo 19 (ADR 0005). */
export const BG_UTILITIES_TO_OVERRIDE = ["bg-view", "bg-100", "bg-secondary"];

const SURFACES = {
    "chrome-navbar": {
        tokenRole: "glass-panel",
        requiresBgOverride: true,
        selectors: [".pos .pos-topheader"],
    },
    "chrome-controls": {
        tokenRole: "chrome-control",
        requiresBgOverride: true,
        requiresOnDarkContrast: true,
        selectors: [
            ".pos .pos-topheader .btn-light",
            ".pos .pos-topheader .btn-secondary",
            ".pos .floating-order-container .btn",
        ],
    },
    "chrome-canvas": {
        tokenRole: "canvas",
        requiresBgOverride: true,
        selectors: [".pos .pos-content"],
    },
    "ticket-pane": {
        tokenRole: "glass-panel",
        requiresBgOverride: true,
        selectors: [".pos .product-screen .leftpane"],
    },
    "product-pane": {
        tokenRole: "canvas",
        requiresBgOverride: true,
        selectors: [".pos .product-screen .rightpane"],
    },
    "search-command": {
        tokenRole: "command-bar",
        requiresBgOverride: false,
        selectors: [
            ".pos .pos-rightheader .input-container",
            ".pos .sg-command-bar",
        ],
    },
    "category-pills": {
        tokenRole: "pill",
        requiresBgOverride: false,
        selectors: [".pos .category-button"],
    },
    "order-line": {
        tokenRole: "order-line",
        requiresBgOverride: false,
        requiresOnDarkContrast: true,
        selectors: [".pos .orderline", ".pos .orderline.selected"],
    },
    "discount-control": {
        tokenRole: "discount",
        requiresBgOverride: false,
        selectors: [".pos .numpad-discount"],
    },
    // ADR 0014 — order-level Desc. on numpad (pos_discount)
    "order-discount-control": {
        tokenRole: "discount",
        requiresBgOverride: false,
        selectors: [".pos .numpad-order-discount"],
    },
    "pay-cta": {
        tokenRole: "cta-primary",
        requiresBgOverride: false,
        selectors: [".pos .pay-order-button"],
    },
    // ADR 0012 Fase A
    "product-card": {
        tokenRole: "product-card",
        requiresBgOverride: false,
        selectors: [".pos .rightpane .product"],
    },
    "product-card-image": {
        tokenRole: "product-image",
        requiresBgOverride: false,
        selectors: [
            ".pos .rightpane .product .product-img",
            ".pos .rightpane .product .product-img img",
            ".pos .rightpane .product .product-name.no-image",
        ],
    },
    // ADR 0012 Fase B — ControlButtonsPopup ("Acciones")
    "acciones-modal": {
        tokenRole: "glass-panel",
        requiresBgOverride: false,
        requiresOnDarkContrast: true,
        selectors: [
            ".pos .control-buttons-modal",
            ".pos .modal-content:has(.control-buttons-modal)",
        ],
    },
    "acciones-destructive": {
        tokenRole: "destructive",
        requiresBgOverride: false,
        selectors: [".pos .control-buttons-modal button:has(.fa-trash)"],
    },
    // ADR 0012 Fase C — empty OrderDisplay has no BEM; leftpane without .orderline
    "ticket-empty": {
        tokenRole: "empty-state",
        requiresBgOverride: false,
        selectors: [".pos .product-screen .leftpane:not(:has(.orderline))"],
    },
    // ADR 0013 Fase A — PaymentScreen canvas + Due
    "payment-chrome": {
        tokenRole: "canvas",
        requiresBgOverride: true,
        selectors: [".pos .payment-screen", ".pos .payment-screen .main-content"],
    },
    "payment-due": {
        tokenRole: "payment-due",
        requiresBgOverride: false,
        selectors: [
            ".pos .paymentlines-container .total",
            ".pos .paymentlines-empty",
        ],
    },
    // ADR 0013 Fase B — methods, lines, Validate
    "payment-methods": {
        tokenRole: "chrome-control",
        requiresBgOverride: true,
        requiresOnDarkContrast: true,
        selectors: [".pos .paymentmethods", ".pos .paymentmethod"],
    },
    "payment-line": {
        tokenRole: "order-line",
        requiresBgOverride: true,
        requiresOnDarkContrast: true,
        selectors: [
            ".pos .paymentlines .paymentline",
            ".pos .paymentlines .paymentline.bg-view",
            ".pos .paymentlines .paymentline.selected",
        ],
    },
    "payment-validate": {
        tokenRole: "cta-primary",
        requiresBgOverride: false,
        selectors: [".pos .payment-screen .validation-button.next"],
    },
    // ADR 0013 Fase C — ReceiptScreen
    "receipt-chrome": {
        tokenRole: "canvas",
        requiresBgOverride: true,
        selectors: [".pos .receipt-screen"],
    },
    "receipt-pane": {
        tokenRole: "glass-panel",
        requiresBgOverride: true,
        selectors: [".pos .pos-receipt-container"],
    },
    "receipt-done": {
        tokenRole: "cta-primary",
        requiresBgOverride: false,
        selectors: [
            ".pos .receipt-screen .validation",
            ".pos .receipt-screen .button.next.validation",
        ],
    },
};

export function listPosThemeSurfaces() {
    return Object.keys(SURFACES);
}

export function selectorsForSurface(id) {
    return SURFACES[id]?.selectors?.slice() || [];
}

export function requiresBgOverride(id) {
    return Boolean(SURFACES[id]?.requiresBgOverride);
}

export function requiresOnDarkContrast(id) {
    return Boolean(SURFACES[id]?.requiresOnDarkContrast);
}

export function tokenRoleForSurface(id) {
    return SURFACES[id]?.tokenRole || null;
}

export function bgUtilitiesToOverride() {
    return BG_UTILITIES_TO_OVERRIDE.slice();
}
