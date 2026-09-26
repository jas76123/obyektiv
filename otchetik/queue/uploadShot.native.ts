import { File } from 'expo-file-system';
import { loadSettings } from '../data/settings';
import type { ShotRecord } from './types';
import { postShot } from './uploadRequest';

/** Файл из папки приложения (queue/photoFile.native.ts) уходит как объект с `bytes()`:
 * expo/fetch в SDK 57 не понимает RN-вариант `{ uri }` (см. PhotoPart в uploadRequest.ts). */
export async function uploadShot(base: string, r: ShotRecord): Promise<{ server_id: string }> {
  const s = await loadSettings();
  const file = new File(r.file_path);
  const part = { bytes: async () => new Uint8Array(await file.arrayBuffer()), name: `${r.local_uuid}.jpg`, type: 'image/jpeg' };
  return postShot(base, r, part, s.brigadeId);
}
