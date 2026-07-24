import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    chromeView,
    collapsePanel,
    createChromeState,
    expandPanel,
    getProgressLabel,
    shouldShowDimMask,
} from "../../src/js/services/sg_onboarding_chrome.js";

describe("onboarding chrome (ADR 0006)", () => {
    it("open panel exposes progress Paso 1 de N", () => {
        const state = createChromeState({ totalSteps: 6 });
        assert.equal(getProgressLabel(state), "Recorrido · Paso 1 de 6");

        const view = chromeView(state, {
            id: "app.home",
            title: "Inicio",
            body: "Cada tile es un área de trabajo.",
            badge: "Bienvenida",
        });
        assert.equal(view.mode, "panel");
        assert.equal(view.progressLabel, "Recorrido · Paso 1 de 6");
        assert.equal(view.title, "Inicio");
        assert.equal(view.body, "Cada tile es un área de trabajo.");
        assert.equal(view.badge, "Bienvenida");
        assert.equal(view.primaryAction, "Siguiente");
        assert.equal(view.secondaryAction, "Omitir recorrido");
    });

    it("collapse shows Ver recorrido pill; expand restores panel", () => {
        const state = createChromeState({ totalSteps: 6 });
        collapsePanel(state);
        const collapsed = chromeView(state, { title: "Inicio", body: "…" });
        assert.equal(collapsed.mode, "pill");
        assert.equal(collapsed.pillLabel, "Ver recorrido");

        expandPanel(state);
        assert.equal(chromeView(state, { title: "Inicio", body: "…" }).mode, "panel");
    });

    it("does not use a full-bleed dim mask", () => {
        assert.equal(shouldShowDimMask(), false);
    });

    it("panel exposes Capítulos when more than one chapter", () => {
        const state = createChromeState({ totalSteps: 10 });
        const withChapters = chromeView(
            state,
            { title: "Inicio", body: "…" },
            {
                chapters: [
                    { id: "shell", label: "Shell" },
                    { id: "sales", label: "Ventas" },
                ],
            }
        );
        assert.equal(withChapters.chaptersAction, "Capítulos");
        assert.deepEqual(withChapters.chapters, [
            { id: "shell", label: "Shell" },
            { id: "sales", label: "Ventas" },
        ]);

        const without = chromeView(state, { title: "Inicio", body: "…" }, {
            chapters: [{ id: "app", label: "App" }],
        });
        assert.equal(without.chaptersAction, null);
    });
});
