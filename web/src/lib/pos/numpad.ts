/**
 * Pure numpad state for Astro POS caja.
 * Price mode uses cents-from-the-right digit buffer (same as money inputs).
 */

import { applyMoneyDigits, formatArs } from "../money/ars.ts";

export type NumpadMode = "qty" | "price" | "discount" | "order_discount";

export type NumpadState = {
  mode: NumpadMode;
  buffer: string;
  selectedProductId: number | null;
};

export function emptyNumpad(): NumpadState {
  return { mode: "qty", buffer: "", selectedProductId: null };
}

export function selectLine(
  state: NumpadState,
  productId: number | null
): NumpadState {
  return {
    ...state,
    selectedProductId:
      productId != null && Number.isFinite(productId) ? productId : null,
    buffer: "",
  };
}

export function setNumpadMode(state: NumpadState, mode: NumpadMode): NumpadState {
  return { ...state, mode, buffer: "" };
}

export function pressDigit(state: NumpadState, digit: string): NumpadState {
  const d = String(digit);
  if (state.mode === "price") {
    if (!/^\d$/.test(d)) return state;
    const next = `${state.buffer}${d}`.replace(/\D/g, "").slice(0, 12);
    return { ...state, buffer: next };
  }
  if (!/^[0-9.]$/.test(d)) return state;
  if (d === "." && state.buffer.includes(".")) return state;
  if (state.buffer === "0" && d !== ".") {
    return { ...state, buffer: d };
  }
  return { ...state, buffer: state.buffer + d };
}

export function pressBackspace(state: NumpadState): NumpadState {
  return { ...state, buffer: state.buffer.slice(0, -1) };
}

export function bufferValue(state: NumpadState): number | null {
  if (!state.buffer || state.buffer === ".") return null;
  if (state.mode === "price") {
    return applyMoneyDigits(state.buffer).value;
  }
  const n = Number(state.buffer);
  return Number.isFinite(n) ? n : null;
}

/** Display label for the numpad buffer chrome. Empty → em dash. */
export function formatNumpadBuffer(state: NumpadState): string {
  if (!state.buffer) return "—";
  if (state.mode === "price") {
    return formatArs(applyMoneyDigits(state.buffer).value);
  }
  return state.buffer;
}
