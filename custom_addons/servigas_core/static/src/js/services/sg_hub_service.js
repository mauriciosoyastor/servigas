/** @odoo-module **/

import { registry } from "@web/core/registry";

const RAIL_STORAGE_KEY = "sg_rail_expanded";

export const sgHubService = {
    dependencies: ["orm", "action"],
    start(_env, { orm, action }) {
        return {
            async loadHub(app, section) {
                return orm.call("sg.hub.card", "get_hub_payload", [app, section]);
            },
            openCard(card) {
                return action.doAction(card.action);
            },
            getRailExpanded(defaultExpanded = true) {
                const stored = localStorage.getItem(RAIL_STORAGE_KEY);
                if (stored === null) {
                    return defaultExpanded;
                }
                return stored === "true";
            },
            setRailExpanded(expanded) {
                localStorage.setItem(RAIL_STORAGE_KEY, expanded ? "true" : "false");
            },
        };
    },
};

registry.category("services").add("sg_hub", sgHubService);
