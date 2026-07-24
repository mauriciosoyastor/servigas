/** @odoo-module **/

/**
 * Onboarding host controller — playlist session + persist (ADR 0009/0010).
 * Pure: no DOM. Overlay mount is a separate boot module.
 */

import {
    clearOnboardingFlag,
    markAppDone,
    markFullDone,
    markPosDone,
} from "./sg_onboarding_persist.js";
import {
    createTourSession,
    listChapters,
    listTourSteps,
    skipTour,
} from "./sg_onboarding_tour.js";

function persistDone(storage, playlist, track) {
    if (playlist === "full") {
        markFullDone(storage);
        return;
    }
    if (track === "pos") {
        markPosDone(storage);
        return;
    }
    markAppDone(storage);
}

function clearFlagForPlaylist(storage, playlist) {
    if (playlist === "full") {
        clearOnboardingFlag(storage, "full");
        return;
    }
    clearOnboardingFlag(storage, "app");
}

/**
 * @param {{ storage?: Storage }} opts
 */
export function createHostController({ storage } = {}) {
    let session = null;

    function getActivePlaylist() {
        return session && !session.done ? session.playlist : null;
    }

    function getSession() {
        return session;
    }

    function startPlaylist(playlist, { track = "app" } = {}) {
        if (playlist !== "quick" && playlist !== "full") {
            return { ok: false, reason: "unknown_playlist" };
        }
        session = createTourSession({
            playlist,
            track: playlist === "full" ? "app" : track,
        });
        return { ok: true, session };
    }

    function skipActive() {
        if (!session) {
            return { ok: false };
        }
        const playlist = session.playlist;
        const track = session.track;
        skipTour(session);
        persistDone(storage, playlist, track);
        session = null;
        return { ok: true };
    }

    function completeActive() {
        if (!session) {
            return { ok: false };
        }
        const playlist = session.playlist;
        const track = session.track;
        persistDone(storage, playlist, track);
        session = null;
        return { ok: true };
    }

    function stopActive() {
        session = null;
        return { ok: true };
    }

    function replay(playlist, opts) {
        clearFlagForPlaylist(storage, playlist);
        return startPlaylist(playlist, opts);
    }

    function chaptersForActive() {
        const playlist = getActivePlaylist();
        if (!playlist) {
            return [];
        }
        return listChapters(playlist);
    }

    function stepsForActive() {
        const playlist = getActivePlaylist();
        if (!playlist) {
            return [];
        }
        if (playlist === "quick") {
            return listTourSteps({
                playlist: "quick",
                track: session.track,
            });
        }
        return listTourSteps({ playlist: "full" });
    }

    return {
        getActivePlaylist,
        getSession,
        startPlaylist,
        skipActive,
        completeActive,
        stopActive,
        replay,
        chaptersForActive,
        stepsForActive,
    };
}
