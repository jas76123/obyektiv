import { describe, expect, it } from 'vitest';
import { ML_RESULTS_KEY, createMlResults, type KeyValue } from '../lib/mlResults';

function memoryKv(initial: Record<string, string> = {}): KeyValue & { data: Record<string, string> } {
  const data = { ...initial };
  return { data, async getItem(k) { return data[k] ?? null; }, async setItem(k, v) { data[k] = v; } };
}

describe('createMlResults', () => {
  it('пустой словарь, пока ничего не записано', async () => {
    const s = createMlResults(memoryKv());
    expect(await s.load()).toEqual({});
    expect(s.get('a')).toBeUndefined();
  });
  it('set сохраняет в хранилище и оповещает подписчиков', async () => {
    const kv = memoryKv();
    const s = createMlResults(kv);
    let calls = 0;
    const off = s.on(() => { calls++; });
    await s.set('a', { empty: true, count: 0, checked_at: '2026-09-25T10:00:00Z' });
    expect(s.get('a')?.empty).toBe(true);
    expect(JSON.parse(kv.data[ML_RESULTS_KEY]).a.count).toBe(0);
    expect(calls).toBe(1);
    off();
    await s.set('b', { empty: false, count: 2, checked_at: '2026-09-25T10:01:00Z', work_status: 'confirmed' });
    expect(calls).toBe(1);
    expect(JSON.parse(kv.data[ML_RESULTS_KEY]).b.work_status).toBe('confirmed');
  });
  it('verdicts: сверка → вердикт, без сверки — по детекциям; старые записи без work_status читаются', async () => {
    const s = createMlResults(memoryKv({ [ML_RESULTS_KEY]: JSON.stringify({
      old: { empty: true, count: 0, checked_at: 'x' },
      ok: { empty: false, count: 1, checked_at: 'x', work_status: 'confirmed' },
      bad: { empty: false, count: 1, checked_at: 'x', work_status: 'not_confirmed' },
      dunno: { empty: false, count: 1, checked_at: 'x', work_status: 'unsure' },
    }) }));
    expect(s.verdicts()).toEqual({});
    await s.load();
    expect(s.verdicts()).toEqual({ old: 'retake', ok: 'accepted', bad: 'retake', dunno: null });
  });
  it('load читает сохранённое ранее и переживает битый JSON', async () => {
    const good = createMlResults(memoryKv({ [ML_RESULTS_KEY]: JSON.stringify({ a: { empty: false, count: 1, checked_at: 'x' } }) }));
    expect((await good.load()).a.count).toBe(1);
    const bad = createMlResults(memoryKv({ [ML_RESULTS_KEY]: '{oops' }));
    expect(await bad.load()).toEqual({});
  });
});
