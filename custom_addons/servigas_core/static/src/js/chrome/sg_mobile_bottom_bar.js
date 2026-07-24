/** @odoo-module **/

import { Component, useState } from "@odoo/owl";
import { useService, useBus } from "@web/core/utils/hooks";
import { UserMenu } from "@web/webclient/user_menu/user_menu";

const MOBILE_SLOTS = [
    { id: "home", icon: "fa-home", label: "Inicio", navKey: "home" },
    { id: "inventory", icon: "fa-cubes", label: "Inventario", navKey: "inventory" },
    { id: "sales", icon: "fa-line-chart", label: "Ventas", navKey: "sales" },
    { id: "pos", icon: "fa-shopping-basket", label: "POS", navKey: "pos" },
    { id: "user", icon: "fa-user", label: "Usuario", navKey: null },
];

export class SgMobileBottomBar extends Component {
    static template = "servigas_core.SgMobileBottomBar";
    static components = { UserMenu };
    static props = {};

    setup() {
        this.launcherService = useService("sg_launcher");
        this.actionService = useService("action");
        this.slots = MOBILE_SLOTS;
        this.state = useState({ tick: 0 });

        useBus(this.env.bus, "ACTION_MANAGER:UPDATE", () => {
            this.state.tick++;
        });
    }

    isActive(slot) {
        void this.state.tick;
        if (slot.navKey === "home") {
            const action = this.actionService.currentController?.action;
            return action?.tag === "servigas_app_launcher";
        }
        if (!slot.navKey) {
            return false;
        }
        const tagMap = {
            inventory: "servigas_inventory_hub",
            sales: "servigas_sales_hub",
            pos: null,
        };
        const action = this.actionService.currentController?.action;
        if (slot.navKey === "pos") {
            return action?.tag === "pos" || action?.xml_id?.includes("pos");
        }
        return action?.tag === tagMap[slot.navKey];
    }

    onSlotClick(slot) {
        if (!slot.navKey) {
            return;
        }
        return this.launcherService.openQuickNav(slot.navKey);
    }
}
