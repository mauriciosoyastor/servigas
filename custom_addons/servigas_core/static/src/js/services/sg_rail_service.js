/** @odoo-module **/

import { registry } from "@web/core/registry";
import { browser } from "@web/core/browser/browser";
import { applyPinCycle, computeRailExpanded } from "../chrome/sg_rail_context";

const PIN_STORAGE_KEY = "sg_rail_pin";
const MOBILE_BREAKPOINT = 768;
const HOVER_LEAVE_MS = 160;

export const sgRailService = {
    dependencies: ["action"],
    start(env, { action }) {
        let expanded = false;
        let hovering = false;
        let leaveTimer = null;
        let pinMode = browser.localStorage.getItem(PIN_STORAGE_KEY) || "auto";
        const listeners = new Set();

        const notify = () => {
            for (const listener of listeners) {
                listener();
            }
        };

        const isMobile = () => window.innerWidth < MOBILE_BREAKPOINT;

        const isShellView = () =>
            Boolean(
                document.querySelector(".sg-launcher-shell--root, .sg-launcher-shell--hub")
            );

        const computeExpandedForPin = (mode) =>
            computeRailExpanded({
                pinMode: mode,
                isShellView: isShellView(),
                isMobile: isMobile(),
                isHovered: hovering,
            });

        const computeExpanded = () => computeExpandedForPin(pinMode);

        const syncExpanded = ({ forceNotify = false } = {}) => {
            const next = computeExpanded();
            const changed = next !== expanded;
            if (changed) {
                expanded = next;
            }
            document.documentElement.style.setProperty(
                "--sg-rail-current-width",
                isMobile() ? "0px" : expanded ? "17.5rem" : "3.5rem"
            );
            if (changed || forceNotify) {
                notify();
            }
        };

        const refresh = () => syncExpanded();

        const clearLeaveTimer = () => {
            if (leaveTimer !== null) {
                browser.clearTimeout(leaveTimer);
                leaveTimer = null;
            }
        };

        env.bus.addEventListener("ACTION_MANAGER:UPDATE", () => {
            refresh();
            browser.setTimeout(refresh, 0);
        });
        window.addEventListener("resize", refresh);

        syncExpanded();

        return {
            subscribe(listener) {
                listeners.add(listener);
                return () => listeners.delete(listener);
            },
            get isExpanded() {
                return expanded;
            },
            get isMobile() {
                return isMobile();
            },
            get pinMode() {
                return pinMode;
            },
            get isHovered() {
                return hovering;
            },
            refresh,
            setHovered(nextHovered) {
                if (isMobile()) {
                    return;
                }
                if (nextHovered) {
                    clearLeaveTimer();
                    if (!hovering) {
                        hovering = true;
                        syncExpanded({ forceNotify: true });
                    }
                    return;
                }
                clearLeaveTimer();
                leaveTimer = browser.setTimeout(() => {
                    leaveTimer = null;
                    hovering = false;
                    syncExpanded({ forceNotify: true });
                }, HOVER_LEAVE_MS);
            },
            toggleExpanded() {
                if (isMobile()) {
                    return;
                }
                if (pinMode === "auto") {
                    pinMode = expanded ? "collapsed" : "expanded";
                } else if (pinMode === "expanded") {
                    pinMode = "collapsed";
                } else {
                    pinMode = "expanded";
                }
                browser.localStorage.setItem(PIN_STORAGE_KEY, pinMode);
                syncExpanded({ forceNotify: true });
            },
            resetPinToAuto() {
                pinMode = "auto";
                browser.localStorage.setItem(PIN_STORAGE_KEY, pinMode);
                syncExpanded({ forceNotify: true });
            },
            cyclePinMode() {
                const result = applyPinCycle(
                    { pinMode, expanded },
                    computeExpandedForPin
                );
                pinMode = result.pinMode;
                expanded = result.expanded;
                browser.localStorage.setItem(PIN_STORAGE_KEY, pinMode);
                document.documentElement.style.setProperty(
                    "--sg-rail-current-width",
                    isMobile() ? "0px" : expanded ? "17.5rem" : "3.5rem"
                );
                if (result.notify) {
                    notify();
                }
            },
        };
    },
};

registry.category("services").add("sg_rail", sgRailService);
