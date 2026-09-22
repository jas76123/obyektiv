import { getStore } from './store.web';
import type { ShotRecord } from './types';
import { postShot } from './uploadRequest';

export async function uploadShot(base: string, r: ShotRecord): Promise<{ server_id: string }> {
  const blob = await getStore().getBlob(r.local_uuid);
  if (!blob) throw new Error('файл фото не найден');
  return postShot(base, r, blob);
}
