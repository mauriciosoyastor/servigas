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
    findTourTarget,
    isOnboardingSmokeEnabled,
    resolveHotHighlightPolicy,
} from "./sg_onboarding_smoke";
import {
    advanceTour,
    getCurrentStep,
    isTourComplete,
    jumpToChapter,
} from "./sg_onboarding_tour";

/**
 * Productive recorrido overlay (ADR 0006 + 0009 chapters).
 * @param {{ host: object, doc?: Document, log?: Function }} opts
 */
export function mountOnboardingHostOverlay({
    host,
    doc = document,
    log = console.warn.bind(console),
} = {}) {
    if (!host?.getSession?.()) {
        return null;
    }
    const existing = doc.getElementById("sg-onboarding-host-root");
    if (existing) {
        existing.remove();
    }
    // Smoke debug wins the page when explicitly enabled.
    const win = doc.defaultView || window;
    if (
        isOnboardingSmokeEnabled({
            search: win.location.search,
            storage: win.localStorage,
        }) &&
        doc.getElementById("sg-onboarding-smoke-root")
    ) {
        return null;
    }

    const root = doc.createElement("div");
    root.id = "sg-onboarding-host-root";
    root.className = "sg-onboarding-smoke sg-onboarding-host";
    doc.body.appendChild(root);

    const steps = host.stepsForActive();
    const chrome = createChromeState({ totalSteps: Math.max(1, steps.length) });
    let destroyed = false;
    let hotEl = null;
    let chaptersOpen = false;

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

    function syncChromeIndex() {
        const session = host.getSession();
        const step = getCurrentStep(session);
        const idx = steps.findIndex((s) => s.id === step?.id);
        setChromeStepIndex(chrome, idx >= 0 ? idx : 0);
    }

    function chapterListHtml(chapters) {
        if (!chaptersOpen || !chapters.length) {
            return "";
        }
        const items = chapters
            .map(
                (c) =>
                    `<button type="button" class="sg-onboarding-smoke__chapter" data-sg-host="chapter" data-chapter="${c.id}">${c.label}</button>`
            )
            .join("");
        return `<div class="sg-onboarding-smoke__chapters" role="listbox" aria-label="Capítulos">${items}</div>`;
    }

    function renderPanel(view, { waiting = false } = {}) {
        const badge = view.badge
            ? `<span class="sg-onboarding-smoke__badge">${view.badge}</span>`
            : "";
        const waitingNote = waiting
            ? `<p class="sg-onboarding-smoke__wait">Esperando el elemento en pantalla…</p>`
            : "";
        const chaptersBtn = view.chaptersAction
            ? `<button type="button" class="sg-onboarding-smoke__link" data-sg-host="chapters">${view.chaptersAction}</button>`
            : "";
        return `
            <div class="sg-onboarding-smoke__panel" role="dialog" aria-label="Recorrido">
                <button type="button" class="sg-onboarding-smoke__collapse" data-sg-host="collapse" aria-label="Minimizar">×</button>
                <div class="sg-onboarding-smoke__eyebrow">${view.progressLabel}</div>
                <h2 class="sg-onboarding-smoke__title">${view.title}</h2>
                <div class="sg-onboarding-smoke__grid">
                    <div class="sg-onboarding-smoke__copy">
                        ${badge}
                        <p class="sg-onboarding-smoke__body">${view.body}</p>
                        ${waitingNote}
                        ${chapterListHtml(view.chapters || [])}
                    </div>
                    <div class="sg-onboarding-smoke__preview" aria-hidden="true">
                        <div class="sg-onboarding-smoke__preview-frame">
                            <div class="sg-onboarding-smoke__preview-title">Servigas</div>
                            <div class="sg-onboarding-smoke__preview-tiles">
                                <span></span><span></span><span></span><span></span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="sg-onboarding-smoke__footer">
                    <button type="button" class="sg-onboarding-smoke__btn sg-onboarding-smoke__btn--primary" data-sg-host="next">${view.primaryAction}</button>
                    <button type="button" class="sg-onboarding-smoke__link" data-sg-host="skip">${view.secondaryAction}</button>
                    ${chaptersBtn}
                </div>
                <div class="sg-onboarding-smoke__hints">← → · Esc · Capítulos</div>
            </div>`;
    }

    function renderPill(view) {
        return `
            <button type="button" class="sg-onboarding-smoke__pill" data-sg-host="expand">
                ${view.pillLabel}
            </button>`;
    }

    function finishAndClose() {
        host.completeActive();
        destroy();
    }

    function bindActions({ waiting = false } = {}) {
        root.querySelector('[data-sg-host="collapse"]')?.addEventListener("click", () => {
            collapsePanel(chrome);
            chaptersOpen = false;
            paint();
        });
        root.querySelector('[data-sg-host="expand"]')?.addEventListener("click", () => {
            expandPanel(chrome);
            paint();
        });
        root.querySelector('[data-sg-host="chapters"]')?.addEventListener("click", () => {
            chaptersOpen = !chaptersOpen;
            paint();
        });
        root.querySelectorAll('[data-sg-host="chapter"]').forEach((btn) => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-chapter");
                const session = host.getSession();
                if (session && id) {
                    jumpToChapter(session, id);
                    chaptersOpen = false;
                    paint();
                }
            });
        });
        root.querySelector('[data-sg-host="next"]')?.addEventListener("click", () => {
            const session = host.getSession();
            if (!session) {
                return;
            }
            if (waiting && typeof log === "function") {
                log("sg_onboarding_host: advance while target missing");
            }
            const next = advanceTour(session, { simulated: true });
            if (!next && isTourComplete(session)) {
                finishAndClose();
                return;
            }
            paint();
        });
        root.querySelector('[data-sg-host="skip"]')?.addEventListener("click", () => {
            host.skipActive();
            destroy();
        });
    }

    function paint() {
        if (destroyed) {
            return;
        }
        clearHot();
        const session = host.getSession();
        if (!session || isTourComplete(session)) {
            finishAndClose();
            return;
        }

        syncChromeIndex();
        const step = getCurrentStep(session);
        const chapters = host.chaptersForActive();
        const view = chromeView(chrome, step, { chapters });

        if (view.mode === "pill") {
            root.innerHTML = renderPill(view);
            bindActions();
            return;
        }

        const target = findTourTarget(queryAll, step?.targetHint);
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
        if (destroyed) {
            return;
        }
        if (ev.key === "Escape") {
            collapsePanel(chrome);
            chaptersOpen = false;
            paint();
            return;
        }
        if (ev.key === "ArrowRight" && chrome.panelOpen) {
            const session = host.getSession();
            if (!session) {
                return;
            }
            const next = advanceTour(session, { simulated: true });
            if (!next && isTourComplete(session)) {
                finishAndClose();
                return;
            }
            paint();
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
        if (destroyed || !chrome.panelOpen) {
            return;
        }
        const session = host.getSession();
        const step = getCurrentStep(session);
        if (step && findTourTarget(queryAll, step.targetHint) && !hotEl) {
            paint();
        }
    }, 600);

    win.addEventListener("keydown", onKey);
    win.setTimeout(paint, 0);
    win.setTimeout(paint, 500);

    return { destroy, refresh: paint };
}
