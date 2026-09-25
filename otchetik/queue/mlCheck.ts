import { PhotosResponse, type Photos } from '../contract/schemas';
import { fetchJson } from '../data/source';
import type { MlResultsStore } from '../lib/mlResults';
import { timeoutSignal } from '../lib/network';
import type { ShotRecord } from './types';

/**
 * Узнаём у сервера Георгия, нашла ли нейросеть что-то на фото прораба (спека 25.09 §3).
 * `GET /photos` отдаёт все файлы с детекциями; id записи = server_id нашего фото.
 * Маршрут гоняет детектор по всем файлам на каждый запрос, поэтому: один запрос на
 * прогон закрывает все ждущие фото, не чаще раза в минуту, с длинным таймаутом.
 */
export const ML_MIN_INTERVAL_MS = 60_000;
export const ML_TIMEOUT_MS = 90_000;
export const ML_LIMIT = 500;

let lastRequestAt = -Infinity;
/** Только для тестов. */
export function resetMlCheckClock(): void { lastRequestAt = -Infinity; }

export type MlCheckResult = { checked: number; skipped: 'nothing' | 'too_soon' | 'error' | null };

export async function checkMlResults(deps: {
  base: string;
  records: ShotRecord[];
  results: MlResultsStore;
  fetchImpl?: typeof fetch;
  now?: () => number;
}): Promise<MlCheckResult> {
  const now = deps.now ?? Date.now;
  await deps.results.load();
  const waiting = deps.records.filter((r) => r.status === 'uploaded' && !!r.server_id && !deps.results.get(r.local_uuid));
  if (waiting.length === 0) return { checked: 0, skipped: 'nothing' };
  if (now() - lastRequestAt < ML_MIN_INTERVAL_MS) return { checked: 0, skipped: 'too_soon' };
  lastRequestAt = now();

  let photos: Photos['photos'];
  try {
    photos = (await fetchJson(`${deps.base}/photos?limit=${ML_LIMIT}&offset=0`, PhotosResponse, { signal: timeoutSignal(ML_TIMEOUT_MS) }, deps.fetchImpl ?? fetch)).photos;
  } catch {
    return { checked: 0, skipped: 'error' };
  }

  const byId = new Map(photos.map((p) => [p.id, p]));
  let checked = 0;
  for (const r of waiting) {
    const item = byId.get(r.server_id!);
    if (!item) continue; // ещё не в списке — спросим при следующем прогоне
    await deps.results.set(r.local_uuid, { empty: item.detections.length === 0, count: item.detections.length, checked_at: new Date(now()).toISOString() });
    checked++;
  }
  return { checked, skipped: null };
}
