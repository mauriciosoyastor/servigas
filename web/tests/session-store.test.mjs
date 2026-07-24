import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  FileSessionStore,
  MemorySessionStore,
  DEFAULT_SESSION_TTL_SECONDS,
  getSessionStore,
  resetSessionStoreCache,
} from "../src/lib/bff/session-store.ts";

const session = { uid: 2, name: "Admin", login: "admin" };

describe("MemorySessionStore TTL", () => {
  it("creates entries with expiresAt from TTL", () => {
    const store = new MemorySessionStore({ ttlSeconds: 60 });
    const before = Date.now();
    const sid = store.create("odoo-1", session);
    const entry = store.get(sid);
    assert.ok(entry);
    assert.equal(entry.odooSessionId, "odoo-1");
    assert.deepEqual(entry.session, session);
    assert.ok(entry.expiresAt >= before + 60_000 - 50);
    assert.ok(entry.expiresAt <= Date.now() + 60_000 + 50);
  });

  it("get returns undefined and purges expired sessions", () => {
    const store = new MemorySessionStore({ ttlSeconds: 1 });
    const sid = store.create("odoo-exp", session);
    // Access private map via get then force by creating with ttl 0 behavior:
    // recreate store entry by writing through a second create and mutating via file-less API:
    const entry = store.get(sid);
    assert.ok(entry);
    store.destroy(sid);
    const short = new MemorySessionStore({ ttlSeconds: 0 });
    // ttlSeconds 0 => expiresAt ~= now; allow 1ms skew by sleeping
    const sid2 = short.create("odoo-exp2", session);
    const past = Date.now() + 5;
    while (Date.now() <= past) {
      /* wait for expiry */
    }
    assert.equal(short.get(sid2), undefined);
  });

  it("exposes default TTL constant of 12 hours", () => {
    assert.equal(DEFAULT_SESSION_TTL_SECONDS, 12 * 60 * 60);
  });

  it("updates session payload in place", () => {
    const store = new MemorySessionStore({ ttlSeconds: 60 });
    const sid = store.create("odoo-1", session);
    assert.equal(
      store.updateSession(sid, { uid: 2, name: "Admin", login: "nuevo" }),
      true
    );
    assert.deepEqual(store.get(sid)?.session, {
      uid: 2,
      name: "Admin",
      login: "nuevo",
    });
    assert.equal(store.updateSession("missing", session), false);
  });
});

describe("FileSessionStore", () => {
  /** @type {string} */
  let dir;

  before(() => {
    dir = mkdtempSync(join(tmpdir(), "sg-bff-sess-"));
  });

  after(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it("persists sessions across store instances", () => {
    const a = new FileSessionStore({ dir, ttlSeconds: 120 });
    const sid = a.create("odoo-file", session);

    const b = new FileSessionStore({ dir, ttlSeconds: 120 });
    const entry = b.get(sid);
    assert.ok(entry);
    assert.equal(entry.odooSessionId, "odoo-file");
    assert.deepEqual(entry.session, session);
    assert.ok(entry.expiresAt > Date.now());
  });

  it("destroy removes the session file", () => {
    const store = new FileSessionStore({ dir, ttlSeconds: 120 });
    const sid = store.create("odoo-del", session);
    store.destroy(sid);
    assert.equal(store.get(sid), undefined);
  });

  it("get purges expired file sessions", () => {
    const store = new FileSessionStore({ dir, ttlSeconds: 120 });
    const sid = store.create("odoo-old", session);
    writeFileSync(
      join(dir, `${sid}.json`),
      JSON.stringify({
        odooSessionId: "odoo-old",
        session,
        expiresAt: Date.now() - 1000,
      })
    );
    assert.equal(store.get(sid), undefined);
  });
});

describe("getSessionStore factory", () => {
  it("defaults to MemorySessionStore under NODE_ENV=test", () => {
    resetSessionStoreCache();
    const prev = process.env.BFF_SESSION_STORE;
    delete process.env.BFF_SESSION_STORE;
    process.env.NODE_ENV = "test";
    const store = getSessionStore();
    assert.ok(store instanceof MemorySessionStore);
    resetSessionStoreCache();
    if (prev === undefined) delete process.env.BFF_SESSION_STORE;
    else process.env.BFF_SESSION_STORE = prev;
  });
});
