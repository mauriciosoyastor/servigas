import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
    bindActionUpdateSync,
    isRailTileActive,
    nextPinMode,
    applyPinCycle,
    resolveRailNavContext,
    computeRailExpanded,
    resolveRailToggleZone,
    resolveRailToggleFlow,
    resolveRailTogglePlacement,
    resolveRailToggleParentZone,
    railLabelsRequireExpanded,
    bindRailShellChangeSync,
    HOME_ACTIVE_TAG,
} from "../../src/js/chrome/sg_rail_context.js";

const RAIL_NAV_XML = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../src/js/chrome/sg_rail_nav.xml"
);

const HUB_TAGS = {
    servigas_sales_hub: "sales",
    servigas_inventory_hub: "inventory",
};

function hubDeps(overrides = {}) {
    return {
        getAppFromHubTag: (tag) => HUB_TAGS[tag] || null,
        getReturnContext: () => null,
        getStoredSection: () => "summary",
        ...overrides,
    };
}

describe("rail context after action settles", () => {
    it("marks hub app active with sections once controller has settled", async () => {
        let actionTag = "servigas_app_launcher";
        let ctx;

        const listeners = new Map();
        const bus = {
            addEventListener(type, fn) {
                listeners.set(type, fn);
            },
            removeEventListener(type, fn) {
                if (listeners.get(type) === fn) {
                    listeners.delete(type);
                }
            },
            trigger(type) {
                listeners.get(type)?.();
            },
        };

        const scheduled = [];
        bindActionUpdateSync(
            bus,
            () => {
                ctx = resolveRailNavContext({ actionTag, ...hubDeps() });
            },
            {
                schedule: (fn) => scheduled.push(fn),
                readTag: () => actionTag,
            }
        );

        bus.trigger("ACTION_MANAGER:UPDATE");
        assert.equal(ctx.showHubSections, false, "immediate sync still sees launcher");

        // First deferred pass: nested hub action not ready yet
        assert.ok(scheduled.length >= 1);
        scheduled.shift()();
        assert.equal(ctx.showHubSections, false, "first probe still launcher");

        // Controller settles after the first probe (no new UPDATE event)
        actionTag = "servigas_sales_hub";

        while (scheduled.length) {
            scheduled.shift()();
        }

        assert.equal(ctx.hubApp, "sales");
        assert.equal(ctx.showHubSections, true);
        assert.equal(ctx.activeTag, "servigas_sales_hub");
        assert.equal(
            isRailTileActive(ctx.activeTag, { client_tag: "servigas_sales_hub" }),
            true
        );
    });
});

describe("rail pin cycle", () => {
    it("notifies subscribers when pin cycles even if expanded width is unchanged", () => {
        const computeExpanded = (pinMode) => {
            if (pinMode === "collapsed") {
                return false;
            }
            // auto + shell, or forced expanded → same width
            return true;
        };

        const before = { pinMode: "auto", expanded: true };
        assert.equal(computeExpanded(before.pinMode), true);

        const after = applyPinCycle(before, computeExpanded);
        assert.equal(after.pinMode, "expanded");
        assert.equal(after.expanded, true);
        assert.equal(after.notify, true);
        assert.equal(nextPinMode("auto"), "expanded");
    });
});

describe("rail on launcher", () => {
    it("treats launcher as home without hub sections or active tiles", () => {
        const ctx = resolveRailNavContext({
            actionTag: "servigas_app_launcher",
            ...hubDeps(),
        });
        assert.equal(ctx.activeTag, HOME_ACTIVE_TAG);
        assert.equal(ctx.hubApp, null);
        assert.equal(ctx.showHubSections, false);
        assert.equal(
            isRailTileActive(ctx.activeTag, { client_tag: "servigas_sales_hub" }),
            false
        );
    });
});

describe("rail hub SECCIÓN visibility", () => {
    it("shows SECCIÓN on hub and hides them on launcher", () => {
        const onHub = resolveRailNavContext({
            actionTag: "servigas_sales_hub",
            ...hubDeps(),
        });
        assert.equal(onHub.hubApp, "sales");
        assert.equal(onHub.showHubSections, true);

        const onLauncher = resolveRailNavContext({
            actionTag: "servigas_app_launcher",
            ...hubDeps(),
        });
        assert.equal(onLauncher.hubApp, null);
        assert.equal(onLauncher.showHubSections, false);
    });
});

describe("rail after KPI card opens native action", () => {
    it("keeps inventory hub return context when act_window has no tag", () => {
        const returnCtx = {
            app: "inventory",
            section: "operations",
            hubTag: "servigas_inventory_hub",
        };
        const ctx = resolveRailNavContext({
            // Native act_window: controller exists but has no client tag
            actionTag: "",
            ...hubDeps({
                getReturnContext: () => returnCtx,
                getStoredSection: (app) =>
                    app === "inventory" ? "operations" : "summary",
            }),
        });

        assert.equal(ctx.showBackToHub, true);
        assert.equal(ctx.hubApp, "inventory");
        assert.equal(ctx.showHubSections, true);
        assert.equal(ctx.activeHubSection, "operations");
        assert.equal(
            isRailTileActive(ctx.activeTag, { client_tag: "servigas_inventory_hub" }, returnCtx.hubTag),
            true
        );
        assert.equal(
            isRailTileActive(ctx.activeTag, { client_tag: "servigas_sales_hub" }, returnCtx.hubTag),
            false
        );
    });

    it("hides hub sections on native action without return context", () => {
        const ctx = resolveRailNavContext({
            actionTag: "",
            ...hubDeps(),
        });
        assert.equal(ctx.showBackToHub, false);
        assert.equal(ctx.hubApp, null);
        assert.equal(ctx.showHubSections, false);
    });
});

describe("rail expanded width from pin and shell", () => {
    it("collapses in auto when leaving shell; stays expanded when pin is forced", () => {
        assert.equal(
            computeRailExpanded({ pinMode: "auto", isShellView: true, isMobile: false }),
            true
        );
        assert.equal(
            computeRailExpanded({ pinMode: "auto", isShellView: false, isMobile: false }),
            false
        );
        assert.equal(
            computeRailExpanded({ pinMode: "expanded", isShellView: false, isMobile: false }),
            true
        );
        assert.equal(
            computeRailExpanded({ pinMode: "collapsed", isShellView: true, isMobile: false }),
            false
        );
    });

    it("never expands on mobile regardless of pin or shell", () => {
        assert.equal(
            computeRailExpanded({ pinMode: "expanded", isShellView: true, isMobile: true }),
            false
        );
        assert.equal(
            computeRailExpanded({ pinMode: "auto", isShellView: true, isMobile: true }),
            false
        );
        assert.equal(
            computeRailExpanded({ pinMode: "collapsed", isShellView: true, isMobile: true }),
            false
        );
    });

    it("expands on hover even when pin/shell would keep it collapsed", () => {
        assert.equal(
            computeRailExpanded({
                pinMode: "collapsed",
                isShellView: false,
                isMobile: false,
                isHovered: true,
            }),
            true
        );
        assert.equal(
            computeRailExpanded({
                pinMode: "auto",
                isShellView: false,
                isMobile: false,
                isHovered: true,
            }),
            true
        );
        assert.equal(
            computeRailExpanded({
                pinMode: "collapsed",
                isShellView: false,
                isMobile: false,
                isHovered: false,
            }),
            false
        );
    });
});

describe("rail toggle placement", () => {
    it("keeps the expand toggle in the footer so it does not cover Ventas", () => {
        assert.deepEqual(resolveRailTogglePlacement({ isExpanded: false }), {
            zone: "footer",
            flow: "column",
            positioning: "static",
        });
        assert.deepEqual(resolveRailTogglePlacement({ isExpanded: true }), {
            zone: "footer",
            flow: "column",
            positioning: "static",
        });
    });

    it("keeps legacy zone/flow helpers aligned with placement", () => {
        for (const isExpanded of [false, true]) {
            const placement = resolveRailTogglePlacement({ isExpanded });
            assert.equal(resolveRailToggleZone({ isExpanded }), placement.zone);
            assert.equal(resolveRailToggleFlow({ isExpanded }), placement.flow);
        }
    });

    it("places expand toggle inside footer markup, not top", () => {
        const markup = readFileSync(RAIL_NAV_XML, "utf8");
        assert.equal(resolveRailToggleParentZone(markup), "footer");
        assert.notEqual(resolveRailToggleParentZone(markup), "top");
    });
});

describe("rail label visibility", () => {
    it("shows text labels only when the rail is expanded", () => {
        const markup = readFileSync(RAIL_NAV_XML, "utf8");
        assert.equal(railLabelsRequireExpanded(markup), true);
    });
});

describe("rail sync after shell leaves (KPI → native)", () => {
    it("shows Volver al hub once controller leaves the hub tag", async () => {
        let actionTag = "servigas_inventory_hub";
        const returnCtx = {
            app: "inventory",
            section: "summary",
            hubTag: "servigas_inventory_hub",
        };
        let ctx;

        const listeners = new Map();
        const bus = {
            addEventListener(type, fn) {
                listeners.set(type, fn);
            },
            removeEventListener(type, fn) {
                if (listeners.get(type) === fn) {
                    listeners.delete(type);
                }
            },
            trigger(type) {
                listeners.get(type)?.();
            },
        };

        const scheduled = [];
        bindActionUpdateSync(
            bus,
            () => {
                ctx = resolveRailNavContext({
                    actionTag,
                    ...hubDeps({
                        getReturnContext: () => returnCtx,
                        getStoredSection: () => "summary",
                    }),
                });
            },
            {
                schedule: (fn) => scheduled.push(fn),
                probes: 5,
            }
        );

        bus.trigger("ACTION_MANAGER:UPDATE");
        assert.equal(ctx.showBackToHub, false, "still on hub tag");
        assert.equal(ctx.showHubSections, true);

        // First probes still see hub; native act_window settles later (no tag)
        scheduled.shift()();
        actionTag = "";

        while (scheduled.length) {
            scheduled.shift()();
        }

        assert.equal(ctx.showBackToHub, true);
        assert.equal(ctx.hubApp, "inventory");
        assert.equal(
            isRailTileActive(ctx.activeTag, { client_tag: "servigas_inventory_hub" }, returnCtx.hubTag),
            true
        );
    });

    it("recovers Volver al hub when shell change fires after probes are exhausted", () => {
        let actionTag = "servigas_inventory_hub";
        const returnCtx = {
            app: "inventory",
            section: "summary",
            hubTag: "servigas_inventory_hub",
        };
        let ctx;

        const listeners = new Map();
        const bus = {
            addEventListener(type, fn) {
                if (!listeners.has(type)) {
                    listeners.set(type, new Set());
                }
                listeners.get(type).add(fn);
            },
            removeEventListener(type, fn) {
                listeners.get(type)?.delete(fn);
            },
            trigger(type) {
                for (const fn of listeners.get(type) || []) {
                    fn();
                }
            },
        };

        const sync = () => {
            ctx = resolveRailNavContext({
                actionTag,
                ...hubDeps({
                    getReturnContext: () => returnCtx,
                    getStoredSection: () => "summary",
                }),
            });
        };

        const scheduled = [];
        bindActionUpdateSync(bus, sync, {
            schedule: (fn) => scheduled.push(fn),
            probes: 2,
        });
        bindRailShellChangeSync(bus, sync);

        bus.trigger("ACTION_MANAGER:UPDATE");
        while (scheduled.length) {
            scheduled.shift()();
        }
        assert.equal(ctx.showBackToHub, false, "probes finished while still on hub");

        // Native view mounted; shell unmounted — too late for UPDATE probes
        actionTag = "";
        bus.trigger("SG_RAIL:SHELL_CHANGE");

        assert.equal(ctx.showBackToHub, true);
        assert.equal(ctx.hubApp, "inventory");
    });
});
