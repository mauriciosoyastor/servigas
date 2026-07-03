/** @odoo-module **/

import { registry } from "@web/core/registry";
import { InventoryHub } from "./inventory_hub";

registry.category("actions").add("servigas_inventory_hub", InventoryHub);
