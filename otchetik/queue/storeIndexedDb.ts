import type { LocalStatus } from '../lib/status';
import { EMPTY_COUNTS, type QueueStore, type ShotRecord } from './types';
import { orderForSending, orderNewestFirst } from './order';

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
    return new Promise<void>((resolve, reject) => {
      if (!this.db) throw new Error('IndexedDbStore: init() не вызван');
      const tx = this.db.transaction('shots', 'readwrite');
      const store = tx.objectStore('shots');
      const getReq = store.get(r.local_uuid);
      let finished = false;

      getReq.onsuccess = () => {
        const existing = getReq.result;
        if (!existing) {
          const addReq = store.add({ retake_of: null, ...r });
          addReq.onerror = () => {
            // Swallow ConstraintError: another concurrent add succeeded first
            if (addReq.error?.name !== 'ConstraintError') {
              finished = true;
              reject(addReq.error);
            }
          };
        }
      };

      getReq.onerror = () => {
        finished = true;
        reject(getReq.error);
      };

      tx.oncomplete = () => {
        if (!finished) {
          finished = true;
          resolve();
        }
      };

      tx.onerror = () => {
        if (!finished) {
          finished = true;
          reject(tx.error);
        }
      };
    });
  }
  async get(uuid: string) { return ((await req(this.tx('shots', 'readonly').get(uuid))) as ShotRecord | undefined) ?? null; }
  private async all(): Promise<ShotRecord[]> { return (await req(this.tx('shots', 'readonly').getAll())) as ShotRecord[]; }
  async list(status: LocalStatus) {
    return orderForSending(await this.all(), status);
  }
  async listAll(sinceIso?: string) {
    return orderNewestFirst(await this.all(), sinceIso);
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
