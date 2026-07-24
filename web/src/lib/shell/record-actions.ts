/**
 * Allowlisted record actions (confirm, etc.) — no free-form method names from browser.
 */

import { getRecordListDef, resolveRecordListKey } from "./record-lists.ts";

export type RecordActionDef = {
  listKey: string;
  model: string;
  method: string;
  confirmableStates: string[];
};

const ACTIONS: Record<string, { method: string; confirmableStates: string[] }> =
  {
    "sales/quotations": {
      method: "action_confirm",
      confirmableStates: ["draft", "sent"],
    },
    "purchase/solicitudes": {
      method: "button_confirm",
      confirmableStates: ["draft", "sent"],
    },
    "purchase/solicitudes-borrador": {
      method: "button_confirm",
      confirmableStates: ["draft"],
    },
    "purchase/solicitudes-enviadas": {
      method: "button_confirm",
      confirmableStates: ["sent"],
    },
    "inventory/transfers": {
      method: "button_validate",
      confirmableStates: ["confirmed", "waiting", "assigned"],
    },
    "accounting/customer-invoices": {
      method: "action_post",
      confirmableStates: ["draft"],
    },
    "accounting/credit-notes": {
      method: "action_post",
      confirmableStates: ["draft"],
    },
    "accounting/vendor-bills": {
      method: "action_post",
      confirmableStates: ["draft"],
    },
    "accounting/drafts": {
      method: "action_post",
      confirmableStates: ["draft"],
    },
  };

function canonicalActionKey(listKey: string): string {
  return resolveRecordListKey(listKey) || listKey;
}

export function getRecordActionDef(listKey: string): RecordActionDef | null {
  const key = canonicalActionKey(listKey);
  const cfg = ACTIONS[key];
  if (!cfg) return null;
  const list = getRecordListDef(key);
  if (!list) return null;
  return {
    listKey: key,
    model: list.model,
    method: cfg.method,
    confirmableStates: [...cfg.confirmableStates],
  };
}

export function canConfirmRecord(listKey: string): boolean {
  return Boolean(getRecordActionDef(listKey));
}

export function isConfirmableState(
  listKey: string,
  state: string | null | undefined
): boolean {
  const def = getRecordActionDef(listKey);
  if (!def || !state) return false;
  return def.confirmableStates.includes(String(state));
}
