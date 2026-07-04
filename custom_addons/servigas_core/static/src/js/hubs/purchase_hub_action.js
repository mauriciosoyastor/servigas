/** @odoo-module **/

import { registry } from "@web/core/registry";
import { PurchaseHub } from "./purchase_hub";

registry.category("actions").add("servigas_purchase_hub", PurchaseHub);
