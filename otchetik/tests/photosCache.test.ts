import { describe, expect, it } from 'vitest';
import { type KeyValue } from '../lib/mlResults';
import { PHOTOS_KEY, createPhotosCache } from '../lib/photosCache';

function memoryKv(): KeyValue & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return { data, async getItem(k) { return data[k] ?? null; }, async setItem(k, v) { data[k] = v; } };
}

describe('photosCache', () => {
  it('пусто до загрузки и без записи', async () => {
    const c = createPhotosCache(memoryKv());
    expect(c.get()).toEqual({ at: null, list: [] });
    expect(await c.load()).toEqual({ at: null, list: [] });
  });
  it('set сохраняет список и время, оповещает подписчика, переживает перезапуск', async () => {
    const kv = memoryKv();
    const c = createPhotosCache(kv);
    let calls = 0;
    const off = c.on(() => { calls++; });
    await c.set([{ id: 'a', file: 'a_br-1.t.u.jpg', timestamp: '2026-09-26T10:00:00', count: 1 }], '2026-09-26T10:00:05.000Z');
    expect(calls).toBe(1);
    expect(c.get().list[0].count).toBe(1);
    off();
    const again = createPhotosCache(kv);
    expect((await again.load()).at).toBe('2026-09-26T10:00:05.000Z');
    expect(JSON.parse(kv.data[PHOTOS_KEY]).list.length).toBe(1);
  });
  it('битый JSON в хранилище → пусто, без исключения', async () => {
    const kv = memoryKv();
    kv.data[PHOTOS_KEY] = '{oops';
    expect(await createPhotosCache(kv).load()).toEqual({ at: null, list: [] });
  });
  it('кривой элемент списка отсеивается, нормальный остаётся', async () => {
    const kv = memoryKv();
    const good = { id: 'a', file: 'a_br-1.t.u.jpg', timestamp: '2026-09-26T10:00:00', count: 1 };
    kv.data[PHOTOS_KEY] = JSON.stringify({ at: '2026-09-26T10:00:05.000Z', list: [{ id: 'x' }, good] });
    expect(await createPhotosCache(kv).load()).toEqual({ at: '2026-09-26T10:00:05.000Z', list: [good] });
  });
});
