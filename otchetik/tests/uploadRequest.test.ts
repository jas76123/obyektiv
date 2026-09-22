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

  it('sends correct multipart with all required fields', async () => {
    const mock = vi.fn(async (_url, init) => {
      expect(_url).toBe('http://x/api/foreman/shots');
      expect(init.method).toBe('POST');
      const fd = init.body as FormData;
      expect(fd.get('local_uuid')).toBe('a');
      expect(fd.get('task_id')).toBe('t1');
      expect(fd.get('taken_at')).toBe('2026-09-22T10:00:00+03:00');
      expect(fd.get('geo')).toBe('');
      const photo = fd.get('photo');
      expect(photo).toBeInstanceOf(Blob);
      if (photo instanceof File) {
        expect(photo.name).toBe('a.jpg');
      }
      expect(fd.has('retake_of')).toBe(false);
      return new Response(JSON.stringify({ server_id: 'srv-a', status: 'uploaded' }), { status: 201 });
    });
    vi.stubGlobal('fetch', mock);
    const r = await postShot('http://x', rec(), new Blob(['x'], { type: 'image/jpeg' }));
    expect(r).toEqual({ server_id: 'srv-a' });
  });

  it('includes retake_of field when present', async () => {
    const mock = vi.fn(async (_url, init) => {
      const fd = init.body as FormData;
      expect(fd.get('retake_of')).toBe('old-uuid');
      return new Response(JSON.stringify({ server_id: 'srv-b', status: 'uploaded' }), { status: 201 });
    });
    vi.stubGlobal('fetch', mock);
    const recWithRetake = { ...rec(), retake_of: 'old-uuid' };
    const r = await postShot('http://x', recWithRetake, new Blob(['x'], { type: 'image/jpeg' }));
    expect(r).toEqual({ server_id: 'srv-b' });
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
