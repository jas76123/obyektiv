import { MemoryStore } from './storeMemory';
import type { QueueStore } from './types';

let instance: MemoryStore | null = null;
export function getStore(): QueueStore {
  if (!instance) instance = new MemoryStore();
  return instance;
}
export function storeReady(): Promise<void> { return getStore().init(); }
