import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    isPosEntryAction,
    isPosMenuReloadAction,
    resolveLauncherTileAction,
} from "../../src/js/services/sg_pos_entry.js";

describe("POS launcher entry (ADR 0004)", () => {
    it("does not open Mostrador via menu reload action", () => {
        const reload = {
            type: "ir.actions.client",
            tag: "reload",
            params: { menu_id: 42 },
        };
        const resolved = resolveLauncherTileAction({
            label: "Mostrador",
            action: reload,
        });

        assert.notDeepEqual(resolved, reload);
        assert.equal(isPosMenuReloadAction(resolved), false);
    });

    it("opens Mostrador via pos.config act_window", () => {
        const kanban = {
            type: "ir.actions.act_window",
            res_model: "pos.config",
            view_mode: "kanban,list,form",
            name: "Point of Sale",
        };
        const resolved = resolveLauncherTileAction({
            label: "Mostrador",
            action: kanban,
        });

        assert.equal(isPosEntryAction(resolved), true);
        assert.equal(resolved.res_model, "pos.config");
        assert.deepEqual(resolved, kanban);
    });
});
