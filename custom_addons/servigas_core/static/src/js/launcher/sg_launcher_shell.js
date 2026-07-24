/** @odoo-module **/

import { Component, onMounted, onWillUnmount } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { browser } from "@web/core/browser/browser";
import { RAIL_SHELL_CHANGE_EVENT } from "../chrome/sg_rail_context";

export class SgLauncherShell extends Component {
    static template = "servigas_core.SgLauncherShell";
    static props = {
        title: { type: String, optional: true },
        subtitle: { type: String, optional: true },
        showTitle: { type: Boolean, optional: true },
        showSubtitle: { type: Boolean, optional: true },
        showHome: { type: Boolean, optional: true },
        showBack: { type: Boolean, optional: true },
        isRootMenu: { type: Boolean, optional: true },
        isHub: { type: Boolean, optional: true },
    };
    static defaultProps = {
        showHome: true,
        showBack: true,
        showTitle: true,
        showSubtitle: true,
    };

    setup() {
        this.launcherService = useService("sg_launcher");
        this.railService = useService("sg_rail");

        const notifyShellChange = () => {
            this.railService.refresh();
            this.env.bus.trigger(RAIL_SHELL_CHANGE_EVENT);
        };

        onMounted(notifyShellChange);
        // Defer + probe: onWillUnmount runs while the shell node may still be in
        // the DOM and before currentController settles on the native act_window.
        onWillUnmount(() => {
            const railService = this.railService;
            const bus = this.env.bus;
            const notify = () => {
                railService.refresh();
                bus.trigger(RAIL_SHELL_CHANGE_EVENT);
            };
            let remaining = 5;
            const tick = () => {
                notify();
                remaining -= 1;
                if (remaining > 0) {
                    browser.setTimeout(tick, 0);
                }
            };
            browser.setTimeout(tick, 0);
        });
    }

    onBack() {
        if (this.env.config?.historyBack) {
            this.env.config.historyBack();
        }
    }

    onHome() {
        return this.launcherService.goHome();
    }
}
