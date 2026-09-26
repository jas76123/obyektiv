import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMlResults, type KeyValue } from '../lib/mlResults';
import { createPhotosCache } from '../lib/photosCache';
import { ML_INTERVAL_SLACK_MS, ML_MAX_AGE_MS, ML_MIN_INTERVAL_MS, checkMlResults, resetMlCheckClock, waitingRecords } from '../queue/mlCheck';
import { newRecord, type ShotRecord } from '../queue/types';

function memoryKv(): KeyValue { const d: Record<string, string> = {}; return { async getItem(k) { return d[k] ?? null; }, async setItem(k, v) { d[k] = v; } }; }
function uploaded(uuid: string, server_id: string | null = `srv-${uuid}`): ShotRecord {
  return { ...newRecord({ local_uuid: uuid, task_id: 't', work_name: 'Двери', zone: 'Зона 2', taken_at: '2026-09-25T10:00:00+03:00', geo: null, file_path: uuid }), status: 'uploaded', server_id };
}
// Параметры типизированы явно (но не используются) — иначе vi.fn выводит
// пустой кортеж аргументов и `mock.calls[0][0]` не проходит проверку типов.
function photosResponse(items: { id: string; detections: unknown[]; file?: string; timestamp?: string }[]) {
  const full = items.map((i, n) => ({ file: `${i.id}_x.jpg`, timestamp: `2026-09-25T10:00:0${n}`, ...i }));
  return vi.fn(async (_url?: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ total: full.length, photos: full }), { status: 200 }));
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

  it('не чаще одного запроса в минуту (с учётом допуска ML_INTERVAL_SLACK_MS)', async () => {
    const fetchImpl = photosResponse([]);
    const results = createMlResults(memoryKv());
    await checkMlResults({ base: 'http://x', records: [uploaded('a')], results, fetchImpl, now: () => now });
    now += ML_MIN_INTERVAL_MS - ML_INTERVAL_SLACK_MS - 1;
    const second = await checkMlResults({ base: 'http://x', records: [uploaded('a')], results, fetchImpl, now: () => now });
    expect(second.skipped).toBe('too_soon');
    now += ML_INTERVAL_SLACK_MS + 1;
    await checkMlResults({ base: 'http://x', records: [uploaded('a')], results, fetchImpl, now: () => now });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('тик пришёл на несколько секунд раньше 60 с из-за await — допуск пропускает запрос', async () => {
    const fetchImpl = photosResponse([]);
    const results = createMlResults(memoryKv());
    await checkMlResults({ base: 'http://x', records: [uploaded('a')], results, fetchImpl, now: () => now });
    now += ML_MIN_INTERVAL_MS - 5;
    const second = await checkMlResults({ base: 'http://x', records: [uploaded('a')], results, fetchImpl, now: () => now });
    expect(second.skipped).not.toBe('too_soon');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('раньше границы допуска — всё ещё too_soon', async () => {
    const fetchImpl = photosResponse([]);
    const results = createMlResults(memoryKv());
    await checkMlResults({ base: 'http://x', records: [uploaded('a')], results, fetchImpl, now: () => now });
    now += ML_MIN_INTERVAL_MS - ML_INTERVAL_SLACK_MS - 5;
    const second = await checkMlResults({ base: 'http://x', records: [uploaded('a')], results, fetchImpl, now: () => now });
    expect(second.skipped).toBe('too_soon');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
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

  it('пока первый запрос висит — второй вызов сразу skipped: in_flight, fetch вызван один раз', async () => {
    const results = createMlResults(memoryKv());
    let resolveFetch!: (r: Response) => void;
    const pending = new Promise<Response>((resolve) => { resolveFetch = resolve; });
    const fetchImpl = vi.fn(() => pending);

    const first = checkMlResults({ base: 'http://x', records: [uploaded('a')], results, fetchImpl, now: () => now });
    // Дать первому вызову дойти до fetch (несколько микрозадач на results.load()).
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const second = await checkMlResults({ base: 'http://x', records: [uploaded('a')], results, fetchImpl, now: () => now });
    expect(second).toEqual({ checked: 0, skipped: 'in_flight' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    resolveFetch(new Response(JSON.stringify({ total: 0, photos: [] }), { status: 200 }));
    await first;

    now += ML_MIN_INTERVAL_MS;
    await checkMlResults({ base: 'http://x', records: [uploaded('a')], results, fetchImpl, now: () => now });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('падение записи кэша фото (photos.set) не роняет результаты своих фото', async () => {
    const results = createMlResults(memoryKv());
    const fetchImpl = photosResponse([{ id: 'srv-a', detections: [] }]);
    const photos = { load: vi.fn(), get: vi.fn(), set: vi.fn(async () => { throw new Error('quota'); }), on: vi.fn() };
    const r = await checkMlResults({ base: 'http://x', records: [uploaded('a')], results, photos, fetchImpl, now: () => now });
    expect(r).toEqual({ checked: 1, skipped: null });
    expect(results.get('a')).toMatchObject({ empty: true, count: 0 });
    now += ML_MIN_INTERVAL_MS;
    const second = await checkMlResults({ base: 'http://x', records: [uploaded('a')], results, photos, fetchImpl, now: () => now });
    expect(second.skipped).not.toBe('in_flight');
  });

  it('список целиком складывается в кэш фото, даже если ждать нечего, но кэш просят (wantPhotos)', async () => {
    const photos = createPhotosCache(memoryKv());
    const fetchImpl = photosResponse([{ id: 'srv-z', detections: [{}] , file: 'srv-z_br-2.t-doors-0922.z.jpg' }]);
    const r = await checkMlResults({ base: 'http://x', records: [], results: createMlResults(memoryKv()), photos, wantPhotos: true, fetchImpl, now: () => now });
    expect(r).toEqual({ checked: 0, skipped: null });
    expect(photos.get().list).toEqual([{ id: 'srv-z', file: 'srv-z_br-2.t-doors-0922.z.jpg', timestamp: '2026-09-25T10:00:00', count: 1 }]);
    expect(photos.get().at).toBe(new Date(now).toISOString());
  });

  it('без wantPhotos и без ждущих фото запроса нет', async () => {
    const fetchImpl = photosResponse([]);
    const r = await checkMlResults({ base: 'http://x', records: [], results: createMlResults(memoryKv()), photos: createPhotosCache(memoryKv()), wantPhotos: false, fetchImpl, now: () => now });
    expect(r.skipped).toBe('nothing');
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('waitingRecords', () => {
  const now = Date.parse('2026-09-25T12:00:00+03:00');

  it('пропускает фото старше ML_MAX_AGE_MS и без server_id, берёт свежее без результата', () => {
    const results = createMlResults(memoryKv());
    const fresh = { ...uploaded('fresh'), taken_at: new Date(now - 1000).toISOString() };
    const old = { ...uploaded('old'), taken_at: new Date(now - ML_MAX_AGE_MS - 1000).toISOString() };
    const noServer = { ...uploaded('no-server', null), taken_at: new Date(now - 1000).toISOString() };
    const r = waitingRecords([fresh, old, noServer], results, now);
    expect(r.map((x) => x.local_uuid)).toEqual(['fresh']);
  });
});
