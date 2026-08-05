import {
  applyMoneyDigits,
  digitsFromAmount,
  formatArs,
  parseArs,
} from "./ars.ts";

export { formatArs, parseArs };

export function readMoneyInput(input: HTMLInputElement): number | null {
  if (!(input instanceof HTMLInputElement)) return null;
  const attr = input.dataset.moneyValue;
  if (attr !== undefined && attr !== "") {
    const n = Number(attr);
    return Number.isFinite(n) ? n : null;
  }
  const trimmed = input.value.trim();
  if (!trimmed) return null;
  return parseArs(trimmed);
}

export function setMoneyInput(
  input: HTMLInputElement,
  value: number | null | undefined
): void {
  if (!(input instanceof HTMLInputElement)) return;
  if (value == null || value === ("" as never) || !Number.isFinite(Number(value))) {
    input.value = "";
    input.dataset.moneyValue = "";
    input.dataset.moneyDigits = "";
    return;
  }
  const n = Number(value);
  const digits = digitsFromAmount(n);
  const applied = applyMoneyDigits(digits);
  input.dataset.moneyDigits = applied.digits;
  input.dataset.moneyValue = String(applied.value);
  input.value = applied.display;
}

function syncFromDigits(input: HTMLInputElement, digits: string): void {
  const applied = applyMoneyDigits(digits);
  input.dataset.moneyDigits = applied.digits;
  input.dataset.moneyValue = String(applied.value);
  input.value = applied.display;
}

function seedFromDom(input: HTMLInputElement): void {
  const raw = input.value.trim();
  if (!raw) {
    input.dataset.moneyValue = "";
    input.dataset.moneyDigits = "";
    return;
  }
  const parsed = parseArs(raw) ?? Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    input.value = "";
    input.dataset.moneyValue = "";
    input.dataset.moneyDigits = "";
    return;
  }
  setMoneyInput(input, parsed);
}

export function bindMoneyInput(input: HTMLInputElement): void {
  if (!(input instanceof HTMLInputElement)) return;
  if (input.dataset.moneyBound === "1") return;
  input.dataset.moneyBound = "1";
  input.type = "text";
  input.setAttribute("inputmode", "decimal");
  input.setAttribute("autocomplete", "off");

  seedFromDom(input);

  input.addEventListener("keydown", (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key >= "0" && event.key <= "9") {
      event.preventDefault();
      const next = `${input.dataset.moneyDigits || ""}${event.key}`.slice(0, 12);
      syncFromDigits(input, next);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      const cur = input.dataset.moneyDigits || "";
      syncFromDigits(input, cur.slice(0, -1));
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    if (event.key === "Delete") {
      event.preventDefault();
      syncFromDigits(input, "");
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    // Allow navigation / tab; block other printable that would break the mask
    if (event.key.length === 1) {
      event.preventDefault();
    }
  });

  input.addEventListener("paste", (event) => {
    event.preventDefault();
    const text = event.clipboardData?.getData("text") || "";
    const parsed = parseArs(text);
    if (parsed == null) return;
    setMoneyInput(input, parsed);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });

  // Playwright fill / programmatic value sets
  input.addEventListener("input", () => {
    if (input.dataset.moneySkipInput === "1") return;
    const raw = input.value.trim();
    if (!raw) {
      input.dataset.moneyDigits = "";
      input.dataset.moneyValue = "";
      return;
    }
    // Already formatted by our keydown path
    if (raw === formatArs(Number(input.dataset.moneyValue || NaN))) return;
    const parsed = parseArs(raw);
    if (parsed == null) return;
    input.dataset.moneySkipInput = "1";
    setMoneyInput(input, parsed);
    input.dataset.moneySkipInput = "0";
  });

  input.addEventListener("blur", () => {
    const value = readMoneyInput(input);
    if (value == null) {
      if (!input.required) {
        input.value = "";
        input.dataset.moneyValue = "";
        input.dataset.moneyDigits = "";
      }
      return;
    }
    setMoneyInput(input, value);
  });
}

export function bindMoneyInputs(root: ParentNode = document): void {
  root.querySelectorAll<HTMLInputElement>("[data-money-input]").forEach(bindMoneyInput);
}

declare global {
  interface Window {
    sgMoney?: {
      formatArs: typeof formatArs;
      parseArs: typeof parseArs;
      readMoneyInput: typeof readMoneyInput;
      setMoneyInput: typeof setMoneyInput;
      bindMoneyInputs: typeof bindMoneyInputs;
    };
  }
}

export function installMoneyGlobals(): void {
  window.sgMoney = {
    formatArs,
    parseArs,
    readMoneyInput,
    setMoneyInput,
    bindMoneyInputs,
  };
}
