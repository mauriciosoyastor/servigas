/** @odoo-module **/

import { Component, useState, onWillStart } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { SgSectionRail } from "../components/sg_section_rail";
import { SgEntryCard } from "../components/sg_entry_card";

export class SalesHub extends Component {
    static template = "servigas_core.SalesHub";
    static components = { SgSectionRail, SgEntryCard };
    static props = ["*"];

    setup() {
        this.hubService = useService("sg_hub");
        this.state = useState({
            section: "summary",
            expanded: this.hubService.getRailExpanded(window.innerWidth >= 1280),
            sections: [],
            cards: [],
            loading: true,
        });

        onWillStart(async () => {
            await this.loadHubData();
        });
    }

    get appLabel() {
        return "Ventas";
    }

    get sectionLabel() {
        const current = this.state.sections.find((s) => s.code === this.state.section);
        return current ? current.name : "Resumen";
    }

    async loadHubData() {
        this.state.loading = true;
        const payload = await this.hubService.loadHub("sales", this.state.section);
        this.state.sections = payload.sections || [];
        this.state.cards = payload.cards || [];
        this.state.loading = false;
    }

    async onSectionSelect(sectionCode) {
        if (sectionCode === this.state.section) {
            return;
        }
        this.state.section = sectionCode;
        await this.loadHubData();
    }

    onToggleRail() {
        this.state.expanded = !this.state.expanded;
        this.hubService.setRailExpanded(this.state.expanded);
    }

    onCardClick(card) {
        return this.hubService.openCard(card);
    }
}
