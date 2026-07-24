/** @odoo-module **/

/**
 * Chrome UI state for operativo recorrido (ADR 0006).
 * Pure module — no WebClient / DOM.
 */

export function createChromeState({ totalSteps = 1, stepIndex = 0 } = {}) {
    return {
        totalSteps: Math.max(1, totalSteps),
        stepIndex: Math.max(0, stepIndex),
        panelOpen: true,
    };
}

export function getProgressLabel(state) {
    const n = (state?.stepIndex ?? 0) + 1;
    const m = state?.totalSteps ?? 1;
    return `Recorrido · Paso ${n} de ${m}`;
}

export function chromeView(state, step = {}, { chapters = [] } = {}) {
    if (!state?.panelOpen) {
        return {
            mode: "pill",
            pillLabel: "Ver recorrido",
        };
    }
    const showChapters = Array.isArray(chapters) && chapters.length > 1;
    return {
        mode: "panel",
        progressLabel: getProgressLabel(state),
        title: step.title || "",
        body: step.body || "",
        badge: step.badge || null,
        primaryAction: "Siguiente",
        secondaryAction: "Omitir recorrido",
        chaptersAction: showChapters ? "Capítulos" : null,
        chapters: showChapters ? chapters : [],
    };
}

export function collapsePanel(state) {
    if (state) {
        state.panelOpen = false;
    }
    return state;
}

export function expandPanel(state) {
    if (state) {
        state.panelOpen = true;
    }
    return state;
}

export function togglePanel(state) {
    if (state) {
        state.panelOpen = !state.panelOpen;
    }
    return state;
}

/** Keep chrome progress aligned with the tour step index (0-based). */
export function setChromeStepIndex(state, stepIndex) {
    if (!state) {
        return state;
    }
    const max = Math.max(0, (state.totalSteps || 1) - 1);
    state.stepIndex = Math.min(Math.max(0, stepIndex), max);
    return state;
}

/** ADR 0006: no full-bleed dim over the hub. */
export function shouldShowDimMask() {
    return false;
}
