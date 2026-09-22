import { describe, expect, it } from 'vitest';
import { MemoryStore } from '../queue/storeMemory';
import { newRecord, type ShotRecord } from '../queue/types';
import { RETRY_DELAYS_MS, nextDelay, runQueue } from '../queue/uploader';

function rec(uuid: string) {
  return newRecord({ local_uuid: uuid, task_id: 't1', work_name: 'Двери', zone: 'Зона 2', taken_at: '2026-09-22T10:00:00+03:00', geo: null, file_path: uuid });
}

describe('nextDelay', () => {
  it('grows 5s, 15s, 45s then 120s', () => {
    expect(nextDelay(1)).toBe(5000);
    expect(nextDelay(2)).toBe(15000);
    expect(nextDelay(3)).toBe(45000);
    expect(nextDelay(4)).toBe(120000);
    expect(nextDelay(9)).toBe(120000);
    expect(RETRY_DELAYS_MS).toEqual([5000, 15000, 45000]);
  });
});

describe('runQueue', () => {
  it('sends queued in order and marks uploaded with server_id', async () => {
    const store = new MemoryStore();
    await store.add(rec('a'));
    await store.add(rec('b'));
    const sent: string[] = [];
    const r = await runQueue({ store, upload: async (s) => { sent.push(s.local_uuid); return { server_id: 'srv-' + s.local_uuid }; }, now: () => 1000 });
    expect(r).toEqual({ sent: 2, failed: 0, skipped: false });
    expect(sent).toEqual(['a', 'b']);
    expect((await store.get('a'))?.status).toBe('uploaded');
    expect((await store.get('a'))?.server_id).toBe('srv-a');
  });

  it('marks failed with delay and keeps the record', async () => {
    const store = new MemoryStore();
    await store.add(rec('a'));
    const r = await runQueue({ store, upload: async () => { throw new Error('HTTP 500'); }, now: () => 1000 });
    expect(r.failed).toBe(1);
    const a = (await store.get('a'))!;
    expect(a.status).toBe('failed');
    expect(a.attempts).toBe(1);
    expect(a.last_error).toBe('HTTP 500');
    expect(a.next_attempt_at).toBe(1000 + 5000);
  });

  it('retries failed only when its time has come', async () => {
    const store = new MemoryStore();
    await store.add({ ...rec('a'), status: 'failed', attempts: 1, next_attempt_at: 5000 });
    let calls = 0;
    const upload = async () => { calls++; return { server_id: 's' }; };
    await runQueue({ store, upload, now: () => 4000 });
    expect(calls).toBe(0);
    await runQueue({ store, upload, now: () => 6000 });
    expect(calls).toBe(1);
    expect((await store.get('a'))?.status).toBe('uploaded');
  });

  it('same uuid sent twice is not duplicated in store', async () => {
    const store = new MemoryStore();
    await store.add(rec('a'));
    await store.add(rec('a'));
    const r = await runQueue({ store, upload: async () => ({ server_id: 's' }), now: () => 0 });
    expect(r.sent).toBe(1);
  });

  it('second concurrent run is skipped by the lock', async () => {
    const store = new MemoryStore();
    await store.add(rec('a'));
    let release!: () => void;
    const gate = new Promise<void>((res) => { release = res; });
    const slow = async (_s: ShotRecord) => { await gate; return { server_id: 's' }; };
    const first = runQueue({ store, upload: slow, now: () => 0 });
    const second = await runQueue({ store, upload: slow, now: () => 0 });
    expect(second.skipped).toBe(true);
    release();
    expect((await first).sent).toBe(1);
  });
});
