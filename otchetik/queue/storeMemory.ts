import type { LocalStatus } from '../lib/status';
import { EMPTY_COUNTS, type QueueStore, type ShotRecord } from './types';
import { orderForSending, orderNewestFirst } from './order';

export class MemoryStore implements QueueStore {
  private rows = new Map<string, ShotRecord>();
  async init() {}
  async add(r: ShotRecord) { if (!this.rows.has(r.local_uuid)) this.rows.set(r.local_uuid, { retake_of: null, ...r }); }
  async get(uuid: string) { return this.rows.get(uuid) ?? null; }
  async list(status: LocalStatus) {
    return orderForSending([...this.rows.values()], status);
  }
  async listAll(sinceIso?: string) {
    return orderNewestFirst([...this.rows.values()], sinceIso);
  }
  async update(uuid: string, patch: Partial<ShotRecord>) {
    const cur = this.rows.get(uuid);
    if (cur) this.rows.set(uuid, { ...cur, ...patch });
  }
  async remove(uuid: string) { this.rows.delete(uuid); }
  async countByStatus() {
    const c = { ...EMPTY_COUNTS };
    for (const r of this.rows.values()) c[r.status]++;
    return c;
  }
}
