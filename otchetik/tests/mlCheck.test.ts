import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMlResults, type KeyValue } from '../lib/mlResults';
import { ML_MIN_INTERVAL_MS, checkMlResults, resetMlCheckClock } from '../queue/mlCheck';
import { newRecord, type ShotRecord } from '../queue/types';

function memoryKv(): KeyValue { const d: Record<string, string> = {}; return { async getItem(k) { return d[k] ?? null; }, async setItem(k, v) { d[k] = v; } }; }
function uploaded(uuid: string, server_id: string | null = `srv-${uuid}`): ShotRecord {
  return { ...newRecord({ local_uuid: uuid, task_id: 't', work_name: 'Двери', zone: 'Зона 2', taken_at: '2026-09-25T10:00:00+03:00', geo: null, file_path: uuid }), status: 'uploaded', server_id };
}
// Параметры типизированы явно (но не используются) — иначе vi.fn выводит
// пустой кортеж аргументов и `mock.calls[0][0]` не проходит проверку типов.
function photosResponse(items: { id: string; detections: unknown[] }[]) {
  return vi.fn(async (_url?: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ total: items.length, photos: items }), { status: 200 }));
}

describe('checkMlResults', () => {
  let now = 1_000_000;
  beforeEach(() => { resetMlCheckClock(); now = 1_000_000; });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('нечего проверять — запроса нет', async () => {
    const fetchImpl = photosResponse([]);
    const r = await checkMlResults({ base: 'http://x', records: [uploaded('a', null), { ...uploaded('b'), status: 'queued' }], results: createMlResults(memoryKv()), fetchImpl, now: () => now });
    expect(r).toEqual({ checked: 0, skipped: 'nothing' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('один запрос /photos закрывает все ждущие фото; пустые детекции → empty', async () => {
    const fetchImpl = photosResponse([{ id: 'srv-a', detections: [] }, { id: 'srv-b', detections: [{ class: 'excavator' }] }]);
    const results = createMlResults(memoryKv());
    const r = await checkMlResults({ base: 'http://x', records: [uploaded('a'), uploaded('b'), uploaded('c')], results, fetchImpl, now: () => now });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(String(fetchImpl.mock.calls[0][0])).toBe('http://x/photos?limit=500&offset=0');
    expect(r).toEqual({ checked: 2, skipped: null });
    expect(results.get('a')).toMatchObject({ empty: true, count: 0 });
    expect(results.get('b')).toMatchObject({ empty: false, count: 1 });
    expect(results.get('c')).toBeUndefined(); // ещё нет в списке — спросим в следующий раз
  });

  it('уже проверенные фото не спрашиваются снова', async () => {
    const results = createMlResults(memoryKv());
    await results.set('a', { empty: false, count: 1, checked_at: 'x' });
    const fetchImpl = photosResponse([]);
    const r = await checkMlResults({ base: 'http://x', records: [uploaded('a')], results, fetchImpl, now: () => now });
    expect(r.skipped).toBe('nothing');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('не чаще одного запроса в минуту', async () => {
    const fetchImpl = photosResponse([]);
    const results = createMlResults(memoryKv());
    await checkMlResults({ base: 'http://x', records: [uploaded('a')], results, fetchImpl, now: () => now });
    now += ML_MIN_INTERVAL_MS - 1;
    const second = await checkMlResults({ base: 'http://x', records: [uploaded('a')], results, fetchImpl, now: () => now });
    expect(second.skipped).toBe('too_soon');
    now += 1;
    await checkMlResults({ base: 'http://x', records: [uploaded('a')], results, fetchImpl, now: () => now });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('ошибка сети или ответ не по схеме — результата нет, исключения нет', async () => {
    const results = createMlResults(memoryKv());
    const broken = vi.fn(async () => new Response('{"oops":1}', { status: 200 }));
    const r1 = await checkMlResults({ base: 'http://x', records: [uploaded('a')], results, fetchImpl: broken, now: () => now });
    expect(r1).toEqual({ checked: 0, skipped: 'error' });
    now += ML_MIN_INTERVAL_MS;
    const down = vi.fn(async () => { throw new Error('network'); });
    const r2 = await checkMlResults({ base: 'http://x', records: [uploaded('a')], results, fetchImpl: down, now: () => now });
    expect(r2).toEqual({ checked: 0, skipped: 'error' });
    expect(results.get('a')).toBeUndefined();
  });
});
