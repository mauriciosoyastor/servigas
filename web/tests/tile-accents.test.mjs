import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  accentCssVar,
  accentForIndex,
  resolveAccentKey,
  TILE_ACCENT_CYCLE,
} from "../src/lib/shell/tile-accents.ts";

describe("tile-accents", () => {
  it("cycles flame/ember keys like the home launcher", () => {
    assert.equal(accentForIndex(0), "flame-yellow");
    assert.equal(accentForIndex(1), "flame-orange");
    assert.equal(accentForIndex(3), "flame-rust");
    assert.equal(accentForIndex(TILE_ACCENT_CYCLE.length), "flame-yellow");
  });

  it("keeps an explicit accent_key and falls back by index", () => {
    assert.equal(resolveAccentKey("ember-coral", 0), "ember-coral");
    assert.equal(resolveAccentKey("", 2), "flame-deep");
    assert.equal(resolveAccentKey(undefined, 1), "flame-orange");
    assert.equal(resolveAccentKey("not-a-real-key", 0), "flame-yellow");
  });

  it("maps keys to CSS variables", () => {
    assert.equal(accentCssVar("flame-yellow"), "var(--sg-flame-yellow)");
    assert.equal(accentCssVar("ember-wine"), "var(--sg-ember-wine)");
  });
});
