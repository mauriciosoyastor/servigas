/** @odoo-module **/

import { registry } from "@web/core/registry";
import { session } from "@web/session";
import { mountOnboardingSmokeOverlay } from "./sg_onboarding_smoke_boot";

export const sgOnboardingSmokeService = {
    start() {
        return mountOnboardingSmokeOverlay({
            track: "app",
            devAssets: Boolean(session.sg_dev_assets),
        });
    },
};

registry.category("services").add("sg_onboarding_smoke", sgOnboardingSmokeService);
