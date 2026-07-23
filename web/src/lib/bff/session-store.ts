import { randomUUID } from "node:crypto";
import type { SessionInfo } from "./types.ts";

type Entry = { odooSessionId: string; session: SessionInfo };

export class MemorySessionStore {
  #map = new Map<string, Entry>();

  create(odooSessionId: string, session: SessionInfo): string {
    const sid = randomUUID();
    this.#map.set(sid, { odooSessionId, session });
    return sid;
  }

  get(bffSid: string): Entry | undefined {
    return this.#map.get(bffSid);
  }

  destroy(bffSid: string): void {
    this.#map.delete(bffSid);
  }
}

export const sessionStore = new MemorySessionStore();
export const BFF_COOKIE = "sg_bff_sid";
