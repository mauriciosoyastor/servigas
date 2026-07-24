/** @odoo-module **/

import { resolveTourTargetSelectors } from "./sg_onboarding_smoke.js";

const APP_CHECKPOINTS = [
    {
        id: "shell.home",
        label: "Inicio",
        surface: "backend",
        targetHint: ".sg-launcher-shell--root",
        required: true,
    },
    {
        id: "shell.hub",
        label: "Hub",
        surface: "backend",
        targetHint: ".sg-launcher-shell--hub",
        required: true,
    },
    {
        id: "shell.section",
        label: "Operaciones",
        surface: "backend",
        targetHint: "rail.sections",
        required: true,
    },
    {
        id: "shell.kpi",
        label: "Trabajo",
        surface: "backend",
        targetHint: "hub.kpi_card",
        required: true,
    },
    {
        id: "shell.back",
        label: "Volver",
        surface: "backend",
        targetHint: "rail.back_to_hub",
        required: true,
    },
    {
        id: "shell.pos_entry",
        label: "Mostrador",
        surface: "backend",
        targetHint: "tile.punto_de_venta",
        required: true,
    },
];

const POS_CHECKPOINTS = [
    {
        id: "shell.pos.search",
        label: "Buscar",
        surface: "pos",
        targetHint: "search-command",
        required: true,
    },
    {
        id: "shell.pos.categories",
        label: "Categorías",
        surface: "pos",
        targetHint: "category-pills",
        required: true,
    },
    {
        id: "shell.pos.ticket",
        label: "Ticket",
        surface: "pos",
        targetHint: "ticket-pane",
        required: true,
    },
    {
        id: "shell.pos.discount",
        label: "Descuento",
        surface: "pos",
        targetHint: "discount-control",
        required: true,
    },
    {
        id: "shell.pos.pay",
        label: "Cobrar",
        surface: "pos",
        targetHint: "pay-cta",
        required: true,
    },
];

/**
 * Ordered shell checkpoints for the operative mental model (ADR 0007).
 * @param {"app"|"pos"|"all"} [track="app"]
 */
export function listShellCheckpoints(track = "app") {
    if (track === "pos") {
        return POS_CHECKPOINTS.map((c) => ({ ...c }));
    }
    if (track === "all") {
        return [...APP_CHECKPOINTS, ...POS_CHECKPOINTS].map((c) => ({ ...c }));
    }
    return APP_CHECKPOINTS.map((c) => ({ ...c }));
}

/**
 * @param {{ targetHint: string }} checkpoint
 */
export function resolveCheckpointSelectors(checkpoint) {
    return resolveTourTargetSelectors(checkpoint?.targetHint);
}

/**
 * @param {(selector: string) => Iterable<any>} queryAll
 * @param {{ id: string, targetHint: string }} checkpoint
 */
export function evaluateCheckpoint(queryAll, checkpoint) {
    const selectors = resolveCheckpointSelectors(checkpoint);
    for (const sel of selectors) {
        const nodes = [...(queryAll(sel) || [])];
        if (checkpoint.targetHint === "tile.punto_de_venta") {
            const match = nodes.find((node) =>
                String(node.textContent || "").includes("Punto de venta")
            );
            if (match) {
                return { id: checkpoint.id, found: true, selectorUsed: sel };
            }
            continue;
        }
        if (nodes[0]) {
            return { id: checkpoint.id, found: true, selectorUsed: sel };
        }
    }
    return { id: checkpoint.id, found: false };
}

/**
 * @param {(selector: string) => Iterable<any>} queryAll
 * @param {{ track?: "app"|"pos"|"all" }} [options]
 */
export function evaluateShellPath(queryAll, { track = "app" } = {}) {
    const checkpoints = listShellCheckpoints(track);
    const results = checkpoints.map((checkpoint) =>
        evaluateCheckpoint(queryAll, checkpoint)
    );
    const ok = checkpoints.every(
        (checkpoint, i) => !checkpoint.required || results[i].found
    );
    return { ok, results };
}

/**
 * Smoke/debug helper: evaluate shell path and log missing checkpoints (ADR 0007).
 * Lives here (not in smoke.js) to avoid a circular import with resolveTourTargetSelectors.
 * @param {(selector: string) => Iterable<any>} queryAll
 * @param {{ track?: "app"|"pos"|"all", log?: (msg: string) => void }} [options]
 */
export function reportShellPath(queryAll, { track = "app", log } = {}) {
    const report = evaluateShellPath(queryAll, { track });
    if (typeof log === "function") {
        for (const result of report.results) {
            if (!result.found) {
                log(`sg_shell_path: missing ${result.id}`);
            }
        }
        log(
            `sg_shell_path: ${report.ok ? "ok" : "incomplete"} (${track})`
        );
    }
    return report;
}

/**
 * DOM attrs for the smoke root so DevTools / future E2E can assert shell presence.
 * @param {{ ok: boolean, results: { id: string, found: boolean }[] }} report
 */
export function shellPathDomAttrs(report) {
    const missing = (report.results || [])
        .filter((r) => !r.found)
        .map((r) => r.id)
        .join(",");
    return {
        "data-sg-shell-path": report.ok ? "ok" : "incomplete",
        "data-sg-shell-path-missing": missing,
    };
}
