import { randomUUID } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import type { SessionInfo } from "./types.ts";

export const BFF_COOKIE = "sg_bff_sid";
export const DEFAULT_SESSION_TTL_SECONDS = 12 * 60 * 60;

export type SessionEntry = {
  odooSessionId: string;
  session: SessionInfo;
  expiresAt: number;
};

export type SessionStore = {
  create(odooSessionId: string, session: SessionInfo): string;
  get(bffSid: string): SessionEntry | undefined;
  destroy(bffSid: string): void;
};

export type SessionStoreOptions = {
  ttlSeconds?: number;
};

function resolveTtl(ttlSeconds?: number): number {
  if (ttlSeconds !== undefined && Number.isFinite(ttlSeconds) && ttlSeconds >= 0) {
    return ttlSeconds;
  }
  return DEFAULT_SESSION_TTL_SECONDS;
}

function isExpired(entry: SessionEntry): boolean {
  return entry.expiresAt <= Date.now();
}

export class MemorySessionStore implements SessionStore {
  #map = new Map<string, SessionEntry>();
  #ttlSeconds: number;

  constructor(options: SessionStoreOptions = {}) {
    this.#ttlSeconds = resolveTtl(options.ttlSeconds);
  }

  create(odooSessionId: string, session: SessionInfo): string {
    const sid = randomUUID();
    this.#map.set(sid, {
      odooSessionId,
      session,
      expiresAt: Date.now() + this.#ttlSeconds * 1000,
    });
    return sid;
  }

  get(bffSid: string): SessionEntry | undefined {
    const entry = this.#map.get(bffSid);
    if (!entry) return undefined;
    if (isExpired(entry)) {
      this.#map.delete(bffSid);
      return undefined;
    }
    return entry;
  }

  destroy(bffSid: string): void {
    this.#map.delete(bffSid);
  }
}

export type FileSessionStoreOptions = SessionStoreOptions & {
  dir: string;
};

export class FileSessionStore implements SessionStore {
  #dir: string;
  #ttlSeconds: number;

  constructor(options: FileSessionStoreOptions) {
    this.#dir = options.dir;
    this.#ttlSeconds = resolveTtl(options.ttlSeconds);
    mkdirSync(this.#dir, { recursive: true });
  }

  #path(bffSid: string): string {
    return join(this.#dir, `${bffSid}.json`);
  }

  create(odooSessionId: string, session: SessionInfo): string {
    const sid = randomUUID();
    const entry: SessionEntry = {
      odooSessionId,
      session,
      expiresAt: Date.now() + this.#ttlSeconds * 1000,
    };
    this.#write(sid, entry);
    return sid;
  }

  get(bffSid: string): SessionEntry | undefined {
    const path = this.#path(bffSid);
    if (!existsSync(path)) return undefined;
    try {
      const raw = readFileSync(path, "utf8");
      const entry = JSON.parse(raw) as SessionEntry;
      if (!entry?.odooSessionId || !entry?.session || !entry?.expiresAt) {
        this.destroy(bffSid);
        return undefined;
      }
      if (isExpired(entry)) {
        this.destroy(bffSid);
        return undefined;
      }
      return entry;
    } catch {
      this.destroy(bffSid);
      return undefined;
    }
  }

  destroy(bffSid: string): void {
    try {
      unlinkSync(this.#path(bffSid));
    } catch {
      // missing file is fine
    }
  }

  #write(bffSid: string, entry: SessionEntry): void {
    const path = this.#path(bffSid);
    const tmp = `${path}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(entry), "utf8");
    renameSync(tmp, path);
  }
}

export function getSessionTtlSeconds(): number {
  const raw = process.env.BFF_SESSION_TTL_SECONDS;
  if (raw) {
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return DEFAULT_SESSION_TTL_SECONDS;
}

function defaultSessionDir(): string {
  return process.env.BFF_SESSION_DIR || join(process.cwd(), ".data", "bff-sessions");
}

function resolveStoreKind(): "memory" | "file" {
  const raw = (process.env.BFF_SESSION_STORE || "").toLowerCase();
  if (raw === "file" || raw === "memory") return raw;
  if (process.env.NODE_ENV === "test") return "memory";
  return "file";
}

let cached: SessionStore | undefined;

export function getSessionStore(): SessionStore {
  if (!cached) {
    const ttlSeconds = getSessionTtlSeconds();
    cached = resolveStoreKind() === "file"
      ? new FileSessionStore({ dir: defaultSessionDir(), ttlSeconds })
      : new MemorySessionStore({ ttlSeconds });
  }
  return cached;
}

/** Reset factory cache (tests). */
export function resetSessionStoreCache(): void {
  cached = undefined;
}

export const sessionStore: SessionStore = {
  create(odooSessionId, session) {
    return getSessionStore().create(odooSessionId, session);
  },
  get(bffSid) {
    return getSessionStore().get(bffSid);
  },
  destroy(bffSid) {
    getSessionStore().destroy(bffSid);
  },
};
