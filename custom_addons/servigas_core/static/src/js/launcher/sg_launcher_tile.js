/** @odoo-module **/

import { Component } from "@odoo/owl";

export class SgLauncherTile extends Component {
    static template = "servigas_core.SgLauncherTile";
    static props = {
        tile: Object,
        loading: { type: Boolean, optional: true },
        onClick: Function,
    };
}
