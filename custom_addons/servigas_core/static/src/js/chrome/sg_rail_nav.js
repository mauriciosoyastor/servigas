/** @odoo-module **/

import { Component, useState, onWillStart, onWillUnmount } from "@odoo/owl";
import { useService, useBus } from "@web/core/utils/hooks";
import { UserMenu } from "@web/webclient/user_menu/user_menu";
import {
    bindActionUpdateSync,
    bindRailShellChangeSync,
    isRailTileActive,
    resolveRailNavContext,
} from "./sg_rail_context";

const RAIL_HUB_SECTIONS = [
    { code: "summary", name: "Resumen", icon: "fa-th-large" },
    { code: "operations", name: "Operaciones", icon: "fa-briefcase" },
    { code: "more", name: "Más", icon: "fa-ellipsis-h" },
];

export class SgRailNav extends Component {
    static template = "servigas_core.SgRailNav";
    static components = { UserMenu };
    static props = {};

    setup() {
        this.launcherService = useService("sg_launcher");
        this.railService = useService("sg_rail");
        this.hubService = useService("sg_hub");
        this.actionService = useService("action");

        this.hubSections = RAIL_HUB_SECTIONS;

        this.state = useState({
            tiles: [],
            loading: true,
            activeTag: "",
            activeHubSection: "summary",
            hubApp: null,
            showBackToHub: false,
        });

        this.rail = useState({
            isExpanded: this.railService.isExpanded,
            pinMode: this.railService.pinMode,
        });

        this._railUnsub = this.railService.subscribe(() => {
            this.rail.isExpanded = this.railService.isExpanded;
            this.rail.pinMode = this.railService.pinMode;
        });

        onWillStart(async () => {
            await this.loadTiles();
        });

        this._actionUnsub = bindActionUpdateSync(this.env.bus, () => {
            this.syncContext();
            this.railService.refresh();
        });

        this._shellUnsub = bindRailShellChangeSync(this.env.bus, () => {
            this.syncContext();
            this.railService.refresh();
        });

        useBus(this.env.bus, "SG_HUB:SECTION_SELECT", () => {
            this.syncHubSection();
        });

        onWillUnmount(() => {
            this._railUnsub?.();
            this._actionUnsub?.();
            this._shellUnsub?.();
        });
    }

    get railToggleTitle() {
        const mode = this.rail.pinMode;
        if (mode === "auto") {
            return "Fijar rail (automático)";
        }
        return mode === "expanded" ? "Colapsar rail" : "Expandir rail";
    }

    get showHubSections() {
        return Boolean(this.state.hubApp);
    }

    async loadTiles() {
        this.state.loading = true;
        const payload = await this.launcherService.loadLauncher();
        this.state.tiles = payload.tiles || [];
        this.state.loading = false;
        this.syncContext();
    }

    syncContext() {
        const action = this.actionService.currentController?.action;
        const resolved = resolveRailNavContext({
            actionTag: action ? action.tag || "" : null,
            getAppFromHubTag: (tag) => this.hubService.getAppFromHubTag(tag),
            getReturnContext: () => this.hubService.getReturnContext(),
            getStoredSection: (app) => this.hubService.getStoredSection(app),
        });
        this.state.activeTag = resolved.activeTag;
        this.state.hubApp = resolved.hubApp;
        this.state.showBackToHub = resolved.showBackToHub;
        this.state.activeHubSection = resolved.activeHubSection;
    }

    syncHubSection() {
        if (!this.state.hubApp) {
            return;
        }
        this.state.activeHubSection = this.hubService.getStoredSection(this.state.hubApp);
    }

    isTileActive(tile) {
        const returnHubTag = this.state.showBackToHub
            ? this.hubService.getReturnContext()?.hubTag
            : null;
        return isRailTileActive(this.state.activeTag, tile, returnHubTag);
    }

    isSectionActive(section) {
        return this.state.activeHubSection === section.code;
    }

    onHomeClick() {
        this.hubService.clearReturnContext();
        return Promise.resolve(this.launcherService.goHome()).then(() => {
            this.syncContext();
            this.railService.refresh();
        });
    }

    onToggleClick() {
        this.railService.cyclePinMode();
    }

    onRailMouseEnter() {
        this.railService.setHovered(true);
    }

    onRailMouseLeave() {
        this.railService.setHovered(false);
    }

    onTileClick(tile) {
        this.hubService.clearReturnContext();
        return Promise.resolve(this.launcherService.openTile(tile)).then(() => {
            this.syncContext();
            this.railService.refresh();
        });
    }

    onBackToHubClick() {
        return Promise.resolve(this.hubService.goBackToHub()).then(() => {
            this.syncContext();
            this.railService.refresh();
        });
    }

    onSectionClick(sectionCode) {
        const app = this.state.hubApp;
        if (!app) {
            return;
        }
        if (this.hubService.getAppFromHubTag(this.state.activeTag)) {
            return this.hubService.selectHubSection(app, sectionCode);
        }
        this.hubService.setStoredSection(app, sectionCode);
        const hubTag = this.hubService.getHubTagForApp(app);
        return Promise.resolve(
            this.actionService.doAction({
                type: "ir.actions.client",
                tag: hubTag,
                target: "current",
            })
        ).then(() => {
            this.syncContext();
            this.railService.refresh();
        });
    }
}
