/** @odoo-module **/

import { WebClient } from "@web/webclient/webclient";
import { SgRailNav } from "./sg_rail_nav";
import { SgMobileBottomBar } from "./sg_mobile_bottom_bar";

WebClient.components = {
    ...WebClient.components,
    SgRailNav,
    SgMobileBottomBar,
};
