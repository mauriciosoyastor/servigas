/** @odoo-module **/

import { registry } from "@web/core/registry";
import { SalesHub } from "./sales_hub";

registry.category("actions").add("servigas_sales_hub", SalesHub);
