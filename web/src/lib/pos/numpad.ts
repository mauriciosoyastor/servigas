/**
 * Pure numpad state for Astro POS caja.
 */

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
  const n = Number(state.buffer);
  return Number.isFinite(n) ? n : null;
}
