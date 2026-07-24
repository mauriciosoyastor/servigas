/** @odoo-module **/

import { registry } from "@web/core/registry";
import { _t } from "@web/core/l10n/translation";
import { session } from "@web/session";
import { createHostController } from "./sg_onboarding_host";
import { mountOnboardingHostOverlay } from "./sg_onboarding_host_boot";
import {
    isDesktopViewport,
    shouldAutoStartQuick,
} from "./sg_onboarding_persist";
import { isOnboardingSmokeEnabled } from "./sg_onboarding_smoke";

export const sgOnboardingHostService = {
    start() {
        const storage = window.localStorage;
        const host = createHostController({ storage });
        let overlay = null;

        function remount() {
            overlay?.destroy?.();
            overlay = mountOnboardingHostOverlay({ host });
            return overlay;
        }

        function startQuick() {
            host.startPlaylist("quick");
            return remount();
        }

        function startFull() {
            host.startPlaylist("full");
            return remount();
        }

        function replayQuick() {
            host.replay("quick");
            return remount();
        }

        function replayFull() {
            host.replay("full");
            return remount();
        }

        const smokeOn = isOnboardingSmokeEnabled({
            search: window.location.search,
            storage,
            devAssets: Boolean(session.sg_dev_assets),
        });
        const desktop = isDesktopViewport(window.innerWidth || 0);
        if (!smokeOn && shouldAutoStartQuick({ storage, isDesktop: desktop })) {
            window.setTimeout(() => startQuick(), 800);
        }

        return {
            host,
            startQuick,
            startFull,
            replayQuick,
            replayFull,
        };
    },
};

registry.category("services").add("sg_onboarding", sgOnboardingHostService);

function menuItem(id, description, sequence, callbackName) {
    return (env) => ({
        type: "item",
        id,
        description: _t(description),
        callback: () => {
            const svc = env.services.sg_onboarding;
            svc?.[callbackName]?.();
        },
        sequence,
    });
}

registry
    .category("user_menuitems")
    .add(
        "sg_recorrido_rapido",
        menuItem("sg_recorrido_rapido", "Recorrido rápido", 55, "replayQuick")
    );
registry
    .category("user_menuitems")
    .add(
        "sg_recorrido_completo",
        menuItem("sg_recorrido_completo", "Recorrido completo", 56, "replayFull")
    );
