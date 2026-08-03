import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  confirmCategoryName,
  hardPurgeIds,
  hybridPurgeIds,
  summarizeHardPurgeResult,
  summarizePurgeResult,
} from "../src/lib/shell/product-purge.ts";

describe("confirmCategoryName", () => {
  it("accepts exact trimmed match case-insensitive", () => {
    assert.equal(confirmCategoryName("Filtros", "  filtros  "), true);
  });

  it("rejects mismatch", () => {
    assert.equal(confirmCategoryName("Filtros", "Mangueras"), false);
  });
});

describe("hybridPurgeIds", () => {
  it("unlinks when possible", async () => {
    const unlinked = [];
    const result = await hybridPurgeIds([1, 2], {
      unlink: async (id) => {
        unlinked.push(id);
      },
      archive: async () => {
        throw new Error("should not archive");
      },
    });
    assert.deepEqual(unlinked, [1, 2]);
    assert.deepEqual(result, { deleted: 2, archived: 0, errors: [] });
  });

  it("archives when unlink fails", async () => {
    const archived = [];
    const result = await hybridPurgeIds([5], {
      unlink: async () => {
        throw new Error("constraint");
      },
      archive: async (id) => {
        archived.push(id);
      },
    });
    assert.deepEqual(archived, [5]);
    assert.equal(result.deleted, 0);
    assert.equal(result.archived, 1);
    assert.equal(result.errors.length, 0);
  });

  it("records error when both fail", async () => {
    const result = await hybridPurgeIds([9], {
      unlink: async () => {
        throw new Error("no unlink");
      },
      archive: async () => {
        throw new Error("no archive");
      },
    });
    assert.equal(result.deleted, 0);
    assert.equal(result.archived, 0);
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0].id, 9);
  });
});

describe("hardPurgeIds", () => {
  it("unlinks when possible without archiving", async () => {
    const unlinked = [];
    const result = await hardPurgeIds([1, 2], async (id) => {
      unlinked.push(id);
    });
    assert.deepEqual(unlinked, [1, 2]);
    assert.deepEqual(result, { deleted: 2, archived: 0, errors: [] });
  });

  it("records error and never archives when unlink fails", async () => {
    const result = await hardPurgeIds([5, 6], async (id) => {
      if (id === 5) throw new Error("constraint");
    });
    assert.equal(result.deleted, 1);
    assert.equal(result.archived, 0);
    assert.equal(result.errors.length, 1);
    assert.equal(result.errors[0].id, 5);
  });
});

describe("summarizeHardPurgeResult", () => {
  it("omits archived count", () => {
    const text = summarizeHardPurgeResult({
      deleted: 3,
      archived: 0,
      errors: [{ id: 7, message: "x" }],
    });
    assert.match(text, /3 eliminados/);
    assert.match(text, /1 errores/);
    assert.ok(!/archivados/.test(text));
  });
});

describe("summarizePurgeResult", () => {
  it("builds spanish summary", () => {
    const text = summarizePurgeResult({
      deleted: 3,
      archived: 1,
      errors: [{ id: 7, message: "x" }],
    });
    assert.match(text, /3 eliminados/);
    assert.match(text, /1 archivados/);
    assert.match(text, /1 errores/);
  });
});
