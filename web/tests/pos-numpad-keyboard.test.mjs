import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isEditableKeyboardTarget,
  mapKeyboardToNumpad,
} from "../src/lib/pos/numpad-keyboard.ts";

describe("mapKeyboardToNumpad", () => {
  it("maps top-row and numpad digits", () => {
    assert.deepEqual(mapKeyboardToNumpad({ key: "7", code: "Digit7" }), {
      type: "digit",
      digit: "7",
    });
    assert.deepEqual(mapKeyboardToNumpad({ key: "0", code: "Numpad0" }), {
      type: "digit",
      digit: "0",
    });
  });

  it("maps decimal from period and NumpadDecimal", () => {
    assert.deepEqual(mapKeyboardToNumpad({ key: ".", code: "Period" }), {
      type: "digit",
      digit: ".",
    });
    assert.deepEqual(mapKeyboardToNumpad({ key: ",", code: "NumpadDecimal" }), {
      type: "digit",
      digit: ".",
    });
  });

  it("maps Backspace, Enter, Escape, and F1–F4 modes", () => {
    assert.deepEqual(mapKeyboardToNumpad({ key: "Backspace", code: "Backspace" }), {
      type: "backspace",
    });
    assert.deepEqual(mapKeyboardToNumpad({ key: "Enter", code: "Enter" }), {
      type: "apply",
    });
    assert.deepEqual(mapKeyboardToNumpad({ key: "Enter", code: "NumpadEnter" }), {
      type: "apply",
    });
    assert.deepEqual(mapKeyboardToNumpad({ key: "Escape", code: "Escape" }), {
      type: "clear",
    });
    assert.deepEqual(mapKeyboardToNumpad({ key: "F1", code: "F1" }), {
      type: "mode",
      mode: "qty",
    });
    assert.deepEqual(mapKeyboardToNumpad({ key: "F2", code: "F2" }), {
      type: "mode",
      mode: "price",
    });
    assert.deepEqual(mapKeyboardToNumpad({ key: "F3", code: "F3" }), {
      type: "mode",
      mode: "discount",
    });
    assert.deepEqual(mapKeyboardToNumpad({ key: "F4", code: "F4" }), {
      type: "mode",
      mode: "order_discount",
    });
  });

  it("ignores unrelated keys", () => {
    assert.equal(mapKeyboardToNumpad({ key: "a", code: "KeyA" }), null);
    assert.equal(mapKeyboardToNumpad({ key: "F5", code: "F5" }), null);
    assert.equal(mapKeyboardToNumpad({ key: "+", code: "NumpadAdd" }), null);
  });
});

describe("isEditableKeyboardTarget", () => {
  it("detects form fields and contenteditable", () => {
    assert.equal(
      isEditableKeyboardTarget({ tagName: "INPUT", isContentEditable: false }),
      true
    );
    assert.equal(
      isEditableKeyboardTarget({
        tagName: "TEXTAREA",
        isContentEditable: false,
      }),
      true
    );
    assert.equal(
      isEditableKeyboardTarget({ tagName: "SELECT", isContentEditable: false }),
      true
    );
    assert.equal(
      isEditableKeyboardTarget({ tagName: "DIV", isContentEditable: true }),
      true
    );
    assert.equal(
      isEditableKeyboardTarget({ tagName: "BUTTON", isContentEditable: false }),
      false
    );
    assert.equal(isEditableKeyboardTarget(null), false);
  });
});
