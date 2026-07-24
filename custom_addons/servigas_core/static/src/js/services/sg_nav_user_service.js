/** @odoo-module **/

import { registry } from "@web/core/registry";
import { user } from "@web/core/user";

export const sgNavUserService = {
    start() {
        document.body.classList.add("sg-rail-enabled");
        if (user.hasGroup("base.group_system")) {
            document.body.classList.add("sg-user-admin");
        } else {
            document.body.classList.add("sg-user-operativo");
        }
    },
};

registry.category("services").add("sg_nav_user", sgNavUserService);
