/** @odoo-module **/

import { registry } from "@web/core/registry";
import { resolveLauncherTileAction } from "./sg_pos_entry";

const QUICK_NAV_TAGS = {
    inventory: "servigas_inventory_hub",
    sales: "servigas_sales_hub",
    purchase: "servigas_purchase_hub",
    accounting: "servigas_accounting_hub",
    pos: "__pos__",
};

export const sgLauncherService = {
    dependencies: ["orm", "action"],
    start(_env, { orm, action }) {
        let tilesCache = null;

        return {
            async loadLauncher() {
                const payload = await orm.call("sg.app.tile", "get_launcher_payload", []);
                tilesCache = payload.tiles || [];
                return payload;
            },
            openTile(tile) {
                const nextAction = resolveLauncherTileAction(tile);
                if (nextAction) {
                    return action.doAction(nextAction);
                }
                return Promise.resolve();
            },
            goHome() {
                return action.doAction("servigas_core.action_servigas_app_launcher");
            },
            async openQuickNav(key) {
                if (!tilesCache) {
                    await this.loadLauncher();
                }
                if (key === "home") {
                    return this.goHome();
                }
                const tag = QUICK_NAV_TAGS[key];
                if (!tag) {
                    return Promise.resolve();
                }
                const tile = tilesCache.find((t) => {
                    if (tag === QUICK_NAV_TAGS.pos) {
                        return t.label === "Punto de venta";
                    }
                    return t.client_tag === tag;
                });
                if (tile) {
                    return this.openTile(tile);
                }
                return Promise.resolve();
            },
        };
    },
};

registry.category("services").add("sg_launcher", sgLauncherService);
