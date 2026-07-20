import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    ORDER_DISCOUNT_VALUE,
    buildOrderDiscountNumpadLayout,
    isOrderDiscountKey,
    orderDiscountButton,
} from "../../src/js/services/sg_pos_order_discount.js";

describe("POS order discount numpad layout (ADR 0014)", () => {
    it("exposes a stable order_discount key distinct from line %", () => {
        assert.equal(ORDER_DISCOUNT_VALUE, "order_discount");
        assert.equal(isOrderDiscountKey("order_discount"), true);
        assert.equal(isOrderDiscountKey("discount"), false);
    });

    it("builds Desc. button with theme class hook", () => {
        const btn = orderDiscountButton({ disabled: false });
        assert.equal(btn.value, ORDER_DISCOUNT_VALUE);
        assert.equal(btn.text, "Desc.");
        assert.ok(String(btn.class).includes("numpad-order-discount"));
        assert.equal(btn.disabled, false);
    });

    it("places Desc. under Price and keeps Backspace on the last row", () => {
        const qty = { value: "quantity", text: "Cant." };
        const linePct = { value: "discount", text: "%" };
        const price = { value: "price", text: "Precio" };
        const desc = orderDiscountButton();
        const switchSign = { value: "-", text: "+/-" };
        const zero = { value: "0" };
        const decimal = { value: "," };
        const backspace = { value: "Backspace", text: "⌫" };

        const buttons = buildOrderDiscountNumpadLayout({
            quantityBtn: qty,
            lineDiscountBtn: linePct,
            priceBtn: price,
            orderDiscountBtn: desc,
            switchSign,
            zero,
            decimal,
            backspace,
        });

        assert.equal(buttons.length, 20, "5×4 grid");
        // Row 3 right = Precio (index 11)
        assert.equal(buttons[11].value, "price");
        // Row 4 right = Desc. (index 15) — under Precio
        assert.equal(buttons[15].value, ORDER_DISCOUNT_VALUE);
        // Row 5 right = Backspace (index 19)
        assert.equal(buttons[19].value, "Backspace");
        // Empty fillers on row 4 left
        assert.equal(Object.keys(buttons[12]).length, 0);
        assert.equal(Object.keys(buttons[13]).length, 0);
        assert.equal(Object.keys(buttons[14]).length, 0);
    });
});
