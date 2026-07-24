/**
 * PROTOTYPE — throwaway onboarding UI wired to sg_onboarding_tour.
 * Run from this folder: npx --yes serve -p 5179 .
 */
import {
    advanceTour,
    createTourSession,
    getCurrentStep,
    isTourComplete,
    skipTour,
} from "../../src/js/services/sg_onboarding_tour.js";

const main = document.getElementById("main");
const coach = document.getElementById("coach");

let session = createTourSession({ track: "app" });
let offerPos = false;

function clearHot() {
    document.querySelectorAll(".hot").forEach((el) => el.classList.remove("hot"));
}

function highlight(targetHint) {
    clearHot();
    if (!targetHint) {
        return;
    }
    const byHint = document.querySelector(`[data-hint="${CSS.escape(targetHint)}"]`);
    if (byHint) {
        byHint.classList.add("hot");
        return;
    }
    if (targetHint.startsWith(".")) {
        document.querySelector(targetHint)?.classList.add("hot");
    }
}

function renderShell(step) {
    if (session.track === "app") {
        main.innerHTML = `
          <div class="tiles" data-hint=".sg-launcher-shell--root">
            <div class="tile" data-hint=".sg-launcher-shell--hub">Ventas</div>
            <div class="tile">Inventario</div>
            <div class="tile" data-hint="tile.punto_de_venta">Punto de venta</div>
            <div class="tile" data-hint="hub.kpi_card">KPI / card</div>
            <div class="tile">Compras</div>
            <div class="tile">Facturación</div>
          </div>`;
        if (step?.id === "app.hub" || step?.id === "app.kpi") {
            main.querySelector(".tiles")?.setAttribute(
                "data-hint",
                ".sg-launcher-shell--hub"
            );
        }
    } else {
        main.innerHTML = `
          <div class="tiles">
            <div class="tile" data-hint="search-command">Buscar código</div>
            <div class="tile" data-hint="category-pills">Categorías</div>
            <div class="tile" data-hint="ticket-pane">Ticket</div>
            <div class="tile" data-hint="discount-control">Descuento</div>
            <div class="tile" data-hint="pay-cta">Cobrar</div>
            <div class="tile" data-hint="pos.payment">Pago</div>
            <div class="tile" data-hint="pos.receipt">Recibo</div>
            <div class="tile" data-hint="pos.close_session">Cerrar sesión</div>
          </div>`;
    }
    highlight(step?.targetHint);
}

function bind(id, handler) {
    document.getElementById(id)?.addEventListener("click", handler);
}

function renderCoach(step) {
    if (offerPos) {
        coach.innerHTML = `
          <div class="label">Track 1 completo</div>
          <h1>¿Seguimos al Mostrador?</h1>
          <p>Track 2 enseña buscar, ticket, descuento, cobrar, pago y cierre.</p>
          <div class="actions">
            <button class="primary" id="go-pos">Sí, Mostrador</button>
            <button class="ghost" id="end-app">Cerrar</button>
          </div>`;
        bind("go-pos", () => {
            session = createTourSession({ track: "pos" });
            offerPos = false;
            paint();
        });
        bind("end-app", () => {
            offerPos = false;
            paint();
        });
        return;
    }

    if (isTourComplete(session)) {
        coach.innerHTML = `
          <div class="done">
            <h1>Listo</h1>
            <p>Tour de este track terminado (prototype).</p>
            <div class="actions">
              <button class="primary" id="restart-app">Reiniciar App</button>
              <button class="ghost" id="restart-pos">Reiniciar POS</button>
            </div>
          </div>`;
        bind("restart-app", () => {
            session = createTourSession({ track: "app" });
            offerPos = false;
            paint();
        });
        bind("restart-pos", () => {
            session = createTourSession({ track: "pos" });
            offerPos = false;
            paint();
        });
        clearHot();
        return;
    }

    const phase = step.phase ? ` · fase ${step.phase}` : "";
    const primary = step.requireAction
        ? `<button class="primary" id="sim">Simular</button>`
        : `<button class="primary" id="next">Siguiente</button>`;

    coach.innerHTML = `
      <div class="label">${step.track}${phase} · ${step.id}</div>
      <h1>${step.title}</h1>
      <p>${step.body}</p>
      <div class="actions">
        ${primary}
        <button class="ghost" id="skip">Saltar tour</button>
      </div>`;

    bind("next", () => {
        if (step.id === "app.pos_entry") {
            skipTour(session);
            offerPos = true;
            paint();
            return;
        }
        advanceTour(session);
        paint();
    });
    bind("sim", () => {
        advanceTour(session, { simulated: true });
        paint();
    });
    bind("skip", () => {
        skipTour(session);
        offerPos = false;
        paint();
    });
}

function paint() {
    const step = getCurrentStep(session);
    renderShell(step);
    renderCoach(step);
}

paint();
