/** @odoo-module **/

/** Numpad key for order-level % discount (distinct from line `discount`). */
export const ORDER_DISCOUNT_VALUE = "order_discount";

export function isOrderDiscountKey(value) {
    return value === ORDER_DISCOUNT_VALUE;
}

export function orderDiscountButton({ disabled = false } = {}) {
    return {
        value: ORDER_DISCOUNT_VALUE,
        text: "Desc.",
        disabled: Boolean(disabled),
        class: "numpad-order-discount rounded-0",
    };
}

/**
 * 5×4 product-screen numpad: Qty / % / Price on the right, Desc. under Price,
 * then +/- 0 decimal Backspace. Empty cells are `{}` (OWL Numpad renders spans).
 */
export function buildOrderDiscountNumpadLayout({
    quantityBtn,
    lineDiscountBtn,
    priceBtn,
    orderDiscountBtn,
    switchSign,
    zero,
    decimal,
    backspace,
    empty = {},
}) {
    return [
        { value: "1" },
        { value: "2" },
        { value: "3" },
        quantityBtn,
        { value: "4" },
        { value: "5" },
        { value: "6" },
        lineDiscountBtn,
        { value: "7" },
        { value: "8" },
        { value: "9" },
        priceBtn,
        empty,
        empty,
        empty,
        orderDiscountBtn,
        switchSign,
        zero,
        decimal,
        backspace,
    ];
}
