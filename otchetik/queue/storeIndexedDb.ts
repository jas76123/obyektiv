import type { LocalStatus } from '../lib/status';
import { EMPTY_COUNTS, type QueueStore, type ShotRecord } from './types';

function req<T>(r: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
}

export class IndexedDbStore implements QueueStore {
  private db: IDBDatabase | null = null;
  constructor(private name = 'otchetik') {}

  async init() {
    const open = indexedDB.open(this.name, 1);
    open.onupgradeneeded = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains('shots')) db.createObjectStore('shots', { keyPath: 'local_uuid' });
      if (!db.objectStoreNames.contains('files')) db.createObjectStore('files');
    };
    this.db = await req(open);
  }

  private tx(store: 'shots' | 'files', mode: IDBTransactionMode) {
    if (!this.db) throw new Error('IndexedDbStore: init() не вызван');
    return this.db.transaction(store, mode).objectStore(store);
  }

  async add(r: ShotRecord) {
    const existing = await req(this.tx('shots', 'readonly').get(r.local_uuid));
    if (!existing) await req(this.tx('shots', 'readwrite').add({ retake_of: null, ...r }));
  }
  async get(uuid: string) { return ((await req(this.tx('shots', 'readonly').get(uuid))) as ShotRecord | undefined) ?? null; }
  private async all(): Promise<ShotRecord[]> { return (await req(this.tx('shots', 'readonly').getAll())) as ShotRecord[]; }
  async list(status: LocalStatus) {
    return (await this.all()).filter((r) => r.status === status).sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
  async listAll(sinceIso?: string) {
    return (await this.all()).filter((r) => !sinceIso || r.taken_at >= sinceIso).sort((a, b) => b.taken_at.localeCompare(a.taken_at));
  }
  async update(uuid: string, patch: Partial<ShotRecord>) {
    const cur = await this.get(uuid);
    if (cur) await req(this.tx('shots', 'readwrite').put({ ...cur, ...patch }));
  }
  async remove(uuid: string) {
    await req(this.tx('shots', 'readwrite').delete(uuid));
    await req(this.tx('files', 'readwrite').delete(uuid));
  }
  async countByStatus() {
    const c = { ...EMPTY_COUNTS };
    for (const r of await this.all()) c[r.status]++;
    return c;
  }

  async putBlob(uuid: string, blob: Blob) { await req(this.tx('files', 'readwrite').put(blob, uuid)); }
  async getBlob(uuid: string): Promise<Blob | null> { return ((await req(this.tx('files', 'readonly').get(uuid))) as Blob | undefined) ?? null; }
}
