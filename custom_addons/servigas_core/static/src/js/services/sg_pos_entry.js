/** @odoo-module **/

/** Fallback when POS tile still points at menu reload (ADR 0004). */
export const POS_CONFIG_KANBAN_ACTION = "point_of_sale.action_pos_config_kanban";

export function isPosLauncherTile(tile) {
    return Boolean(tile && tile.label === "Punto de venta");
}

export function isPosMenuReloadAction(action) {
    return Boolean(
        action &&
            action.type === "ir.actions.client" &&
            action.tag === "reload"
    );
}

export function isPosEntryAction(action) {
    return Boolean(
        action &&
            action.type === "ir.actions.act_window" &&
            action.res_model === "pos.config"
    );
}

/**
 * Resolve the action to run for a launcher / rail tile.
 * POS tiles must never use menu reload; fall back to config kanban.
 */
export function resolveLauncherTileAction(tile) {
    if (!tile) {
        return null;
    }
    if (!isPosLauncherTile(tile)) {
        return tile.action || null;
    }
    if (isPosEntryAction(tile.action)) {
        return tile.action;
    }
    return POS_CONFIG_KANBAN_ACTION;
}
