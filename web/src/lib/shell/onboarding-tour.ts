/**
 * Onboarding spotlight tour — steps + browser storage helpers (mostrador AR).
 */

export const TOUR_DONE_KEY = "sg_tour_done";
export const TOUR_STEP_KEY = "sg_tour_step";
export const TOUR_SKIP_SESSION_KEY = "sg_tour_skipped_session";

export type TourStepId =
  | "home-ops"
  | "home-tile"
  | "home-rail"
  | "hub-card"
  | "hub-to-pos"
  | "pos-ticket"
  | "pos-cobrar";

export type TourStep = {
  id: TourStepId;
  /** Path prefix that must match to show this step (exact or startsWith). */
  path: string;
  /** `data-tour` value on the target element. */
  target: string;
  title: string;
  body: string;
  /** If set, advancing navigates here when leaving this step. */
  navigateTo?: string;
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: "home-ops",
    path: "/",
    target: "ops-strip",
    title: "Atajos del día",
    body: "Acá están los atajos del mostrador: caja, cotización y pedido a proveedor.",
  },
  {
    id: "home-tile",
    path: "/",
    target: "home-tile",
    title: "Tus áreas",
    body: "Desde acá entrás a cada área del negocio (inventario, ventas, compras…).",
  },
  {
    id: "home-rail",
    path: "/",
    target: "rail-inventory",
    title: "Menú lateral",
    body: "Este menú te lleva a las secciones. Tocá Siguiente para mirar Inventario.",
    navigateTo: "/hubs/inventory",
  },
  {
    id: "hub-card",
    path: "/hubs/",
    target: "hub-card",
    title: "Tarjetas del día",
    body: "Estas tarjetas abren listados y datos que usás en el día a día.",
  },
  {
    id: "hub-to-pos",
    path: "/hubs/",
    target: "pos-entry",
    title: "La caja",
    body: "Cuando atiendas al cliente, la caja es el mostrador.",
    navigateTo: "/pos",
  },
  {
    id: "pos-ticket",
    path: "/pos",
    target: "pos-ticket",
    title: "Armar el ticket",
    body: "Acá cargás productos al ticket.",
  },
  {
    id: "pos-cobrar",
    path: "/pos",
    target: "pos-checkout",
    title: "Cobrar",
    body: "Con esto registrás la venta. Listo: ya conocés el recorrido.",
  },
];

export type TourStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export function pathMatchesStep(pathname: string, step: TourStep): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (step.path === "/") return path === "/";
  if (step.path.endsWith("/")) {
    return path === step.path.slice(0, -1) || path.startsWith(step.path);
  }
  return path === step.path || path.startsWith(`${step.path}/`);
}

export function getStepById(id: string | null | undefined): TourStep | null {
  if (!id) return null;
  return TOUR_STEPS.find((step) => step.id === id) || null;
}

export function shouldAutoStart(
  storage: TourStorage,
  sessionStorage: TourStorage
): boolean {
  if (storage.getItem(TOUR_DONE_KEY) === "1") return false;
  if (sessionStorage.getItem(TOUR_SKIP_SESSION_KEY) === "1") return false;
  return true;
}

export function markTourDone(storage: TourStorage): void {
  storage.setItem(TOUR_DONE_KEY, "1");
  storage.removeItem(TOUR_STEP_KEY);
}

export function markTourSkippedSession(sessionStorage: TourStorage): void {
  sessionStorage.setItem(TOUR_SKIP_SESSION_KEY, "1");
  // keep step cleared so a fresh visit can restart unless done
}

export function setTourStep(storage: TourStorage, id: TourStepId): void {
  storage.setItem(TOUR_STEP_KEY, id);
}

export function clearTourStep(storage: TourStorage): void {
  storage.removeItem(TOUR_STEP_KEY);
}

/**
 * Pick the step to show on this page: resume stored step if it matches path,
 * otherwise first step that matches path (from start or after stored index).
 */
export function resolveInitialStep(
  pathname: string,
  storage: TourStorage,
  hasTarget: (target: string) => boolean
): TourStep | null {
  const stored = getStepById(storage.getItem(TOUR_STEP_KEY));
  if (stored && pathMatchesStep(pathname, stored) && hasTarget(stored.target)) {
    return stored;
  }

  const startIndex = stored
    ? Math.max(
        0,
        TOUR_STEPS.findIndex((step) => step.id === stored.id)
      )
    : 0;

  for (let i = startIndex; i < TOUR_STEPS.length; i++) {
    const step = TOUR_STEPS[i];
    if (pathMatchesStep(pathname, step) && hasTarget(step.target)) {
      return step;
    }
  }

  // If we landed on a page mid-tour but target missing, try any later matching path
  for (let i = 0; i < TOUR_STEPS.length; i++) {
    const step = TOUR_STEPS[i];
    if (pathMatchesStep(pathname, step) && hasTarget(step.target)) {
      return step;
    }
  }

  return null;
}

export type AdvanceResult =
  | { kind: "step"; step: TourStep }
  | { kind: "navigate"; href: string; nextStepId: TourStepId }
  | { kind: "done" };

/**
 * Advance from current step, skipping missing targets on the same path.
 * If next step is on another path, return navigate.
 */
export function advanceTour(
  current: TourStep,
  pathname: string,
  hasTarget: (target: string) => boolean
): AdvanceResult {
  const index = TOUR_STEPS.findIndex((step) => step.id === current.id);
  if (index < 0) return { kind: "done" };

  // Leaving current via navigateTo before looking for same-path next
  if (current.navigateTo) {
    const next = TOUR_STEPS[index + 1];
    if (!next) return { kind: "done" };
    return {
      kind: "navigate",
      href: current.navigateTo,
      nextStepId: next.id,
    };
  }

  for (let i = index + 1; i < TOUR_STEPS.length; i++) {
    const step = TOUR_STEPS[i];
    if (pathMatchesStep(pathname, step)) {
      if (hasTarget(step.target)) {
        return { kind: "step", step };
      }
      continue;
    }
    // First step on a different route — navigate there
    return {
      kind: "navigate",
      href: step.path === "/hubs/" ? "/hubs/inventory" : step.path,
      nextStepId: step.id,
    };
  }

  return { kind: "done" };
}

export function stepIndex(id: TourStepId): number {
  return TOUR_STEPS.findIndex((step) => step.id === id);
}

export function tourProgressLabel(id: TourStepId): string {
  const n = stepIndex(id) + 1;
  return `Paso ${n} de ${TOUR_STEPS.length}`;
}

export type TourTipLayoutInput = {
  holeTop: number;
  holeLeft: number;
  holeWidth: number;
  holeHeight: number;
  tipWidth: number;
  tipHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  gap?: number;
  margin?: number;
};

/**
 * Keep the tip fully inside the viewport. Prefer below the hole, then above;
 * if neither fits, clamp within margins (may overlap the hole).
 */
export function clampTourTipPosition(input: TourTipLayoutInput): {
  top: number;
  left: number;
} {
  const gap = input.gap ?? 12;
  const margin = input.margin ?? 8;
  const maxLeft = Math.max(
    margin,
    input.viewportWidth - input.tipWidth - margin
  );
  let left = Math.min(Math.max(margin, input.holeLeft), maxLeft);

  const below = input.holeTop + input.holeHeight + gap;
  const above = input.holeTop - gap - input.tipHeight;
  const maxTop = Math.max(
    margin,
    input.viewportHeight - input.tipHeight - margin
  );

  let top: number;
  if (below + input.tipHeight <= input.viewportHeight - margin) {
    top = below;
  } else if (above >= margin) {
    top = above;
  } else {
    top = Math.min(Math.max(margin, below), maxTop);
  }

  top = Math.min(Math.max(margin, top), maxTop);
  return { top, left };
}
