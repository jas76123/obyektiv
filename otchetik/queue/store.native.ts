import { SqliteStore } from './storeSqlite';
import type { QueueStore } from './types';

let instance: SqliteStore | null = null;
let ready: Promise<void> | null = null;

export function getStore(): QueueStore {
  if (!instance) instance = new SqliteStore();
  return instance;
}
export function storeReady(): Promise<void> {
  if (!ready) ready = getStore().init();
  return ready;
}
