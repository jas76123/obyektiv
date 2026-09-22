import { UploadResponse } from '../contract/schemas';
import type { ShotRecord } from './types';

export type PhotoPart = Blob | { uri: string; name: string; type: string };

/**
 * Общая часть отправки фото: собирает multipart, шлёт POST, проверяет ответ по схеме.
 * Платформенные uploadShot.* добывают `photo` каждый по-своему и зовут это.
 */
export async function postShot(base: string, r: ShotRecord, photo: PhotoPart): Promise<{ server_id: string }> {
  const fd = new FormData();
  if (photo instanceof Blob) {
    fd.append('photo', photo, `${r.local_uuid}.jpg`);
  } else {
    fd.append('photo', photo as unknown as Blob);
  }
  fd.append('local_uuid', r.local_uuid);
  fd.append('task_id', r.task_id);
  fd.append('taken_at', r.taken_at);
  fd.append('geo', r.geo ?? '');
  if (r.retake_of) fd.append('retake_of', r.retake_of);
  const res = await fetch(`${base}/api/foreman/shots`, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const parsed = UploadResponse.safeParse(await res.json());
  if (!parsed.success) throw new Error('ответ сервера не по схеме: ' + parsed.error.issues[0]?.message);
  return { server_id: parsed.data.server_id };
}
