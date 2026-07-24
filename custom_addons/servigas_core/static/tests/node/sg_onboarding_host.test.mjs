import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    createHostController,
} from "../../src/js/services/sg_onboarding_host.js";

function memoryStorage() {
    const data = {};
    return {
        getItem(key) {
            return Object.prototype.hasOwnProperty.call(data, key)
                ? data[key]
                : null;
        },
        setItem(key, value) {
            data[key] = String(value);
        },
        removeItem(key) {
            delete data[key];
        },
    };
}

describe("onboarding host controller (ADR 0009/0010)", () => {
    it("startPlaylist is mutually exclusive and records active playlist", () => {
        const host = createHostController({ storage: memoryStorage() });
        assert.equal(host.getActivePlaylist(), null);

        const first = host.startPlaylist("quick");
        assert.equal(first.ok, true);
        assert.equal(host.getActivePlaylist(), "quick");
        assert.equal(host.getSession().playlist, "quick");

        const second = host.startPlaylist("full");
        assert.equal(second.ok, true);
        assert.equal(host.getActivePlaylist(), "full");
        assert.equal(host.getSession().playlist, "full");
    });

    it("skipActive marks persist flags for the playlist", () => {
        const storage = memoryStorage();
        const host = createHostController({ storage });
        host.startPlaylist("full");
        host.skipActive();
        assert.equal(host.getActivePlaylist(), null);
        assert.equal(storage.getItem("sg_onboarding_full_done"), "1");
        assert.equal(storage.getItem("sg_onboarding_app_done"), "1");
        assert.equal(storage.getItem("sg_onboarding_pos_done"), null);
    });

    it("replay clears flag then starts playlist", () => {
        const storage = memoryStorage();
        storage.setItem("sg_onboarding_app_done", "1");
        const host = createHostController({ storage });
        const result = host.replay("quick");
        assert.equal(result.ok, true);
        assert.equal(storage.getItem("sg_onboarding_app_done"), null);
        assert.equal(host.getActivePlaylist(), "quick");
    });

    it("completeActive marks app_done for quick playlist", () => {
        const storage = memoryStorage();
        const host = createHostController({ storage });
        host.startPlaylist("quick");
        host.completeActive();
        assert.equal(storage.getItem("sg_onboarding_app_done"), "1");
        assert.equal(host.getActivePlaylist(), null);
    });
});
