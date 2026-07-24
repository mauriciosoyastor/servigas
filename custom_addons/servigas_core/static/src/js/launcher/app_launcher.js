/** @odoo-module **/

import { Component, useState, onWillStart } from "@odoo/owl";
import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { SgLauncherShell } from "./sg_launcher_shell";
import { SgLauncherTile } from "./sg_launcher_tile";

export class AppLauncher extends Component {
    static template = "servigas_core.AppLauncher";
    static path = "servigas_app_launcher";
    static components = { SgLauncherShell, SgLauncherTile };
    static props = ["*"];

    setup() {
        this.launcherService = useService("sg_launcher");
        this.state = useState({
            tiles: [],
            loading: true,
        });
        onWillStart(async () => {
            await this.loadLauncher();
        });
    }

    get shellProps() {
        return {
            showTitle: false,
            showSubtitle: false,
            showHome: false,
            showBack: false,
            isRootMenu: true,
        };
    }

    async loadLauncher() {
        this.state.loading = true;
        const payload = await this.launcherService.loadLauncher();
        this.state.tiles = payload.tiles || [];
        this.state.loading = false;
    }

    onTileClick(tile) {
        return this.launcherService.openTile(tile);
    }
}

registry.category("actions").add("servigas_app_launcher", AppLauncher);
