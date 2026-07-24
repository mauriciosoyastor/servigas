/** @odoo-module **/

import { buildFullSteps } from "./sg_onboarding_full_catalog.js";

const APP_STEPS = [
    {
        id: "app.home",
        track: "app",
        title: "Inicio",
        body: "Cada tile es un área de trabajo. Tocá Ventas para ver el resumen.",
        badge: "Bienvenida",
        targetHint: ".sg-launcher-shell--root",
        next: "app.hub",
    },
    {
        id: "app.hub",
        track: "app",
        title: "Hub",
        body: "Acá ves números vivos del negocio, no la lista todavía.",
        badge: "Ventas",
        targetHint: ".sg-launcher-shell--hub",
        next: "app.section",
    },
    {
        id: "app.section",
        track: "app",
        title: "Operaciones",
        body: "Las secciones viven en el rail: Resumen, Operaciones y Más.",
        badge: "Rail",
        targetHint: "rail.sections",
        next: "app.kpi",
    },
    {
        id: "app.kpi",
        track: "app",
        title: "Trabajo",
        body: "Tocá una tarjeta para abrir la lista filtrada.",
        badge: "KPI",
        targetHint: "hub.kpi_card",
        next: "app.back",
    },
    {
        id: "app.back",
        track: "app",
        title: "Volver",
        body: "Con «Volver al hub» no te perdés. El rail puede achicarse: es normal.",
        badge: "Navegación",
        targetHint: "rail.back_to_hub",
        next: "app.pos_entry",
    },
    {
        id: "app.pos_entry",
        track: "app",
        title: "Mostrador",
        body: "Entrá por Punto de venta → Mostrador Servigas → Abrir. No hay hub de POS.",
        badge: "Mostrador",
        targetHint: "tile.punto_de_venta",
        next: null,
    },
];

/** Minimal POS catalog: A surfaces + B requireAction (C added by later behavior). */
const POS_STEPS = [
    {
        id: "pos.search",
        track: "pos",
        phase: "A",
        title: "Buscar",
        body: "Escribí el código de fabricante para encontrar el repuesto.",
        targetHint: "search-command",
        next: "pos.categories",
    },
    {
        id: "pos.categories",
        track: "pos",
        phase: "A",
        title: "Categorías",
        body: "Filtrá por rubro con las pills de arriba.",
        targetHint: "category-pills",
        next: "pos.ticket",
    },
    {
        id: "pos.ticket",
        track: "pos",
        phase: "A",
        title: "Ticket",
        body: "Acá se arma el pedido del cliente.",
        targetHint: "ticket-pane",
        next: "pos.discount",
    },
    {
        id: "pos.discount",
        track: "pos",
        phase: "A",
        title: "Descuento",
        body: "El vendedor aplica el descuento a mano.",
        targetHint: "discount-control",
        next: "pos.pay",
    },
    {
        id: "pos.pay",
        track: "pos",
        phase: "A",
        title: "Cobrar",
        body: "Cuando el ticket está listo, tocá Cobrar.",
        targetHint: "pay-cta",
        next: "pos.add_product",
    },
    {
        id: "pos.add_product",
        track: "pos",
        phase: "B",
        title: "Practicá",
        body: "Agregá un producto al ticket.",
        targetHint: "ticket-pane",
        requireAction: true,
        next: "pos.apply_discount",
    },
    {
        id: "pos.apply_discount",
        track: "pos",
        phase: "B",
        title: "Descuento",
        body: "Aplicá un descuento o Simular.",
        targetHint: "discount-control",
        requireAction: true,
        next: "pos.tap_pay",
    },
    {
        id: "pos.tap_pay",
        track: "pos",
        phase: "B",
        title: "Cobrar",
        body: "Tocá Cobrar para pasar al pago.",
        targetHint: "pay-cta",
        requireAction: true,
        next: "pos.payment",
    },
    {
        id: "pos.payment",
        track: "pos",
        phase: "C",
        title: "Pago",
        body: "Elegí cómo paga el cliente y confirmá.",
        targetHint: "pos.payment",
        next: "pos.receipt",
    },
    {
        id: "pos.receipt",
        track: "pos",
        phase: "C",
        title: "Recibo",
        body: "Revisá o imprimí el comprobante.",
        targetHint: "pos.receipt",
        next: "pos.close",
    },
    {
        id: "pos.close",
        track: "pos",
        phase: "C",
        title: "Cerrar",
        body: "Cerrá la sesión del Mostrador cuando termines el turno.",
        targetHint: "pos.close_session",
        next: null,
    },
];

const DEFAULT_FULL_TILES = [
    "sales",
    "inventory",
    "purchase",
    "accounting",
    "integrations",
    "pos",
];

let FULL_STEPS = buildFullSteps({ visibleTileKeys: DEFAULT_FULL_TILES });

function rebuildStepsById() {
    return Object.fromEntries(
        [...APP_STEPS, ...POS_STEPS, ...FULL_STEPS].map((step) => [step.id, step])
    );
}

let STEPS_BY_ID = rebuildStepsById();

/** Reconfigure full playlist from visible launcher tiles (ADR 0009/0011). */
export function configureFullPlaylist({ visibleTileKeys }) {
    FULL_STEPS = buildFullSteps({ visibleTileKeys });
    STEPS_BY_ID = rebuildStepsById();
}

const TRACK_START = {
    app: "app.home",
    pos: "pos.search",
};

export function listTourSteps(trackOrOpts) {
    const steps = [...APP_STEPS, ...POS_STEPS, ...FULL_STEPS].map((step) => ({
        ...step,
        playlist: step.playlist ?? "quick",
    }));
    if (!trackOrOpts) {
        return steps;
    }
    if (typeof trackOrOpts === "string") {
        return steps.filter((step) => step.track === trackOrOpts);
    }
    const { playlist = "quick", track } = trackOrOpts;
    let out = steps.filter((step) => step.playlist === playlist);
    if (track) {
        out = out.filter((step) => step.track === track);
    }
    return out;
}

export function createTourSession({
    track = "app",
    mode = "full",
    playlist = "quick",
} = {}) {
    let startId;
    if (playlist === "full") {
        startId = FULL_STEPS[0]?.id;
        track = "app";
    } else {
        startId = TRACK_START[track];
    }
    if (!startId) {
        throw new Error(
            playlist === "full"
                ? "Full playlist is empty"
                : `Unsupported track: ${track}`
        );
    }
    return {
        track,
        mode,
        playlist,
        currentId: startId,
        done: false,
    };
}

export function getCurrentStep(session) {
    if (!session || session.done || !session.currentId) {
        return null;
    }
    return STEPS_BY_ID[session.currentId] || null;
}

export function advanceTour(session, { simulated = false } = {}) {
    const current = getCurrentStep(session);
    if (!current) {
        return null;
    }
    if (current.requireAction && !simulated) {
        return null;
    }
    if (!current.next) {
        session.done = true;
        session.currentId = null;
        return null;
    }
    session.currentId = current.next;
    return getCurrentStep(session);
}

export function jumpToChapter(session, chapterId) {
    if (!session || session.done || !chapterId) {
        return false;
    }
    const playlist = session.playlist ?? "quick";
    const steps = listTourSteps({ playlist });
    const first = steps.find((step) => step.chapter === chapterId);
    if (!first) {
        return false;
    }
    session.currentId = first.id;
    session.done = false;
    return true;
}

const CHAPTER_LABELS = {
    shell: "Shell",
    sales: "Ventas",
    inventory: "Inventario",
    purchase: "Compras",
    accounting: "Facturación",
    integrations: "Integraciones",
    pos_entry: "Mostrador",
    apps: "Aplicaciones",
    settings: "Ajustes",
};

export function listChapters(playlist = "quick") {
    const steps = listTourSteps({ playlist });
    const seen = new Set();
    const chapters = [];
    for (const step of steps) {
        if (!step.chapter || seen.has(step.chapter)) {
            continue;
        }
        seen.add(step.chapter);
        chapters.push({
            id: step.chapter,
            label: CHAPTER_LABELS[step.chapter] || step.chapter,
            firstStepId: step.id,
        });
    }
    return chapters;
}

export function listPlaylists() {
    return ["quick", "full"];
}

export function shouldOfferPosTrack(session) {
    return getCurrentStep(session)?.id === "app.pos_entry";
}

export function skipTour(session) {
    if (!session) {
        return;
    }
    session.done = true;
    session.currentId = null;
}

export function isTourComplete(session) {
    return Boolean(session && session.done);
}
