import { describe, expect, it } from 'vitest';
import { orderForSending, orderNewestFirst } from '../queue/order';
import type { ShotRecord } from '../queue/types';
import { newRecord } from '../queue/types';

function rec(uuid: string, status: 'queued' | 'uploading' | 'failed' | 'uploaded' = 'queued', taken = '2026-09-22T10:00:00+03:00'): ShotRecord {
  const r = newRecord({ local_uuid: uuid, task_id: 't1', work_name: 'Work', zone: 'Zone', taken_at: taken, geo: null, file_path: uuid });
  return { ...r, status };
}

describe('orderForSending', () => {
  it('filters by status and sorts by created_at ascending', () => {
    const r1 = rec('a', 'queued', '2026-09-22T10:00:00+03:00');
    const r2 = rec('b', 'queued', '2026-09-22T11:00:00+03:00');
    const r3 = rec('c', 'failed', '2026-09-22T09:00:00+03:00');

    // Set created_at manually to control order
    r1.created_at = '2026-09-22T10:00:00+03:00';
    r2.created_at = '2026-09-22T11:00:00+03:00';
    r3.created_at = '2026-09-22T09:00:00+03:00';

    const records = [r3, r1, r2]; // Out of order
    const result = orderForSending(records, 'queued');

    expect(result).toHaveLength(2);
    expect(result[0].local_uuid).toBe('a');
    expect(result[1].local_uuid).toBe('b');
  });

  it('returns empty array when no records match status', () => {
    const r1 = rec('a', 'queued');
    const r2 = rec('b', 'uploading');
    const records = [r1, r2];
    const result = orderForSending(records, 'failed');
    expect(result).toEqual([]);
  });
});

describe('orderNewestFirst', () => {
  it('sorts by taken_at descending (newest first)', () => {
    const r1 = rec('a', 'queued', '2026-09-20T10:00:00+03:00');
    const r2 = rec('b', 'queued', '2026-09-22T10:00:00+03:00');
    const r3 = rec('c', 'queued', '2026-09-21T10:00:00+03:00');

    const records = [r1, r2, r3];
    const result = orderNewestFirst(records);

    expect(result).toHaveLength(3);
    expect(result[0].local_uuid).toBe('b');
    expect(result[1].local_uuid).toBe('c');
    expect(result[2].local_uuid).toBe('a');
  });

  it('filters by taken_at >= since', () => {
    const r1 = rec('old', 'queued', '2026-09-10T10:00:00+03:00');
    const r2 = rec('recent', 'queued', '2026-09-22T10:00:00+03:00');

    const records = [r1, r2];
    const result = orderNewestFirst(records, '2026-09-15T00:00:00+03:00');

    expect(result).toHaveLength(1);
    expect(result[0].local_uuid).toBe('recent');
  });

  it('includes all records when since is undefined', () => {
    const r1 = rec('a', 'queued', '2026-09-10T10:00:00+03:00');
    const r2 = rec('b', 'queued', '2026-09-22T10:00:00+03:00');

    const records = [r1, r2];
    const result = orderNewestFirst(records, undefined);

    expect(result).toHaveLength(2);
  });
});
