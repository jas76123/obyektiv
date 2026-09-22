import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { IndexedDbStore } from '../queue/storeIndexedDb';
import { MemoryStore } from '../queue/storeMemory';
import { newRecord, type QueueStore } from '../queue/types';

function rec(uuid: string, taken = '2026-09-22T10:00:00+03:00') {
  return newRecord({ local_uuid: uuid, task_id: 't1', work_name: 'Установка дверей', zone: 'Зона 2', taken_at: taken, geo: null, file_path: uuid });
}

for (const [name, make] of [
  ['IndexedDbStore', () => new IndexedDbStore('test-' + Math.random())],
  ['MemoryStore', () => new MemoryStore()],
] as const) {
  describe(name, () => {
    let store: QueueStore;
    beforeEach(async () => { store = make(); await store.init(); });

    it('add, get, list by status', async () => {
      await store.add(rec('a'));
      await store.add(rec('b'));
      expect((await store.get('a'))?.status).toBe('queued');
      expect((await store.list('queued')).map((r) => r.local_uuid)).toEqual(['a', 'b']);
      expect(await store.list('failed')).toEqual([]);
    });

    it('update status and counts', async () => {
      await store.add(rec('a'));
      await store.update('a', { status: 'failed', attempts: 1, last_error: 'HTTP 500' });
      expect((await store.get('a'))?.last_error).toBe('HTTP 500');
      expect(await store.countByStatus()).toEqual({ queued: 0, uploading: 0, failed: 1, uploaded: 0 });
    });

    it('add with same uuid does not duplicate', async () => {
      await store.add(rec('a'));
      await store.add(rec('a'));
      expect((await store.listAll()).length).toBe(1);
    });

    it('listAll newest first and filters by since', async () => {
      await store.add(rec('old', '2026-09-10T10:00:00+03:00'));
      await store.add(rec('new', '2026-09-22T10:00:00+03:00'));
      expect((await store.listAll()).map((r) => r.local_uuid)).toEqual(['new', 'old']);
      expect((await store.listAll('2026-09-15T00:00:00+03:00')).map((r) => r.local_uuid)).toEqual(['new']);
    });

    it('remove', async () => {
      await store.add(rec('a'));
      await store.remove('a');
      expect(await store.get('a')).toBeNull();
    });

    it('retake_of round-trips through add/get', async () => {
      await store.add(rec('a'));
      const retake = { ...rec('b'), retake_of: 'a' };
      await store.add(retake);
      expect((await store.get('a'))?.retake_of).toBeFalsy();
      expect((await store.get('b'))?.retake_of).toBe('a');
    });

    it('countByStatus on empty store returns all zeros', async () => {
      expect(await store.countByStatus()).toEqual({ queued: 0, uploading: 0, failed: 0, uploaded: 0 });
    });
  });
}

describe('IndexedDbStore concurrency', () => {
  it('concurrent add with same uuid does not create duplicate and does not throw', async () => {
    const store = new IndexedDbStore('concurrent-' + Math.random());
    await store.init();

    const uuid = 'concurrent-test-uuid';
    const r1 = rec(uuid);
    const r2 = { ...rec(uuid), work_name: 'Different work name' };

    // Fire both adds concurrently
    const results = await Promise.allSettled([store.add(r1), store.add(r2)]);

    // Both should succeed
    expect(results.every((r) => r.status === 'fulfilled')).toBe(true);

    // Only one record should exist
    const all = await store.listAll();
    expect(all).toHaveLength(1);

    // It should be the first one that was added (not overwritten by second)
    expect(all[0].work_name).toBe(r1.work_name);
  });
});

describe('IndexedDbStore blobs', () => {
  it('stores and returns photo blob', async () => {
    const store = new IndexedDbStore('blob-' + Math.random());
    await store.init();
    await store.putBlob('a', new Blob(['jpeg'], { type: 'image/jpeg' }));
    const b = await store.getBlob('a');
    expect(b?.type).toBe('image/jpeg');
    expect(await store.getBlob('none')).toBeNull();
  });
});
