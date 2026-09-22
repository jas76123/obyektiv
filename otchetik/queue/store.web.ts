import { IndexedDbStore } from './storeIndexedDb';

let instance: IndexedDbStore | null = null;
let ready: Promise<void> | null = null;

export function getStore(): IndexedDbStore {
  if (!instance) instance = new IndexedDbStore('otchetik');
  return instance;
}
export function storeReady(): Promise<void> {
  if (!ready) ready = getStore().init();
  return ready;
}
