/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { _t } from "@web/core/l10n/translation";
import { NumberPopup } from "@point_of_sale/app/components/popups/number_popup/number_popup";
import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";
import { BACKSPACE, ZERO, SWITCHSIGN } from "@point_of_sale/app/components/numpad/numpad";
import {
    buildOrderDiscountNumpadLayout,
    isOrderDiscountKey,
    orderDiscountButton,
} from "@servigas_core/js/services/sg_pos_order_discount";

patch(ProductScreen.prototype, {
    getNumpadButtons() {
        const decimalPoint = this.env.services.localization.decimalPoint;
        const colorClassMap = {
            [decimalPoint]: "o_colorlist_item_numpad_color_6",
            Backspace: "o_colorlist_item_numpad_color_1",
            "-": "o_colorlist_item_numpad_color_3",
        };

        const orderDiscountEnabled =
            this.pos.config.module_pos_discount &&
            this.pos.config.discount_product_id &&
            this.pos.cashier._role !== "minimal";

        const quantityBtn = {
            value: "quantity",
            text: _t("Qty"),
            class: `numpad-qty rounded-0 ${this.pos.numpadMode === "quantity" ? "active" : ""}`,
        };
        const lineDiscountBtn = {
            value: "discount",
            text: _t("%"),
            disabled: !this.pos.config.manual_discount || this.pos.cashier._role === "minimal",
            class: `numpad-discount rounded-0 ${this.pos.numpadMode === "discount" ? "active" : ""}`,
        };
        const priceBtn = {
            value: "price",
            text: _t("Price"),
            disabled:
                !this.pos.cashierHasPriceControlRights() ||
                this.pos.cashier._role === "minimal" ||
                this.pos.getOrder()?.getSelectedOrderline()?.isPartOfCombo(),
            class: `numpad-price rounded-0 ${this.pos.numpadMode === "price" ? "active" : ""}`,
        };
        const orderDiscountBtn = orderDiscountButton({ disabled: !orderDiscountEnabled });

        return buildOrderDiscountNumpadLayout({
            quantityBtn,
            lineDiscountBtn,
            priceBtn,
            orderDiscountBtn,
            switchSign: {
                ...SWITCHSIGN,
                disabled: this.pos.cashier._role === "minimal",
                class: colorClassMap["-"] || "",
            },
            zero: { ...ZERO },
            decimal: {
                value: decimalPoint,
                class: colorClassMap[decimalPoint] || "",
            },
            backspace: {
                ...BACKSPACE,
                class: colorClassMap.Backspace || "",
            },
        }).map((button) => {
            if (!button || !Object.keys(button).length) {
                return button;
            }
            return {
                ...button,
                class: `${button.class || ""}`.trim(),
            };
        });
    },

    onNumpadClick(buttonValue) {
        if (isOrderDiscountKey(buttonValue)) {
            this.clickOrderDiscount();
            return;
        }
        return super.onNumpadClick(buttonValue);
    },

    clickOrderDiscount() {
        if (
            !this.pos.config.module_pos_discount ||
            !this.pos.config.discount_product_id ||
            this.pos.cashier._role === "minimal"
        ) {
            return;
        }
        this.dialog.add(NumberPopup, {
            title: _t("Discount Percentage"),
            startingValue: this.env.utils.formatCurrency(this.pos.config.discount_pc, false),
            getPayload: (num) => {
                const percent = Math.max(
                    0,
                    Math.min(100, this.env.utils.parseValidFloat(num.toString()))
                );
                this.pos.applyDiscount(percent);
            },
        });
    },
});
