import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    advanceTour,
    createTourSession,
    getCurrentStep,
    isTourComplete,
    jumpToChapter,
    listChapters,
    listTourSteps,
    shouldOfferPosTrack,
    skipTour,
} from "../../src/js/services/sg_onboarding_tour.js";

function advanceAppToPosEntry(session) {
    while (getCurrentStep(session)?.id !== "app.pos_entry") {
        assert.ok(advanceTour(session), "expected another app step");
    }
}

describe("onboarding tour (operativo)", () => {
    it("playlist quick starts at app.home", () => {
        const session = createTourSession({ playlist: "quick" });
        assert.equal(session.playlist, "quick");
        assert.equal(getCurrentStep(session).id, "app.home");
    });

    it("listTourSteps playlist quick does not include full.* ids", () => {
        const steps = listTourSteps({ playlist: "quick" });
        assert.ok(steps.length > 0);
        assert.ok(steps.every((step) => !String(step.id).startsWith("full.")));
        assert.ok(
            steps.every((step) => (step.playlist ?? "quick") === "quick")
        );
    });

    it("jumpToChapter moves to chapter first step without completing", () => {
        const session = createTourSession({ playlist: "full" });
        assert.equal(getCurrentStep(session).chapter, "shell");
        const ok = jumpToChapter(session, "sales");
        assert.equal(ok, true);
        assert.equal(session.done, false);
        assert.equal(isTourComplete(session), false);
        assert.equal(getCurrentStep(session).chapter, "sales");
        assert.equal(getCurrentStep(session).id, "full.sales.enter");
    });

    it("listChapters full follows first-appearance order", () => {
        const chapters = listChapters("full");
        assert.deepEqual(
            chapters.map((c) => c.id),
            [
                "shell",
                "sales",
                "inventory",
                "purchase",
                "accounting",
                "integrations",
                "pos_entry",
            ]
        );
        assert.equal(chapters[0].firstStepId, "full.shell.home");
        assert.equal(chapters[1].firstStepId, "full.sales.enter");
        assert.ok(chapters.every((c) => typeof c.label === "string" && c.label));
    });

    it("full playlist matches buildFullSteps for default tiles", async () => {
        const { buildFullSteps } = await import(
            "../../src/js/services/sg_onboarding_full_catalog.js"
        );
        const built = buildFullSteps({
            visibleTileKeys: [
                "sales",
                "inventory",
                "purchase",
                "accounting",
                "integrations",
                "pos",
            ],
        });
        assert.deepEqual(
            listTourSteps({ playlist: "full" }).map((s) => s.id),
            built.map((s) => s.id)
        );
    });

    it("requireAction step does not advance without simulated", () => {
        const session = createTourSession({ track: "pos" });
        while (getCurrentStep(session)?.id !== "pos.add_product") {
            assert.ok(
                advanceTour(session, { simulated: true }),
                "expected to reach requireAction step"
            );
        }
        assert.equal(advanceTour(session), null);
        assert.equal(getCurrentStep(session).id, "pos.add_product");
    });

    it("Track 1 starts at app.home and advances to app.pos_entry", () => {
        const session = createTourSession({ track: "app" });
        assert.equal(getCurrentStep(session).id, "app.home");

        const order = ["app.home"];
        while (getCurrentStep(session)?.id !== "app.pos_entry") {
            const next = advanceTour(session);
            assert.ok(next, "expected another app step");
            order.push(next.id);
        }

        assert.deepEqual(order, [
            "app.home",
            "app.hub",
            "app.section",
            "app.kpi",
            "app.back",
            "app.pos_entry",
        ]);
    });

    it("offers POS track after reaching app.pos_entry", () => {
        const session = createTourSession({ track: "app" });
        assert.equal(shouldOfferPosTrack(session), false);
        advanceAppToPosEntry(session);
        assert.equal(shouldOfferPosTrack(session), true);
    });

    it("skipTour completes the track with no further steps", () => {
        const session = createTourSession({ track: "app" });
        skipTour(session);
        assert.equal(isTourComplete(session), true);
        assert.equal(getCurrentStep(session), null);
        assert.equal(advanceTour(session), null);
    });

    it("POS requireAction step does not advance without simulated action", () => {
        const session = createTourSession({ track: "pos" });
        while (getCurrentStep(session)?.id !== "pos.add_product") {
            assert.ok(
                advanceTour(session, { simulated: true }),
                "expected to reach requireAction step"
            );
        }
        assert.equal(getCurrentStep(session).requireAction, true);
        assert.equal(advanceTour(session), null);
        assert.equal(getCurrentStep(session).id, "pos.add_product");
        const next = advanceTour(session, { simulated: true });
        assert.equal(next.id, "pos.apply_discount");
    });

    it("POS phase A lists product-screen surface targets", () => {
        const phaseA = listTourSteps("pos").filter((step) => step.phase === "A");
        assert.deepEqual(
            phaseA.map((step) => step.targetHint),
            [
                "search-command",
                "category-pills",
                "ticket-pane",
                "discount-control",
                "pay-cta",
            ]
        );
        assert.deepEqual(
            phaseA.map((step) => step.id),
            [
                "pos.search",
                "pos.categories",
                "pos.ticket",
                "pos.discount",
                "pos.pay",
            ]
        );
    });

    it("POS session walks phases A through C until pos.close", () => {
        const session = createTourSession({ track: "pos" });
        const order = [getCurrentStep(session).id];
        while (!isTourComplete(session)) {
            const next = advanceTour(session, { simulated: true });
            if (!next) {
                break;
            }
            order.push(next.id);
        }
        assert.ok(order.includes("pos.search"));
        assert.ok(order.includes("pos.add_product"));
        assert.ok(order.includes("pos.payment"));
        assert.equal(order.at(-1), "pos.close");
        assert.equal(isTourComplete(session), true);
    });
});
