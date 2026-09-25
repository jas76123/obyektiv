import { UploadResponse } from '../contract/schemas';
import { POST_TIMEOUT_MS, timeoutSignal } from '../lib/network';
import { photoFileName } from '../lib/photoName';
import type { ShotRecord } from './types';

export type PhotoPart = Blob | { uri: string; name: string; type: string };

/**
 * Общая часть отправки фото: собирает multipart, шлёт POST, проверяет ответ по схеме.
 * Платформенные uploadShot.* добывают `photo` каждый по-своему и зовут это.
 * Имя файла несёт бригаду и наряд (lib/photoName.ts) — сервер хранит только его.
 */
export async function postShot(base: string, r: ShotRecord, photo: PhotoPart, brigadeId?: string | null): Promise<{ server_id: string }> {
  const fd = new FormData();
  const name = photoFileName(brigadeId, r.task_id, r.local_uuid);
  if (photo instanceof Blob) {
    fd.append('photo', photo, name);
  } else {
    fd.append('photo', { ...photo, name } as unknown as Blob);
  }
  fd.append('local_uuid', r.local_uuid);
  fd.append('task_id', r.task_id);
  fd.append('taken_at', r.taken_at);
  fd.append('geo', r.geo ?? '');
  if (r.retake_of) fd.append('retake_of', r.retake_of);
  const res = await fetch(`${base}/api/foreman/shots`, { method: 'POST', body: fd, signal: timeoutSignal(POST_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const parsed = UploadResponse.safeParse(await res.json());
  if (!parsed.success) throw new Error('ответ сервера не по схеме: ' + parsed.error.issues[0]?.message);
  return { server_id: parsed.data.server_id };
}
