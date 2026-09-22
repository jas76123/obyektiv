import type { ShotRecord } from './types';
export async function uploadShot(_base: string, r: ShotRecord): Promise<{ server_id: string }> {
  return { server_id: 'stub-' + r.local_uuid };
}
