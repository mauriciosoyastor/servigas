/** @odoo-module **/

/**
 * Pure rail navigation context — no OWL / browser coupling.
 * Used by SgRailNav and unit-tested via Node.
 */

export const LAUNCHER_ACTION_TAG = "servigas_app_launcher";
export const HOME_ACTIVE_TAG = "__home__";

/**
 * @param {{
 *   actionTag?: string | null,
 *   getAppFromHubTag: (tag: string) => string | null,
 *   getReturnContext: () => ({ app?: string, hubTag?: string, section?: string } | null),
 *   getStoredSection: (app: string) => string,
 * }} deps
 */
export function resolveRailNavContext({
    actionTag,
    getAppFromHubTag,
    getReturnContext,
    getStoredSection,
}) {
    // null = no controller yet. "" = controller without client tag (act_window).
    if (actionTag == null) {
        return {
            activeTag: "",
            hubApp: null,
            showBackToHub: false,
            activeHubSection: "summary",
            showHubSections: false,
        };
    }

    if (actionTag === LAUNCHER_ACTION_TAG) {
        return {
            activeTag: HOME_ACTIVE_TAG,
            hubApp: null,
            showBackToHub: false,
            activeHubSection: "summary",
            showHubSections: false,
        };
    }

    const activeTag = actionTag;
    const inHub = activeTag ? getAppFromHubTag(activeTag) : null;
    const returnCtx = getReturnContext();

    if (inHub) {
        return {
            activeTag,
            hubApp: inHub,
            showBackToHub: false,
            activeHubSection: getStoredSection(inHub),
            showHubSections: true,
        };
    }

    if (returnCtx?.hubTag) {
        const hubApp = returnCtx.app || null;
        return {
            activeTag,
            hubApp,
            showBackToHub: true,
            activeHubSection: hubApp
                ? getStoredSection(hubApp) || returnCtx.section || "summary"
                : returnCtx.section || "summary",
            showHubSections: Boolean(hubApp),
        };
    }

    return {
        activeTag,
        hubApp: null,
        showBackToHub: false,
        activeHubSection: "summary",
        showHubSections: false,
    };
}

export function isRailTileActive(activeTag, tile, returnHubTag = null) {
    if (activeTag === HOME_ACTIVE_TAG) {
        return false;
    }
    if (tile?.client_tag && activeTag === tile.client_tag) {
        return true;
    }
    if (returnHubTag && tile?.client_tag === returnHubTag) {
        return true;
    }
    return false;
}

/**
 * Bind sync to action updates: run now and keep probing briefly so nested
 * client actions (launcher → hub) are seen after the controller settles,
 * even when no second ACTION_MANAGER:UPDATE fires.
 * @param {{ addEventListener: Function, removeEventListener?: Function }} bus
 * @param {() => void} syncFn
 * @param {{
 *   schedule?: (fn: () => void) => void,
 *   readTag?: () => string | null | undefined,
 *   probes?: number,
 * }} [options]
 * @returns {() => void} unsubscribe
 */
export function bindActionUpdateSync(bus, syncFn, options = {}) {
    const schedule = options.schedule || ((fn) => setTimeout(fn, 0));
    const probes = options.probes ?? 5;
    const onUpdate = () => {
        let remaining = probes;
        const tick = () => {
            syncFn();
            remaining -= 1;
            if (remaining > 0) {
                schedule(tick);
            }
        };
        tick();
    };
    bus.addEventListener("ACTION_MANAGER:UPDATE", onUpdate);
    return () => bus.removeEventListener?.("ACTION_MANAGER:UPDATE", onUpdate);
}

export const RAIL_SHELL_CHANGE_EVENT = "SG_RAIL:SHELL_CHANGE";

/**
 * Re-sync when launcher/hub shell mounts or unmounts — covers the case where
 * ACTION_MANAGER:UPDATE probes finish before the controller/DOM settle
 * (KPI → native list, hard navigate to launcher).
 * @param {{ addEventListener: Function, removeEventListener?: Function }} bus
 * @param {() => void} syncFn
 * @returns {() => void}
 */
export function bindRailShellChangeSync(bus, syncFn) {
    bus.addEventListener(RAIL_SHELL_CHANGE_EVENT, syncFn);
    return () => bus.removeEventListener?.(RAIL_SHELL_CHANGE_EVENT, syncFn);
}

const DEFAULT_PIN_ORDER = ["auto", "expanded", "collapsed"];

export function nextPinMode(pinMode, order = DEFAULT_PIN_ORDER) {
    const idx = order.indexOf(pinMode);
    return order[(idx < 0 ? 0 : idx + 1) % order.length];
}

/**
 * Cycle pin mode. Always signals notify so UI can refresh titles even when
 * expanded width is unchanged (e.g. auto→expanded on a hub shell).
 * @param {{ pinMode: string, expanded: boolean }} state
 * @param {(pinMode: string) => boolean} computeExpanded
 * @param {string[]} [order]
 */
export function applyPinCycle(state, computeExpanded, order = DEFAULT_PIN_ORDER) {
    const pinMode = nextPinMode(state.pinMode, order);
    const expanded = computeExpanded(pinMode);
    return { pinMode, expanded, notify: true };
}

/**
 * Rail width rule (ADR 0003): auto follows shell presence; forced pin ignores shell.
 * Hover peek expands temporarily without mutating pinMode.
 * @param {{ pinMode: string, isShellView: boolean, isMobile?: boolean, isHovered?: boolean }} opts
 */
export function computeRailExpanded({
    pinMode,
    isShellView,
    isMobile = false,
    isHovered = false,
}) {
    if (isMobile) {
        return false;
    }
    if (isHovered) {
        return true;
    }
    if (pinMode === "expanded") {
        return true;
    }
    if (pinMode === "collapsed") {
        return false;
    }
    return Boolean(isShellView);
}

/**
 * Full placement contract for the expand/collapse toggle.
 * Lives in the footer chrome (above the user menu) — never in `__top` /
 * `__apps`, where it covered the Ventas tile.
 * @param {{ isExpanded?: boolean }} _opts
 * @returns {{ zone: "footer", flow: "column", positioning: "static" }}
 */
export function resolveRailTogglePlacement(_opts = {}) {
    return {
        zone: "footer",
        flow: "column",
        positioning: "static",
    };
}

const RAIL_ZONE_RE = /sg-rail__(top|apps|sections|footer)\b/;

/**
 * Which chrome zone wraps `.sg-rail__toggle` in the OWL template markup.
 * Used to keep XML aligned with resolveRailTogglePlacement().zone.
 * @param {string} markup
 * @returns {"top" | "apps" | "sections" | "footer" | null}
 */
export function resolveRailToggleParentZone(markup) {
    const toggleIdx = markup.indexOf('class="sg-rail__toggle"');
    if (toggleIdx < 0) {
        return null;
    }
    const before = markup.slice(0, toggleIdx);
    let zone = null;
    let match;
    const re = new RegExp(RAIL_ZONE_RE.source, "g");
    while ((match = re.exec(before)) !== null) {
        zone = match[1];
    }
    return zone;
}

const RAIL_TEXT_LABEL_CLASSES = [
    "sg-rail__app-label",
    "sg-rail__section-label",
    "sg-rail__toggle-label",
];

/**
 * Collapsed rail is icon-only: every text label in the template must be
 * gated by `t-if="rail.isExpanded"`.
 * @param {string} markup
 * @returns {boolean}
 */
export function railLabelsRequireExpanded(markup) {
    for (const cls of RAIL_TEXT_LABEL_CLASSES) {
        const matches = [...markup.matchAll(new RegExp(`class="${cls}"`, "g"))];
        if (matches.length === 0) {
            return false;
        }
        for (const match of matches) {
            const idx = match.index ?? 0;
            const windowStart = Math.max(0, idx - 120);
            const snippet = markup.slice(windowStart, idx + match[0].length);
            if (!snippet.includes('t-if="rail.isExpanded"')) {
                return false;
            }
        }
    }
    return true;
}

/** @deprecated Prefer resolveRailTogglePlacement().zone */
export function resolveRailToggleZone(opts = {}) {
    return resolveRailTogglePlacement(opts).zone;
}

/** @deprecated Prefer resolveRailTogglePlacement().flow */
export function resolveRailToggleFlow(opts = {}) {
    return resolveRailTogglePlacement(opts).flow;
}
