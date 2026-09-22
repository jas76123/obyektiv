import { afterEach, describe, expect, it, vi } from 'vitest';
import { newRecord } from '../queue/types';
import { postShot } from '../queue/uploadRequest';

function rec() {
  return newRecord({ local_uuid: 'a', task_id: 't1', work_name: 'Двери', zone: 'Зона 2', taken_at: '2026-09-22T10:00:00+03:00', geo: null, file_path: 'a' });
}

describe('postShot', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns server_id on success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ server_id: 'srv-a', status: 'uploaded' }), { status: 201 })));
    const r = await postShot('http://x', rec(), new Blob(['x'], { type: 'image/jpeg' }));
    expect(r).toEqual({ server_id: 'srv-a' });
  });

  it('throws HTTP <status> when response is not ok', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })));
    await expect(postShot('http://x', rec(), new Blob(['x']))).rejects.toThrow('HTTP 500');
  });

  it('throws a schema mismatch message when the body does not match', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ oops: true }), { status: 200 })));
    await expect(postShot('http://x', rec(), new Blob(['x']))).rejects.toThrow('ответ сервера не по схеме');
  });
});
