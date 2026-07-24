import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    STORAGE_KEYS,
    clearOnboardingFlag,
    isAppDone,
    isFullDone,
    isPosDone,
    markAppDone,
    markFullDone,
    markPosDone,
    shouldAutoStartQuick,
} from "../../src/js/services/sg_onboarding_persist.js";

function memoryStorage(initial = {}) {
    const data = { ...initial };
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
        _data: data,
    };
}

describe("onboarding persist (ADR 0009)", () => {
    it("markFullDone also marks app_done but not pos_done", () => {
        const storage = memoryStorage();
        markFullDone(storage);
        assert.equal(isFullDone(storage), true);
        assert.equal(isAppDone(storage), true);
        assert.equal(isPosDone(storage), false);
        assert.equal(storage.getItem(STORAGE_KEYS.full), "1");
        assert.equal(storage.getItem(STORAGE_KEYS.app), "1");
        assert.equal(storage.getItem(STORAGE_KEYS.pos), null);
    });

    it("shouldAutoStartQuick only when app not done and desktop", () => {
        const storage = memoryStorage();
        assert.equal(
            shouldAutoStartQuick({ storage, isDesktop: true }),
            true
        );
        markAppDone(storage);
        assert.equal(
            shouldAutoStartQuick({ storage, isDesktop: true }),
            false
        );
        clearOnboardingFlag(storage, "app");
        assert.equal(
            shouldAutoStartQuick({ storage, isDesktop: false }),
            false
        );
    });

    it("clearOnboardingFlag enables Ver de nuevo per tour", () => {
        const storage = memoryStorage();
        markAppDone(storage);
        markPosDone(storage);
        markFullDone(storage);
        clearOnboardingFlag(storage, "full");
        assert.equal(isFullDone(storage), false);
        assert.equal(isAppDone(storage), true);
        clearOnboardingFlag(storage, "app");
        assert.equal(isAppDone(storage), false);
    });
});
