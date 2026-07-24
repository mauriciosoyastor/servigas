import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    actionTemplateStepCount,
    buildFullSteps,
    hubTemplateStepCount,
} from "../../src/js/services/sg_onboarding_full_catalog.js";

describe("onboarding full catalog (ADR 0011)", () => {
    it("buildFullSteps omits chapters for tiles not visible", () => {
        const steps = buildFullSteps({
            visibleTileKeys: ["inventory", "purchase"],
        });
        const chapters = [...new Set(steps.map((s) => s.chapter))];
        assert.ok(chapters.includes("shell"));
        assert.ok(chapters.includes("inventory"));
        assert.ok(chapters.includes("purchase"));
        assert.ok(!chapters.includes("sales"));
        assert.ok(!chapters.includes("accounting"));
    });

    it("hub template includes KPI requireAction and optional Odoo bar", () => {
        assert.equal(hubTemplateStepCount({ includeOdooBar: true }), 6);
        assert.equal(hubTemplateStepCount({ includeOdooBar: false }), 5);

        const steps = buildFullSteps({
            visibleTileKeys: ["sales", "inventory"],
        });
        const sales = steps.filter((s) => s.chapter === "sales");
        assert.equal(sales.length, 6);
        const kpi = sales.find((s) => s.id === "full.sales.kpi");
        assert.equal(kpi.requireAction, true);
        assert.ok(sales.some((s) => s.id === "full.odoo_list_chrome"));

        const inv = steps.filter((s) => s.chapter === "inventory");
        assert.equal(inv.length, 5);
        assert.ok(!inv.some((s) => s.id === "full.odoo_list_chrome"));
        assert.equal(
            inv.find((s) => s.id === "full.inventory.kpi").requireAction,
            true
        );
    });

    it("Odoo list chrome step only on the first hub chapter", () => {
        const steps = buildFullSteps({
            visibleTileKeys: ["sales", "inventory"],
        });
        const odooSteps = steps.filter((s) => s.id === "full.odoo_list_chrome");
        assert.equal(odooSteps.length, 1);
        assert.equal(odooSteps[0].chapter, "sales");
        const invIds = steps
            .filter((s) => s.chapter === "inventory")
            .map((s) => s.id);
        assert.ok(!invIds.includes("full.odoo_list_chrome"));
    });

    it("POS tile uses action template without pos.search steps", () => {
        const steps = buildFullSteps({ visibleTileKeys: ["pos"] });
        const ids = steps.map((s) => s.id);
        assert.ok(ids.some((id) => id.startsWith("full.pos_entry")));
        assert.ok(!ids.includes("pos.search"));
        assert.ok(!steps.some((s) => s.track === "pos"));
        assert.equal(
            steps.filter((s) => s.chapter === "pos_entry").length,
            actionTemplateStepCount()
        );
    });
});
