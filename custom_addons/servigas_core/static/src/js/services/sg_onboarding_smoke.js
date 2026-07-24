/** @odoo-module **/

import { selectorsForSurface } from "./sg_pos_theme.js";
import {
    advanceTour,
    getCurrentStep,
    listTourSteps,
} from "./sg_onboarding_tour.js";

export const SMOKE_QUERY_PARAM = "sg_onboarding";
export const SMOKE_STORAGE_KEY = "sg_onboarding_smoke";

/**
 * Smoke coachmarks run with explicit flag, localStorage, or Odoo --dev=assets.
 * @param {{ search?: string, storage?: { getItem(key: string): string|null }, devAssets?: boolean }} [env]
 */
export function isOnboardingSmokeEnabled({
    search = "",
    storage = null,
    devAssets = false,
} = {}) {
    const params = new URLSearchParams(
        search.startsWith("?") ? search.slice(1) : search
    );
    if (params.get(SMOKE_QUERY_PARAM) === "1") {
        return true;
    }
    if (storage && storage.getItem(SMOKE_STORAGE_KEY) === "1") {
        return true;
    }
    if (devAssets) {
        return true;
    }
    return false;
}

const APP_TARGET_SELECTORS = {
    "rail.sections": [".sg-rail__sections"],
    "rail.back_to_hub": [".sg-rail__back"],
    "rail.apps": [".sg-rail__apps"],
    "rail.toggle": [".sg-rail__toggle"],
    "hub.kpi_card": [".sg-launcher-shell--hub .sg-launcher-tile"],
    "tile.punto_de_venta": [".sg-rail__app", ".sg-launcher-tile"],
    "odoo.list_chrome": [".o_control_panel", ".o_searchview", ".o_cp_controller"],
};

/**
 * Highlight stacking vs recorrido chrome (ADR 0008).
 * Hot targets must not paint above the panel/pill overlay.
 */
export function resolveHotHighlightPolicy() {
    return { elevateAboveChrome: false };
}

/**
 * Map a tour targetHint to CSS selectors to try (first match wins at query time).
 */
export function resolveTourTargetSelectors(targetHint) {
    if (!targetHint) {
        return [];
    }
    if (targetHint.startsWith(".") || targetHint.startsWith("#") || targetHint.startsWith("[")) {
        return [targetHint];
    }
    if (APP_TARGET_SELECTORS[targetHint]) {
        return APP_TARGET_SELECTORS[targetHint].slice();
    }
    const posSelectors = selectorsForSurface(targetHint);
    if (posSelectors.length) {
        return posSelectors;
    }
    return [];
}

/** Smoke covers full app track, or POS phase A only (no B/C). */
export function listSmokeSteps(track = "app") {
    if (track === "pos") {
        return listTourSteps("pos").filter((step) => step.phase === "A");
    }
    return listTourSteps("app");
}

/**
 * @param {(selector: string) => Iterable<any>} queryAll
 * @param {string} targetHint
 */
export function findTourTarget(queryAll, targetHint) {
    const selectors = resolveTourTargetSelectors(targetHint);
    for (const sel of selectors) {
        const nodes = [...(queryAll(sel) || [])];
        if (targetHint === "tile.punto_de_venta") {
            const match = nodes.find((node) =>
                String(node.textContent || "").includes("Punto de venta")
            );
            if (match) {
                return match;
            }
            continue;
        }
        if (nodes[0]) {
            return nodes[0];
        }
    }
    return null;
}

/**
 * Advance smoke session: missing targets are skipped (logged); POS stops after phase A.
 */
export function advanceSmokeTour(session, { targetFound = true, log } = {}) {
    const current = getCurrentStep(session);
    if (!current) {
        return null;
    }
    if (!targetFound && typeof log === "function") {
        log(
            `sg_onboarding_smoke: skip missing target ${current.id} (${current.targetHint})`
        );
    }
    if (current.track === "pos" && current.phase === "A") {
        const next = current.next
            ? listTourSteps("pos").find((step) => step.id === current.next)
            : null;
        if (!next || next.phase !== "A") {
            session.done = true;
            session.currentId = null;
            return null;
        }
    }
    return advanceTour(session, { simulated: true });
}
