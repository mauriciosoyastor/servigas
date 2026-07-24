/** @odoo-module **/

import { Component } from "@odoo/owl";

export class SgHubSubnav extends Component {
    static template = "servigas_core.SgHubSubnav";
    static props = {
        sections: Array,
        activeSection: String,
        loading: { type: Boolean, optional: true },
        onSectionSelect: Function,
    };

    onPillClick(sectionCode) {
        if (sectionCode === this.props.activeSection || this.props.loading) {
            return;
        }
        return this.props.onSectionSelect(sectionCode);
    }
}
