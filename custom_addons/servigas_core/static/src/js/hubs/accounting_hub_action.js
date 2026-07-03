/** @odoo-module **/

import { registry } from "@web/core/registry";
import { AccountingHub } from "./accounting_hub";

registry.category("actions").add("servigas_accounting_hub", AccountingHub);
