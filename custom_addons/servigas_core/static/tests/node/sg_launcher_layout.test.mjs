import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
    KPI_GRID_TOP_INSET,
    resolveHubKpiGridInset,
    resolveLauncherHomeGridInset,
} from "../../src/js/launcher/sg_launcher_layout.js";

const LAUNCHER_SCSS = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../src/scss/servigas_launcher.scss"
);

function assertBodyPaddingTop(scss, shellModifier, expected) {
    const re = new RegExp(
        `\\.sg-launcher-shell--${shellModifier}\\s*\\{[\\s\\S]*?\\.sg-launcher-body\\s*\\{[\\s\\S]*?padding-top:\\s*([^;]+);`
    );
    const match = scss.match(re);
    assert.ok(match, `${shellModifier} .sg-launcher-body padding-top rule missing`);
    assert.equal(match[1].trim(), expected);
}

describe("launcher home KPI card inset", () => {
    it("keeps home KPI cards below the canvas top with generous air", () => {
        const inset = resolveLauncherHomeGridInset();
        const topRem = Number.parseFloat(inset.paddingTop);

        assert.equal(inset.paddingTop, KPI_GRID_TOP_INSET);
        assert.ok(
            topRem >= 3,
            `home padding-top should be at least 3rem for breathing room, got ${inset.paddingTop}`
        );
    });

    it("keeps SCSS root body padding aligned with the inset contract", () => {
        const inset = resolveLauncherHomeGridInset();
        const scss = readFileSync(LAUNCHER_SCSS, "utf8");
        assertBodyPaddingTop(scss, "root", inset.paddingTop);
    });
});

describe("hub KPI card inset", () => {
    it("keeps hub Resumen KPI cards below the canvas top with generous air", () => {
        const inset = resolveHubKpiGridInset();
        assert.equal(inset.paddingTop, KPI_GRID_TOP_INSET);
        assert.equal(inset.paddingTop, resolveLauncherHomeGridInset().paddingTop);
    });

    it("keeps SCSS hub body padding aligned with the inset contract", () => {
        const inset = resolveHubKpiGridInset();
        const scss = readFileSync(LAUNCHER_SCSS, "utf8");
        assertBodyPaddingTop(scss, "hub", inset.paddingTop);
    });
});
