import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    evaluateCheckpoint,
    evaluateShellPath,
    listShellCheckpoints,
    resolveCheckpointSelectors,
} from "../../src/js/services/sg_shell_path.js";
import { resolveTourTargetSelectors } from "../../src/js/services/sg_onboarding_smoke.js";
import { selectorsForSurface } from "../../src/js/services/sg_pos_theme.js";

describe("shell path (ADR 0007)", () => {
    it("lists app checkpoints Inicio→Hub→Sección→Trabajo→Volver→Mostrador", () => {
        const ids = listShellCheckpoints("app").map((c) => c.id);
        assert.deepEqual(ids, [
            "shell.home",
            "shell.hub",
            "shell.section",
            "shell.kpi",
            "shell.back",
            "shell.pos_entry",
        ]);
    });

    it("evaluateCheckpoint reports found when target is in DOM", () => {
        const home = listShellCheckpoints("app")[0];
        const queryAll = (sel) =>
            sel === ".sg-launcher-shell--root" ? [{ tag: "div" }] : [];
        const result = evaluateCheckpoint(queryAll, home);
        assert.equal(result.id, "shell.home");
        assert.equal(result.found, true);
        assert.equal(result.selectorUsed, ".sg-launcher-shell--root");
    });

    it("evaluateShellPath ok is false when a required target is missing", () => {
        const queryAll = () => [];
        const report = evaluateShellPath(queryAll, { track: "app" });
        assert.equal(report.ok, false);
        assert.equal(report.results.every((r) => r.found === false), true);
        assert.doesNotThrow(() => evaluateCheckpoint(queryAll, listShellCheckpoints("app")[0]));
    });

    it("lists pos checkpoints only for Mostrador phase A surfaces", () => {
        const ids = listShellCheckpoints("pos").map((c) => c.id);
        assert.deepEqual(ids, [
            "shell.pos.search",
            "shell.pos.categories",
            "shell.pos.ticket",
            "shell.pos.discount",
            "shell.pos.pay",
        ]);
        assert.equal(
            listShellCheckpoints("pos").every((c) => c.surface === "pos"),
            true
        );
        assert.equal(
            listShellCheckpoints("pos").some((c) => c.surface === "backend"),
            false
        );
    });

    it("resolves logical hints via the same selectors as onboarding smoke", () => {
        const byId = Object.fromEntries(
            listShellCheckpoints("all").map((c) => [c.id, c])
        );
        assert.deepEqual(
            resolveCheckpointSelectors(byId["shell.section"]),
            resolveTourTargetSelectors("rail.sections")
        );
        assert.deepEqual(
            resolveCheckpointSelectors(byId["shell.back"]),
            resolveTourTargetSelectors("rail.back_to_hub")
        );
        assert.deepEqual(
            resolveCheckpointSelectors(byId["shell.pos_entry"]),
            resolveTourTargetSelectors("tile.punto_de_venta")
        );
        assert.deepEqual(
            resolveCheckpointSelectors(byId["shell.pos.search"]),
            selectorsForSurface("search-command")
        );

        const queryAll = (sel) =>
            sel === ".sg-launcher-tile"
                ? [{ textContent: "Punto de venta" }]
                : [];
        const posEntry = evaluateCheckpoint(queryAll, byId["shell.pos_entry"]);
        assert.equal(posEntry.found, true);
        assert.equal(posEntry.selectorUsed, ".sg-launcher-tile");
    });

    it("shell.kpi uses hub-scoped KPI card hint (ADR 0008)", () => {
        const kpi = listShellCheckpoints("app").find((c) => c.id === "shell.kpi");
        assert.equal(kpi.targetHint, "hub.kpi_card");
        assert.deepEqual(
            resolveCheckpointSelectors(kpi),
            resolveTourTargetSelectors("hub.kpi_card")
        );
        const queryAll = (sel) =>
            sel === ".sg-launcher-shell--hub .sg-launcher-tile"
                ? [{ textContent: "Pedidos" }]
                : [];
        const result = evaluateCheckpoint(queryAll, kpi);
        assert.equal(result.found, true);
        assert.equal(
            result.selectorUsed,
            ".sg-launcher-shell--hub .sg-launcher-tile"
        );
    });
});
