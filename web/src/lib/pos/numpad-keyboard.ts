/**
 * Physical keyboard → POS numpad actions (pure).
 */

import type { NumpadMode } from "./numpad.ts";

export type NumpadKeyboardAction =
  | { type: "digit"; digit: string }
  | { type: "backspace" }
  | { type: "apply" }
  | { type: "clear" }
  | { type: "mode"; mode: NumpadMode };

export type KeyboardLike = {
  key: string;
  code: string;
};

export type EditableTargetLike = {
  tagName?: string;
  isContentEditable?: boolean;
} | null;

const MODE_BY_FKEY: Record<string, NumpadMode> = {
  F1: "qty",
  F2: "price",
  F3: "discount",
  F4: "order_discount",
};

export function isEditableKeyboardTarget(
  target: EditableTargetLike | EventTarget | null | undefined
): boolean {
  if (!target || typeof target !== "object") return false;
  const el = target as EditableTargetLike & { isContentEditable?: boolean };
  if (el.isContentEditable) return true;
  const tag = String(el.tagName || "").toUpperCase();
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

export function mapKeyboardToNumpad(
  event: KeyboardLike
): NumpadKeyboardAction | null {
  const { key, code } = event;

  if (code === "NumpadDecimal" || key === ".") {
    return { type: "digit", digit: "." };
  }

  if (/^[0-9]$/.test(key)) {
    return { type: "digit", digit: key };
  }

  if (key === "Backspace") return { type: "backspace" };
  if (key === "Enter") return { type: "apply" };
  if (key === "Escape") return { type: "clear" };

  const mode = MODE_BY_FKEY[key];
  if (mode) return { type: "mode", mode };

  return null;
}
