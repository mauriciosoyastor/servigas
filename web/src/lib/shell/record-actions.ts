/**
 * Allowlisted record actions (confirm, etc.) — no free-form method names from browser.
 */

import { getRecordListDef } from "./record-lists.ts";

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
    "purchase/rfq": {
      method: "button_confirm",
      confirmableStates: ["draft", "sent"],
    },
    "purchase/rfq-draft": {
      method: "button_confirm",
      confirmableStates: ["draft"],
    },
    "purchase/rfq-sent": {
      method: "button_confirm",
      confirmableStates: ["sent"],
    },
    "inventory/transfers": {
      method: "button_validate",
      confirmableStates: ["confirmed", "waiting", "assigned"],
    },
  };

export function getRecordActionDef(listKey: string): RecordActionDef | null {
  const cfg = ACTIONS[listKey];
  if (!cfg) return null;
  const list = getRecordListDef(listKey);
  if (!list) return null;
  return {
    listKey,
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
