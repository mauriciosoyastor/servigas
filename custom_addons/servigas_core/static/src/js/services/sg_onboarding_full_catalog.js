/** @odoo-module **/

/**
 * Full playlist catalog builder (ADR 0011).
 * Pure: receives already-resolved visible tile keys (no ORM).
 */

const TILE_ORDER = [
    "sales",
    "inventory",
    "purchase",
    "accounting",
    "integrations",
    "pos",
    "apps",
    "settings",
];

const HUB_KEYS = new Set(["sales", "inventory", "purchase", "accounting"]);

const HUB_LABELS = {
    sales: "Ventas",
    inventory: "Inventario",
    purchase: "Compras",
    accounting: "Facturación",
};

function shellSteps() {
    return [
        {
            id: "full.shell.home",
            playlist: "full",
            chapter: "shell",
            title: "Inicio",
            body: "El Inicio lista las áreas de trabajo.",
            targetHint: ".sg-launcher-shell--root",
            next: null,
        },
        {
            id: "full.shell.rail_apps",
            playlist: "full",
            chapter: "shell",
            title: "Rail",
            body: "Arriba del rail volvés al Inicio y cambiás de área.",
            targetHint: "rail.apps",
            next: null,
        },
        {
            id: "full.shell.rail_sections",
            playlist: "full",
            chapter: "shell",
            title: "Secciones",
            body: "Las secciones del área viven en el rail.",
            targetHint: "rail.sections",
            next: null,
        },
        {
            id: "full.shell.rail_toggle",
            playlist: "full",
            chapter: "shell",
            title: "Rail",
            body: "Podés fijar o achicar el rail; es normal que cambie de tamaño.",
            targetHint: "rail.toggle",
            next: null,
        },
    ];
}

function hubSteps(tileKey, { includeOdooBar = false } = {}) {
    const label = HUB_LABELS[tileKey] || tileKey;
    const steps = [
        {
            id: `full.${tileKey}.enter`,
            playlist: "full",
            chapter: tileKey,
            title: label,
            body: `Entrá al hub de ${label}.`,
            targetHint: `.sg-launcher-shell--hub`,
            navigateHint: `hub.${tileKey}`,
            next: null,
        },
        {
            id: `full.${tileKey}.hub`,
            playlist: "full",
            chapter: tileKey,
            title: label,
            body: `Acá ves el resumen vivo de ${label}.`,
            targetHint: ".sg-launcher-shell--hub",
            next: null,
        },
        {
            id: `full.${tileKey}.sections`,
            playlist: "full",
            chapter: tileKey,
            title: "Secciones",
            body: `Las secciones de ${label} están en el rail.`,
            targetHint: "rail.sections",
            next: null,
        },
        {
            id: `full.${tileKey}.kpi`,
            playlist: "full",
            chapter: tileKey,
            title: "Trabajo",
            body: "Tocá una tarjeta KPI para abrir la lista filtrada.",
            targetHint: "hub.kpi_card",
            requireAction: true,
            next: null,
        },
    ];
    if (includeOdooBar) {
        steps.push({
            id: "full.odoo_list_chrome",
            playlist: "full",
            chapter: tileKey,
            title: "Lista de trabajo",
            body: "Crear, buscar, filtros y acciones viven acá; el hub te trajo filtrado.",
            targetHint: "odoo.list_chrome",
            next: null,
        });
    }
    steps.push({
        id: `full.${tileKey}.back`,
        playlist: "full",
        chapter: tileKey,
        title: "Volver",
        body: "Con «Volver al hub» no te perdés.",
        targetHint: "rail.back_to_hub",
        next: null,
    });
    return steps;
}

function actionSteps(tileKey) {
    const chapter = tileKey === "pos" ? "pos_entry" : tileKey;
    return [
        {
            id: `full.${chapter}.enter`,
            playlist: "full",
            chapter,
            title: tileKey,
            body: `Entrá a ${tileKey}.`,
            targetHint: `tile.${tileKey}`,
            next: null,
        },
        {
            id: `full.${chapter}.about`,
            playlist: "full",
            chapter,
            title: tileKey,
            body: `Qué es el área ${tileKey}.`,
            targetHint: `tile.${tileKey}`,
            next: null,
        },
        {
            id: `full.${chapter}.back`,
            playlist: "full",
            chapter,
            title: "Volver",
            body: "Volvé al Inicio cuando termines.",
            targetHint: ".sg-launcher-shell--root",
            next: null,
        },
    ];
}

export function actionTemplateStepCount() {
    return 3;
}

export function hubTemplateStepCount({ includeOdooBar = false } = {}) {
    return includeOdooBar ? 6 : 5;
}

function linkNext(steps) {
    for (let i = 0; i < steps.length; i++) {
        steps[i].next = i < steps.length - 1 ? steps[i + 1].id : null;
    }
    return steps;
}

/**
 * @param {{ visibleTileKeys?: string[] }} opts
 */
export function buildFullSteps({ visibleTileKeys = [] } = {}) {
    const visible = new Set(visibleTileKeys);
    const steps = [...shellSteps()];
    let firstHubSeen = false;

    for (const key of TILE_ORDER) {
        if (!visible.has(key)) {
            continue;
        }
        if (HUB_KEYS.has(key)) {
            steps.push(...hubSteps(key, { includeOdooBar: !firstHubSeen }));
            firstHubSeen = true;
        } else {
            steps.push(...actionSteps(key));
        }
    }

    return linkNext(steps);
}
