/** @odoo-module **/

import { Component } from "@odoo/owl";

export class SgEntryCard extends Component {
    static template = "servigas_core.SgEntryCard";
    static props = {
        card: Object,
        loading: { type: Boolean, optional: true },
        onClick: Function,
    };
}
