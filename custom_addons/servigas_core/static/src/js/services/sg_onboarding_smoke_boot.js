/** @odoo-module **/

import {
    chromeView,
    collapsePanel,
    createChromeState,
    expandPanel,
    setChromeStepIndex,
    shouldShowDimMask,
} from "./sg_onboarding_chrome";
import {
    advanceSmokeTour,
    findTourTarget,
    isOnboardingSmokeEnabled,
    listSmokeSteps,
    resolveHotHighlightPolicy,
} from "./sg_onboarding_smoke";
import {
    createTourSession,
    getCurrentStep,
    isTourComplete,
    skipTour,
} from "./sg_onboarding_tour";
import { reportShellPath, shellPathDomAttrs } from "./sg_shell_path";

/**
 * Mount recorrido overlay (ADR 0006) — panel + «Ver recorrido» pill.
 * @returns {{ destroy: () => void, refresh: () => void } | null}
 */
export function mountOnboardingSmokeOverlay({
    track = "app",
    doc = document,
    log = console.warn.bind(console),
    devAssets = false,
} = {}) {
    const win = doc.defaultView || window;
    const sessionInfo = win.odoo?.__session_info__ || {};
    if (
        !isOnboardingSmokeEnabled({
            search: win.location.search,
            storage: win.localStorage,
            devAssets: Boolean(devAssets || sessionInfo.sg_dev_assets),
        })
    ) {
        return null;
    }
    if (doc.getElementById("sg-onboarding-smoke-root")) {
        return null;
    }

    const smokeSteps = listSmokeSteps(track);
    const session = createTourSession({ track, mode: "smoke" });
    const chrome = createChromeState({ totalSteps: smokeSteps.length });

    const root = doc.createElement("div");
    root.id = "sg-onboarding-smoke-root";
    root.className = "sg-onboarding-smoke";
    root.setAttribute("data-sg-smoke-track", track);
    doc.body.appendChild(root);

    let destroyed = false;
    let hotEl = null;

    function clearHot() {
        if (hotEl) {
            hotEl.classList.remove("sg-onboarding-hot");
            hotEl.classList.remove("sg-onboarding-hot--elevate");
            hotEl = null;
        }
    }

    function queryAll(selector) {
        try {
            return doc.querySelectorAll(selector);
        } catch {
            return [];
        }
    }

    function syncShellPathReport() {
        const report = reportShellPath(queryAll, { track, log });
        const attrs = shellPathDomAttrs(report);
        for (const [name, value] of Object.entries(attrs)) {
            root.setAttribute(name, value);
        }
        return report;
    }

    function syncChromeIndex() {
        const step = getCurrentStep(session);
        const idx = smokeSteps.findIndex((s) => s.id === step?.id);
        setChromeStepIndex(chrome, idx >= 0 ? idx : 0);
    }

    function renderPanel(view, { waiting = false } = {}) {
        const badge = view.badge
            ? `<span class="sg-onboarding-smoke__badge">${view.badge}</span>`
            : "";
        const previewLabel = track === "pos" ? "Mostrador" : "Servigas";
        const waitingNote = waiting
            ? `<p class="sg-onboarding-smoke__wait">Esperando el elemento en pantalla…</p>`
            : "";
        return `
            <div class="sg-onboarding-smoke__panel" role="dialog" aria-label="Recorrido">
                <button type="button" class="sg-onboarding-smoke__collapse" data-sg-smoke="collapse" aria-label="Minimizar">×</button>
                <div class="sg-onboarding-smoke__eyebrow">${view.progressLabel}</div>
                <h2 class="sg-onboarding-smoke__title">${view.title}</h2>
                <div class="sg-onboarding-smoke__grid">
                    <div class="sg-onboarding-smoke__copy">
                        ${badge}
                        <p class="sg-onboarding-smoke__body">${view.body}</p>
                        ${waitingNote}
                    </div>
                    <div class="sg-onboarding-smoke__preview" aria-hidden="true">
                        <div class="sg-onboarding-smoke__preview-frame">
                            <div class="sg-onboarding-smoke__preview-title">${previewLabel}</div>
                            <div class="sg-onboarding-smoke__preview-tiles">
                                <span></span><span></span><span></span><span></span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="sg-onboarding-smoke__footer">
                    <button type="button" class="sg-onboarding-smoke__btn sg-onboarding-smoke__btn--primary" data-sg-smoke="next">${view.primaryAction}</button>
                    <button type="button" class="sg-onboarding-smoke__link" data-sg-smoke="skip">${view.secondaryAction}</button>
                </div>
                <div class="sg-onboarding-smoke__hints">← → para navegar · Esc para minimizar</div>
            </div>`;
    }

    function renderPill(view) {
        return `
            <button type="button" class="sg-onboarding-smoke__pill" data-sg-smoke="expand">
                ${view.pillLabel}
            </button>`;
    }

    function bindActions({ waiting = false } = {}) {
        root.querySelector('[data-sg-smoke="collapse"]')?.addEventListener("click", () => {
            collapsePanel(chrome);
            paint();
        });
        root.querySelector('[data-sg-smoke="expand"]')?.addEventListener("click", () => {
            expandPanel(chrome);
            paint();
        });
        root.querySelector('[data-sg-smoke="next"]')?.addEventListener("click", () => {
            if (waiting) {
                advanceSmokeTour(session, { targetFound: false, log });
            } else {
                advanceSmokeTour(session, { targetFound: true, log });
            }
            paint();
        });
        root.querySelector('[data-sg-smoke="skip"]')?.addEventListener("click", () => {
            skipTour(session);
            paint();
        });
    }

    function paint() {
        if (destroyed) {
            return;
        }
        clearHot();
        syncChromeIndex();
        syncShellPathReport();

        if (isTourComplete(session)) {
            root.innerHTML = `
                <div class="sg-onboarding-smoke__panel">
                    <div class="sg-onboarding-smoke__eyebrow">Recorrido</div>
                    <h2 class="sg-onboarding-smoke__title">Listo</h2>
                    <p class="sg-onboarding-smoke__body">Ya conocés el flujo. Podés cerrar este panel.</p>
                    <div class="sg-onboarding-smoke__footer">
                        <button type="button" class="sg-onboarding-smoke__btn sg-onboarding-smoke__btn--primary" data-sg-smoke="close">Cerrar</button>
                    </div>
                </div>`;
            root.querySelector('[data-sg-smoke="close"]')?.addEventListener("click", destroy);
            return;
        }

        const step = getCurrentStep(session);
        const view = chromeView(chrome, step);

        if (view.mode === "pill") {
            root.innerHTML = renderPill(view);
            bindActions();
            return;
        }

        const target = findTourTarget(queryAll, step.targetHint);
        const waiting = !target;
        if (target) {
            hotEl = target;
            hotEl.classList.add("sg-onboarding-hot");
            if (resolveHotHighlightPolicy().elevateAboveChrome) {
                hotEl.classList.add("sg-onboarding-hot--elevate");
            }
        }

        const dim = shouldShowDimMask()
            ? `<div class="sg-onboarding-smoke__mask" aria-hidden="true"></div>`
            : "";
        root.innerHTML = dim + renderPanel(view, { waiting });
        bindActions({ waiting });
    }

    function onKey(ev) {
        if (destroyed || isTourComplete(session)) {
            return;
        }
        if (ev.key === "Escape") {
            collapsePanel(chrome);
            paint();
            return;
        }
        if (ev.key === "ArrowRight" && chrome.panelOpen) {
            advanceSmokeTour(session, { targetFound: true, log });
            paint();
        }
        if (ev.key === "ArrowLeft") {
            // no-op: tour is forward-only in smoke v1
        }
    }

    function destroy() {
        if (destroyed) {
            return;
        }
        destroyed = true;
        clearHot();
        win.clearInterval(poll);
        win.removeEventListener("keydown", onKey);
        root.remove();
    }

    const poll = win.setInterval(() => {
        if (destroyed || isTourComplete(session) || !chrome.panelOpen) {
            return;
        }
        const step = getCurrentStep(session);
        if (step && findTourTarget(queryAll, step.targetHint) && !hotEl) {
            paint();
        }
    }, 600);

    win.addEventListener("keydown", onKey);
    win.setTimeout(paint, 0);
    win.setTimeout(paint, 500);
    win.setTimeout(paint, 1500);

    return { destroy, refresh: paint, reportShellPath: syncShellPathReport };
}
