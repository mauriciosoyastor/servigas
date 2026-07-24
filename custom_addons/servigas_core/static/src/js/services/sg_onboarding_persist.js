/** @odoo-module **/

/**
 * Onboarding persistence flags (ADR 0009).
 * Pure — inject storage (localStorage-compatible).
 */

export const STORAGE_KEYS = {
    app: "sg_onboarding_app_done",
    pos: "sg_onboarding_pos_done",
    full: "sg_onboarding_full_done",
};

function flagOn(storage, key) {
    return storage?.getItem?.(key) === "1";
}

function setFlag(storage, key) {
    storage?.setItem?.(key, "1");
}

export function isAppDone(storage) {
    return flagOn(storage, STORAGE_KEYS.app);
}

export function isPosDone(storage) {
    return flagOn(storage, STORAGE_KEYS.pos);
}

export function isFullDone(storage) {
    return flagOn(storage, STORAGE_KEYS.full);
}

export function markAppDone(storage) {
    setFlag(storage, STORAGE_KEYS.app);
}

export function markPosDone(storage) {
    setFlag(storage, STORAGE_KEYS.pos);
}

/** Completing/skipping full also marks app_done; never pos_done (ADR 0009). */
export function markFullDone(storage) {
    setFlag(storage, STORAGE_KEYS.full);
    setFlag(storage, STORAGE_KEYS.app);
}

/**
 * @param {Storage} storage
 * @param {"app"|"pos"|"full"} which
 */
export function clearOnboardingFlag(storage, which) {
    const key = STORAGE_KEYS[which];
    if (key) {
        storage?.removeItem?.(key);
    }
}

/**
 * Auto-start recorrido rápido on first login (desktop only).
 * @param {{ storage: Storage, isDesktop: boolean }} opts
 */
export function shouldAutoStartQuick({ storage, isDesktop }) {
    return Boolean(isDesktop) && !isAppDone(storage);
}

/** Heuristic for host: treat narrow viewports as mobile (ADR 0009). */
export function isDesktopViewport(width = 0) {
    return width >= 768;
}
