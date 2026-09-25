import { loadSettings } from '../data/settings';
import type { ShotRecord } from './types';
import { postShot } from './uploadRequest';

export async function uploadShot(base: string, r: ShotRecord): Promise<{ server_id: string }> {
  const s = await loadSettings();
  return postShot(base, r, { uri: r.file_path, name: `${r.local_uuid}.jpg`, type: 'image/jpeg' }, s.brigadeId);
}
