/** @odoo-module **/

/**
 * POS smoke entry: when Mostrador UI is present and flag / --dev=assets is on,
 * start phase A tips.
 */
import { mountOnboardingSmokeOverlay } from "./sg_onboarding_smoke_boot";

function resolveDevAssets() {
    try {
        return Boolean(odoo.__session_info__?.sg_dev_assets);
    } catch {
        return false;
    }
}

function tryMount() {
    if (!document.querySelector(".pos")) {
        return false;
    }
    mountOnboardingSmokeOverlay({
        track: "pos",
        devAssets: resolveDevAssets(),
    });
    return true;
}

if (!tryMount()) {
    const timer = setInterval(() => {
        if (tryMount()) {
            clearInterval(timer);
        }
    }, 500);
    setTimeout(() => clearInterval(timer), 30000);
}
