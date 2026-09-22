import { JPEG_QUALITY, MAX_SIDE, compressToJpeg } from './compress';
import { getStore } from './store.web';
import type { ShotRecord } from './types';

export { JPEG_QUALITY, MAX_SIDE };

/** В браузере папки нет: сжатый blob кладём в IndexedDB под ключом uuid. */
export async function savePhoto(sourceUri: string, uuid: string, width?: number, height?: number): Promise<{ file_path: string }> {
  const { uri } = await compressToJpeg(sourceUri, width, height);
  const blob = await (await fetch(uri)).blob();
  await getStore().putBlob(uuid, blob);
  return { file_path: uuid };
}

const urlCache = new Map<string, string>();
export async function photoUri(r: ShotRecord): Promise<string> {
  const hit = urlCache.get(r.local_uuid);
  if (hit) return hit;
  const blob = await getStore().getBlob(r.local_uuid);
  if (!blob) return '';
  const url = URL.createObjectURL(blob);
  urlCache.set(r.local_uuid, url);
  return url;
}
