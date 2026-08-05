import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TOUR_DONE_KEY,
  TOUR_SKIP_SESSION_KEY,
  TOUR_STEP_KEY,
  TOUR_STEPS,
  advanceTour,
  canLeaveCajaOpenStep,
  clampTourTipPosition,
  dockTourTipCorner,
  clearTourStep,
  markTourDone,
  markTourSkippedSession,
  pathMatchesStep,
  resolveInitialStep,
  shouldAutoStart,
  tourProgressLabel,
} from "../src/lib/shell/onboarding-tour.ts";

function memoryStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => {
      map.set(key, String(value));
    },
    removeItem: (key) => {
      map.delete(key);
    },
    _map: map,
  };
}

describe("onboarding-tour", () => {
  it("defines home → Mostrador (caja) → Hub Taller → Nueva OT", () => {
    assert.equal(TOUR_STEPS[0].id, "home-ops");
    assert.equal(TOUR_STEPS.at(-1).id, "workshop-new");
    assert.equal(TOUR_STEPS.length, 9);
    assert.ok(TOUR_STEPS.some((s) => s.path === "/pos"));
    assert.ok(TOUR_STEPS.some((s) => s.path === "/caja"));
    assert.ok(TOUR_STEPS.some((s) => s.path === "/hubs/workshop"));
    assert.ok(TOUR_STEPS.some((s) => s.path === "/lists/workshop/orders/new"));
    const rail = TOUR_STEPS.find((s) => s.id === "home-rail");
    assert.equal(rail?.target, "rail-pos");
    assert.equal(rail?.navigateTo, "/pos");
    const gate = TOUR_STEPS.find((s) => s.id === "pos-caja-gate");
    assert.equal(gate?.target, "pos-caja-closed");
    assert.equal(gate?.navigateTo, "/caja");
    const caja = TOUR_STEPS.find((s) => s.id === "caja-open");
    assert.equal(caja?.target, "caja-tour");
    assert.equal(caja?.navigateTo, "/pos");
    assert.equal(caja?.tipPlacement, "corner");
    const cobrar = TOUR_STEPS.find((s) => s.id === "pos-cobrar");
    assert.equal(cobrar?.navigateTo, "/hubs/workshop");
    const hub = TOUR_STEPS.find((s) => s.id === "workshop-hub");
    assert.equal(hub?.target, "hub-card");
    assert.equal(hub?.navigateTo, "/lists/workshop/orders/new");
    const neu = TOUR_STEPS.find((s) => s.id === "workshop-new");
    assert.equal(neu?.target, "workshop-create");
  });

  it("matches paths for home and pos", () => {
    const home = TOUR_STEPS.find((s) => s.id === "home-ops");
    const pos = TOUR_STEPS.find((s) => s.id === "pos-ticket");
    assert.equal(pathMatchesStep("/", home), true);
    assert.equal(pathMatchesStep("/pos", pos), true);
    assert.equal(pathMatchesStep("/lists/sales/customers", home), false);
  });

  it("respects done and session skip flags", () => {
    const local = memoryStorage();
    const session = memoryStorage();
    assert.equal(shouldAutoStart(local, session), true);
    markTourDone(local);
    assert.equal(shouldAutoStart(local, session), false);
    local.removeItem(TOUR_DONE_KEY);
    markTourSkippedSession(session);
    assert.equal(shouldAutoStart(local, session), false);
    assert.equal(session.getItem(TOUR_SKIP_SESSION_KEY), "1");
  });

  it("resolves first available step on home", () => {
    const local = memoryStorage();
    const step = resolveInitialStep("/", local, (t) => t === "ops-strip");
    assert.equal(step?.id, "home-ops");
  });

  it("skips missing targets on the same path", () => {
    const local = memoryStorage();
    const step = resolveInitialStep(
      "/",
      local,
      (t) => t === "home-tile" || t === "rail-pos"
    );
    assert.equal(step?.id, "home-tile");
  });

  it("resumes stored step when path and target match", () => {
    const local = memoryStorage({ [TOUR_STEP_KEY]: "pos-ticket" });
    const step = resolveInitialStep(
      "/pos",
      local,
      (t) => t === "pos-ticket"
    );
    assert.equal(step?.id, "pos-ticket");
  });

  it("advances to navigate when step has navigateTo", () => {
    const rail = TOUR_STEPS.find((s) => s.id === "home-rail");
    const result = advanceTour(rail, "/", () => true);
    assert.equal(result.kind, "navigate");
    assert.equal(result.href, "/pos");
    assert.equal(result.nextStepId, "pos-caja-gate");
  });

  it("on /pos with caja closed shows gate; with caja open skips to ticket", () => {
    const localClosed = memoryStorage({ [TOUR_STEP_KEY]: "pos-caja-gate" });
    const closed = resolveInitialStep(
      "/pos",
      localClosed,
      (t) => t === "pos-caja-closed"
    );
    assert.equal(closed?.id, "pos-caja-gate");

    const localOpen = memoryStorage({ [TOUR_STEP_KEY]: "pos-caja-gate" });
    const open = resolveInitialStep(
      "/pos",
      localOpen,
      (t) => t === "pos-ticket" || t === "pos-checkout"
    );
    assert.equal(open?.id, "pos-ticket");
  });

  it("blocks leaving caja-open while the open form is still on screen", () => {
    assert.equal(
      canLeaveCajaOpenStep({ cajaFormPresent: true }),
      false
    );
    assert.equal(
      canLeaveCajaOpenStep({ cajaFormPresent: false }),
      true
    );
  });

  it("gate → caja → pos ticket when caja was closed", () => {
    const gate = TOUR_STEPS.find((s) => s.id === "pos-caja-gate");
    const toCaja = advanceTour(gate, "/pos", () => true);
    assert.equal(toCaja.kind, "navigate");
    assert.equal(toCaja.href, "/caja");
    assert.equal(toCaja.nextStepId, "caja-open");

    const caja = TOUR_STEPS.find((s) => s.id === "caja-open");
    const toPos = advanceTour(caja, "/caja", () => true);
    assert.equal(toPos.kind, "navigate");
    assert.equal(toPos.href, "/pos");
    assert.equal(toPos.nextStepId, "pos-ticket");
  });

  it("recovers to caja gate when stored ticket but only closed target exists", () => {
    const local = memoryStorage({ [TOUR_STEP_KEY]: "pos-ticket" });
    const step = resolveInitialStep(
      "/pos",
      local,
      (t) => t === "pos-caja-closed"
    );
    assert.equal(step?.id, "pos-caja-gate");
  });

  it("advances within pos then navigates to Taller hub", () => {
    const ticket = TOUR_STEPS.find((s) => s.id === "pos-ticket");
    const next = advanceTour(ticket, "/pos", (t) => t === "pos-checkout");
    assert.equal(next.kind, "step");
    assert.equal(next.step.id, "pos-cobrar");
    const toHub = advanceTour(next.step, "/pos", () => true);
    assert.equal(toHub.kind, "navigate");
    assert.equal(toHub.href, "/hubs/workshop");
    assert.equal(toHub.nextStepId, "workshop-hub");
  });

  it("advances hub Taller → Nueva OT and finishes", () => {
    const hub = TOUR_STEPS.find((s) => s.id === "workshop-hub");
    const toNew = advanceTour(hub, "/hubs/workshop", () => true);
    assert.equal(toNew.kind, "navigate");
    assert.equal(toNew.href, "/lists/workshop/orders/new");
    assert.equal(toNew.nextStepId, "workshop-new");
    const neu = TOUR_STEPS.find((s) => s.id === "workshop-new");
    const done = advanceTour(neu, "/lists/workshop/orders/new", () => true);
    assert.equal(done.kind, "done");
  });

  it("clears step when marking done", () => {
    const local = memoryStorage({ [TOUR_STEP_KEY]: "home-ops" });
    markTourDone(local);
    assert.equal(local.getItem(TOUR_DONE_KEY), "1");
    assert.equal(local.getItem(TOUR_STEP_KEY), null);
    clearTourStep(local);
    assert.equal(local.getItem(TOUR_STEP_KEY), null);
  });

  it("builds progress label in Spanish", () => {
    assert.equal(tourProgressLabel("home-ops"), "Paso 1 de 9");
    assert.equal(tourProgressLabel("pos-cobrar"), "Paso 7 de 9");
    assert.equal(tourProgressLabel("workshop-new"), "Paso 9 de 9");
  });

  it("keeps tip inside viewport when hole is near the bottom (pos-cobrar)", () => {
    const pos = clampTourTipPosition({
      holeTop: 660,
      holeLeft: 24,
      holeWidth: 550,
      holeHeight: 52,
      tipWidth: 352,
      tipHeight: 220,
      viewportWidth: 615,
      viewportHeight: 714,
    });
    assert.ok(pos.top >= 8);
    assert.ok(pos.top + 220 <= 714 - 8);
    assert.ok(pos.left >= 8);
    assert.ok(pos.left + 352 <= 615 - 8);
  });

  it("places tip below the hole when there is room", () => {
    const pos = clampTourTipPosition({
      holeTop: 80,
      holeLeft: 40,
      holeWidth: 200,
      holeHeight: 40,
      tipWidth: 320,
      tipHeight: 180,
      viewportWidth: 800,
      viewportHeight: 700,
    });
    assert.equal(pos.top, 80 + 40 + 12);
    assert.equal(pos.left, 40);
  });

  it("docks interactive tip to the top-right corner", () => {
    const pos = dockTourTipCorner({
      tipWidth: 352,
      tipHeight: 180,
      viewportWidth: 800,
      viewportHeight: 700,
    });
    assert.equal(pos.top, 8);
    assert.equal(pos.left, 800 - 352 - 8);
  });

  it("docks interactive tip to the bottom on narrow viewports", () => {
    const pos = dockTourTipCorner({
      tipWidth: 300,
      tipHeight: 160,
      viewportWidth: 390,
      viewportHeight: 700,
    });
    assert.equal(pos.top, 700 - 160 - 8);
    assert.equal(pos.left, 8);
  });
});
