import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  TOUR_DONE_KEY,
  TOUR_SKIP_SESSION_KEY,
  TOUR_STEP_KEY,
  TOUR_STEPS,
  advanceTour,
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
  it("defines the full home → hub → pos path", () => {
    assert.equal(TOUR_STEPS[0].id, "home-ops");
    assert.equal(TOUR_STEPS.at(-1).id, "pos-cobrar");
    assert.ok(TOUR_STEPS.some((s) => s.path.startsWith("/hubs")));
    assert.ok(TOUR_STEPS.some((s) => s.path === "/pos"));
  });

  it("matches paths for home, hubs and pos", () => {
    const home = TOUR_STEPS.find((s) => s.id === "home-ops");
    const hub = TOUR_STEPS.find((s) => s.id === "hub-card");
    const pos = TOUR_STEPS.find((s) => s.id === "pos-ticket");
    assert.equal(pathMatchesStep("/", home), true);
    assert.equal(pathMatchesStep("/hubs/inventory", hub), true);
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
      (t) => t === "home-tile" || t === "rail-inventory"
    );
    assert.equal(step?.id, "home-tile");
  });

  it("resumes stored step when path and target match", () => {
    const local = memoryStorage({ [TOUR_STEP_KEY]: "hub-card" });
    const step = resolveInitialStep(
      "/hubs/inventory",
      local,
      (t) => t === "hub-card"
    );
    assert.equal(step?.id, "hub-card");
  });

  it("advances to navigate when step has navigateTo", () => {
    const rail = TOUR_STEPS.find((s) => s.id === "home-rail");
    const result = advanceTour(rail, "/", () => true);
    assert.equal(result.kind, "navigate");
    assert.equal(result.href, "/hubs/inventory");
    assert.equal(result.nextStepId, "hub-card");
  });

  it("advances within pos and finishes on last step", () => {
    const ticket = TOUR_STEPS.find((s) => s.id === "pos-ticket");
    const next = advanceTour(ticket, "/pos", (t) => t === "pos-checkout");
    assert.equal(next.kind, "step");
    assert.equal(next.step.id, "pos-cobrar");
    const done = advanceTour(next.step, "/pos", () => true);
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
    assert.equal(tourProgressLabel("home-ops"), "Paso 1 de 7");
    assert.equal(tourProgressLabel("pos-cobrar"), "Paso 7 de 7");
  });
});
