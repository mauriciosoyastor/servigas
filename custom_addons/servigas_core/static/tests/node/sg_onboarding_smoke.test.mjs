import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    advanceSmokeTour,
    findTourTarget,
    isOnboardingSmokeEnabled,
    listSmokeSteps,
    resolveHotHighlightPolicy,
    resolveTourTargetSelectors,
} from "../../src/js/services/sg_onboarding_smoke.js";
import { reportShellPath, shellPathDomAttrs } from "../../src/js/services/sg_shell_path.js";
import { selectorsForSurface } from "../../src/js/services/sg_pos_theme.js";
import {
    createTourSession,
    getCurrentStep,
    isTourComplete,
} from "../../src/js/services/sg_onboarding_tour.js";

describe("onboarding smoke", () => {
    it("enables smoke when URL has sg_onboarding=1", () => {
        assert.equal(
            isOnboardingSmokeEnabled({
                search: "?sg_onboarding=1",
                storage: { getItem: () => null },
            }),
            true
        );
        assert.equal(
            isOnboardingSmokeEnabled({
                search: "",
                storage: { getItem: () => null },
            }),
            false
        );
    });

    it("enables smoke when localStorage flag is set", () => {
        assert.equal(
            isOnboardingSmokeEnabled({
                search: "",
                storage: { getItem: (k) => (k === "sg_onboarding_smoke" ? "1" : null) },
            }),
            true
        );
    });

    it("enables smoke when Odoo --dev=assets is active", () => {
        assert.equal(
            isOnboardingSmokeEnabled({
                search: "",
                storage: { getItem: () => null },
                devAssets: true,
            }),
            true
        );
        assert.equal(
            isOnboardingSmokeEnabled({
                search: "",
                storage: { getItem: () => null },
                devAssets: false,
            }),
            false
        );
    });

    it("resolves app targetHints to DOM selectors", () => {
        assert.deepEqual(resolveTourTargetSelectors(".sg-launcher-shell--root"), [
            ".sg-launcher-shell--root",
        ]);
        assert.deepEqual(resolveTourTargetSelectors("rail.sections"), [
            ".sg-rail__sections",
        ]);
        assert.deepEqual(resolveTourTargetSelectors("rail.back_to_hub"), [
            ".sg-rail__back",
        ]);
        assert.deepEqual(resolveTourTargetSelectors("tile.punto_de_venta"), [
            ".sg-rail__app",
            ".sg-launcher-tile",
        ]);
    });

    it("resolves POS surface targetHints via ADR 0005 selectors", () => {
        assert.deepEqual(
            resolveTourTargetSelectors("search-command"),
            selectorsForSurface("search-command")
        );
        assert.deepEqual(
            resolveTourTargetSelectors("pay-cta"),
            selectorsForSurface("pay-cta")
        );
    });

    it("smoke POS track lists only phase A steps", () => {
        const steps = listSmokeSteps("pos");
        assert.ok(steps.length > 0);
        assert.ok(steps.every((s) => s.phase === "A"));
        assert.equal(steps.at(-1).id, "pos.pay");
        assert.ok(!steps.some((s) => s.phase === "B" || s.phase === "C"));
    });

    it("findTourTarget matches Punto de venta by label text", () => {
        const nodes = {
            ".sg-rail__app": [
                { textContent: "Ventas" },
                { textContent: "Punto de venta" },
            ],
            ".sg-launcher-tile": [],
        };
        const queryAll = (sel) => nodes[sel] || [];
        const el = findTourTarget(queryAll, "tile.punto_de_venta");
        assert.equal(el.textContent, "Punto de venta");
    });

    it("hub.kpi_card resolves only to KPI tiles inside the hub shell", () => {
        assert.deepEqual(resolveTourTargetSelectors("hub.kpi_card"), [
            ".sg-launcher-shell--hub .sg-launcher-tile",
        ]);
        const hubTile = { textContent: "Pedidos", id: "hub-kpi" };
        const homeTile = { textContent: "Ventas", id: "home-tile" };
        const queryAll = (sel) => {
            if (sel === ".sg-launcher-shell--hub .sg-launcher-tile") {
                return [hubTile];
            }
            if (sel === ".sg-launcher-tile") {
                return [homeTile, hubTile];
            }
            return [];
        };
        const el = findTourTarget(queryAll, "hub.kpi_card");
        assert.equal(el.id, "hub-kpi");
        assert.notEqual(el.id, "home-tile");
    });

    it("hot highlight policy keeps targets below recorrido chrome", () => {
        const policy = resolveHotHighlightPolicy();
        assert.equal(policy.elevateAboveChrome, false);
    });

    it("appearing hub KPI tiles does not complete the app.kpi step", () => {
        const session = createTourSession({ track: "app", mode: "smoke" });
        while (getCurrentStep(session)?.id !== "app.kpi") {
            advanceSmokeTour(session, { targetFound: true });
        }
        const step = getCurrentStep(session);
        assert.equal(step.id, "app.kpi");
        assert.equal(step.targetHint, "hub.kpi_card");
        const hubTile = { id: "kpi-card" };
        const queryAll = (sel) =>
            sel === ".sg-launcher-shell--hub .sg-launcher-tile" ? [hubTile] : [];
        assert.equal(findTourTarget(queryAll, step.targetHint)?.id, "kpi-card");
        assert.equal(isTourComplete(session), false);
        assert.equal(getCurrentStep(session).id, "app.kpi");
    });

    it("advanceSmokeTour skips missing targets and ends POS after phase A", () => {
        const logs = [];
        const session = createTourSession({ track: "pos", mode: "smoke" });
        assert.equal(getCurrentStep(session).id, "pos.search");

        advanceSmokeTour(session, {
            targetFound: false,
            log: (msg) => logs.push(msg),
        });
        assert.equal(getCurrentStep(session).id, "pos.categories");
        assert.ok(logs.some((m) => m.includes("pos.search")));

        while (getCurrentStep(session)?.id !== "pos.pay") {
            advanceSmokeTour(session, { targetFound: true });
        }
        advanceSmokeTour(session, { targetFound: true });
        assert.equal(isTourComplete(session), true);
        assert.ok(!getCurrentStep(session));
    });

    it("reportShellPath logs missing shell checkpoints for smoke (ADR 0007)", () => {
        const logs = [];
        const report = reportShellPath(() => [], {
            track: "app",
            log: (msg) => logs.push(msg),
        });
        assert.equal(report.ok, false);
        assert.equal(report.results.length, 6);
        assert.ok(logs.some((m) => m.includes("shell.home")));
        assert.ok(logs.some((m) => m.includes("incomplete")));
    });

    it("shellPathDomAttrs exposes ok/incomplete and missing ids for smoke root", () => {
        const report = reportShellPath(() => [], { track: "app" });
        const attrs = shellPathDomAttrs(report);
        assert.equal(attrs["data-sg-shell-path"], "incomplete");
        assert.ok(attrs["data-sg-shell-path-missing"].includes("shell.home"));
        assert.equal(
            shellPathDomAttrs({ ok: true, results: [] })["data-sg-shell-path"],
            "ok"
        );
        assert.equal(
            shellPathDomAttrs({ ok: true, results: [] })["data-sg-shell-path-missing"],
            ""
        );
    });
});
